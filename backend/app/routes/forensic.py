from fastapi import APIRouter, Depends, HTTPException, Query, Form, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.database import get_db
from app.models import (
    Case, Evidence, Report, ReportStatus, ChainOfCustody,
    User, UserRole, AuditLog, AuditAction, Notification, Task
)
from app.auth import get_current_user, require_roles, log_action, get_client_ip
from app.services.pdf_export import generate_pdf
from typing import Optional, List
from datetime import datetime, timezone, timedelta
import hashlib, json, re as _re

router = APIRouter(tags=["forensic"])


# ── Digital Signature / Approval Certificate ─────────────────────────────────

def _cert_hash(report_id: str, approved_at: str, reviewer_id: str) -> str:
    raw = f"{report_id}:{approved_at}:{reviewer_id}:forensix-cert"
    return hashlib.sha256(raw.encode()).hexdigest()


@router.get("/cases/{case_id}/reports/{report_id}/certificate")
async def get_approval_certificate(
    case_id: str,
    report_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    report = db.query(Report).filter(Report.id == report_id, Report.case_id == case_id).first()
    if not report:
        raise HTTPException(404, "Report not found")
    if report.status.value not in ("approved", "exported"):
        raise HTTPException(400, "Report is not approved")

    reviewer = db.query(User).filter(User.id == report.reviewed_by_id).first() if report.reviewed_by_id else None
    approved_at_str = report.approved_at.isoformat() if report.approved_at else ""
    cert_hash = _cert_hash(report.id, approved_at_str, report.reviewed_by_id or "")

    return {
        "report_id": report.id,
        "report_number": report.report_number,
        "case_id": case_id,
        "status": report.status.value,
        "approved_at": approved_at_str,
        "signer": reviewer.full_name if reviewer else None,
        "signer_role": reviewer.role.value if reviewer else None,
        "signer_badge": reviewer.badge_number if reviewer else None,
        "certificate_hash": cert_hash,
        "algorithm": "SHA-256",
        "verified": True,
    }


# ── Cross-Case Intelligence Search ───────────────────────────────────────────

@router.get("/search/cross-case")
async def cross_case_search(
    q: str = Query(..., min_length=3),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Search for a hash, phone, email, plate, name, or device ID across all cases."""
    term = f"%{q}%"
    hits = []

    # Search evidence filenames, hashes, OCR text
    evidence_matches = db.query(Evidence).filter(
        or_(
            Evidence.sha256_hash.ilike(term),
            Evidence.original_filename.ilike(term),
            Evidence.extracted_text.ilike(term),
        )
    ).all()

    seen_cases = {}
    for ev in evidence_matches:
        case = db.query(Case).filter(Case.id == ev.case_id).first()
        if not case:
            continue
        key = (case.id, ev.id)
        if key not in seen_cases:
            seen_cases[key] = True
            hits.append({
                "case_id": case.id,
                "case_number": case.case_number,
                "case_title": case.title,
                "match_type": "evidence",
                "exhibit_ref": ev.exhibit_ref,
                "filename": ev.original_filename,
                "matched_field": "sha256_hash" if q.lower() in ev.sha256_hash.lower() else "ocr_text",
                "snippet": _snippet(ev.extracted_text, q),
            })

    # Search report data
    reports = db.query(Report).all()
    for r in reports:
        try:
            data = json.loads(r.report_data)
            text = json.dumps(data).lower()
        except Exception:
            continue
        if q.lower() in text:
            case = db.query(Case).filter(Case.id == r.case_id).first()
            hits.append({
                "case_id": r.case_id,
                "case_number": case.case_number if case else "",
                "case_title": case.title if case else "",
                "match_type": "report",
                "report_number": r.report_number,
                "matched_field": "report_content",
                "snippet": None,
            })

    return {"query": q, "total": len(hits), "hits": hits}


def _snippet(text: Optional[str], q: str, window: int = 80) -> Optional[str]:
    if not text:
        return None
    idx = text.lower().find(q.lower())
    if idx == -1:
        return None
    start = max(0, idx - window // 2)
    end = min(len(text), idx + len(q) + window // 2)
    return ("…" if start > 0 else "") + text[start:end] + ("…" if end < len(text) else "")


# ── Intake Checklist ──────────────────────────────────────────────────────────

@router.get("/cases/{case_id}/intake-checklist")
async def intake_checklist(
    case_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(404, "Case not found")

    evidence_list = db.query(Evidence).filter(Evidence.case_id == case_id).all()
    reports = db.query(Report).filter(Report.case_id == case_id).all()

    has_evidence = len(evidence_list) > 0
    all_hashes_verified = has_evidence and all(
        ev.integrity_status == "VERIFIED" for ev in evidence_list
    )
    any_ocr_reviewed = any(ev.ocr_corrected for ev in evidence_list)
    has_custody = has_evidence and all(
        db.query(ChainOfCustody).filter(ChainOfCustody.evidence_id == ev.id).count() > 0
        for ev in evidence_list
    )
    has_metadata = bool(case.fir_number or case.investigating_agency)
    has_approved_report = any(r.status.value in ("approved", "exported") for r in reports)

    items = [
        {"key": "evidence_uploaded", "label": "Evidence uploaded", "done": has_evidence},
        {"key": "hash_verified", "label": "All hashes verified", "done": all_hashes_verified},
        {"key": "ocr_reviewed", "label": "OCR reviewed / corrected", "done": any_ocr_reviewed},
        {"key": "custody_complete", "label": "Chain of custody recorded", "done": has_custody},
        {"key": "metadata_present", "label": "Required metadata present (FIR / agency)", "done": has_metadata},
        {"key": "report_approved", "label": "Report approved", "done": has_approved_report},
    ]
    ready = all(i["done"] for i in items)
    return {"case_id": case_id, "ready_for_export": ready, "items": items}


# ── Department Metrics ────────────────────────────────────────────────────────

def _check_deadline_notifications(db: Session):
    """Push deadline warnings for cases due within 48 hours. Called from metrics."""
    now = datetime.now(timezone.utc)
    soon = now + timedelta(hours=48)
    at_risk = db.query(Case).filter(
        Case.court_deadline != None,
        Case.court_deadline <= soon,
        Case.court_deadline >= now,
        Case.status.notin_(["closed", "archived"]),
    ).all()
    admins = db.query(User).filter(
        User.role.in_([UserRole.ADMIN, UserRole.FORENSIC_OFFICER]), User.is_active == True
    ).all()
    for case in at_risk:
        hours_left = int((case.court_deadline - now).total_seconds() / 3600)
        for u in admins:
            push_notification(
                db,
                u.id,
                f"Court deadline approaching: case {case.case_number} is due in ~{hours_left}h.",
                level="warning",
                case_id=case.id,
                dedupe_key=f"deadline:{case.id}:{u.id}",
            )


@router.get("/metrics")
async def department_metrics(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
):
    cases = db.query(Case).all()
    reports = db.query(Report).all()
    evidence_list = db.query(Evidence).all()

    # Cases by status
    by_status = {}
    for c in cases:
        by_status[c.status.value] = by_status.get(c.status.value, 0) + 1

    # Cases by type
    by_type = {}
    for c in cases:
        t = c.case_type.value if c.case_type else "other"
        by_type[t] = by_type.get(t, 0) + 1

    # Reports pending review
    pending_review = sum(1 for r in reports if r.status == ReportStatus.UNDER_REVIEW)
    needs_correction = sum(1 for r in reports if r.status == ReportStatus.NEEDS_CORRECTION)

    # Integrity failures
    integrity_failures = sum(1 for ev in evidence_list if ev.integrity_status == "TAMPERED")
    file_missing = sum(1 for ev in evidence_list if ev.integrity_status == "FILE_MISSING")

    # Avg turnaround: approved_at - generated_at
    turnarounds = []
    for r in reports:
        if r.approved_at and r.generated_at:
            delta = (r.approved_at - r.generated_at).total_seconds() / 3600
            turnarounds.append(delta)
    avg_turnaround_hours = round(sum(turnarounds) / len(turnarounds), 1) if turnarounds else None

    # Overdue cases (court_deadline passed, not closed)
    now = datetime.now(timezone.utc)
    overdue = sum(
        1 for c in cases
        if c.court_deadline and c.court_deadline < now and c.status.value not in ("closed", "archived")
    )

    # Officer workload
    workload = {}
    for c in cases:
        if c.assigned_officer_id:
            workload[c.assigned_officer_id] = workload.get(c.assigned_officer_id, 0) + 1
    officer_workload = []
    for uid, count in workload.items():
        u = db.query(User).filter(User.id == uid).first()
        officer_workload.append({"name": u.full_name if u else uid, "cases": count})
    officer_workload.sort(key=lambda x: x["cases"], reverse=True)

    _check_deadline_notifications(db)

    return {
        "total_cases": len(cases),
        "cases_by_status": by_status,
        "cases_by_type": by_type,
        "total_reports": len(reports),
        "reports_pending_review": pending_review,
        "reports_needs_correction": needs_correction,
        "total_evidence": len(evidence_list),
        "integrity_failures": integrity_failures,
        "file_missing": file_missing,
        "avg_turnaround_hours": avg_turnaround_hours,
        "overdue_cases": overdue,
        "officer_workload": officer_workload,
    }


# ── Tasks ─────────────────────────────────────────────────────────────────────

@router.get("/cases/{case_id}/tasks")
async def list_tasks(
    case_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    tasks = db.query(Task).filter(Task.case_id == case_id).order_by(Task.created_at).all()
    return [
        {
            "id": t.id,
            "case_id": t.case_id,
            "title": t.title,
            "done": t.done,
            "assigned_to_id": t.assigned_to_id,
            "created_by_id": t.created_by_id,
            "created_by_name": t.created_by.full_name if t.created_by else None,
            "created_at": t.created_at.isoformat() if t.created_at else None,
        }
        for t in tasks
    ]


@router.post("/cases/{case_id}/tasks")
async def create_task(
    case_id: str,
    title: str = Form(...),
    assigned_to_id: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    task = Task(
        case_id=case_id,
        title=title,
        assigned_to_id=assigned_to_id or None,
        created_by_id=current_user.id,
    )
    db.add(task)
    db.commit()
    db.refresh(task)

    if assigned_to_id and assigned_to_id != current_user.id:
        case = db.query(Case).filter(Case.id == case_id).first()
        push_notification(
            db,
            assigned_to_id,
            f"You have been assigned a task: '{title}' on case {case.case_number if case else case_id}.",
            level="info",
            case_id=case_id,
            dedupe_key=f"task:{task.id}:{assigned_to_id}",
        )

    return {
        "id": task.id,
        "case_id": task.case_id,
        "title": task.title,
        "done": task.done,
        "assigned_to_id": task.assigned_to_id,
        "created_by_id": task.created_by_id,
        "created_by_name": current_user.full_name,
        "created_at": task.created_at.isoformat() if task.created_at else None,
    }


@router.patch("/cases/{case_id}/tasks/{task_id}")
async def toggle_task(
    case_id: str,
    task_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    task = db.query(Task).filter(Task.id == task_id, Task.case_id == case_id).first()
    if not task:
        raise HTTPException(404, "Task not found")
    task.done = not task.done
    db.commit()
    db.refresh(task)
    return {
        "id": task.id,
        "case_id": task.case_id,
        "title": task.title,
        "done": task.done,
        "assigned_to_id": task.assigned_to_id,
        "created_by_id": task.created_by_id,
        "created_by_name": task.created_by.full_name if task.created_by else None,
        "created_at": task.created_at.isoformat() if task.created_at else None,
    }


# ── Notifications ─────────────────────────────────────────────────────────────

def push_notification(
    db: Session,
    user_id: str,
    message: str,
    level: str = "info",
    case_id: Optional[str] = None,
    report_id: Optional[str] = None,
    evidence_id: Optional[str] = None,
    dedupe_key: Optional[str] = None,
):
    if dedupe_key:
        existing = db.query(Notification).filter(
            Notification.user_id == user_id,
            Notification.dedupe_key == dedupe_key,
        ).first()
        if existing:
            return existing

    notification = Notification(
        user_id=user_id,
        message=message,
        level=level,
        read=False,
        dedupe_key=dedupe_key,
        case_id=case_id,
        report_id=report_id,
        evidence_id=evidence_id,
    )
    db.add(notification)
    db.commit()
    db.refresh(notification)
    return notification


@router.get("/notifications")
async def get_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _check_deadline_notifications(db)
    notifications = db.query(Notification).filter(
        Notification.user_id == current_user.id
    ).order_by(Notification.created_at.desc()).all()
    return [
        {
            "id": n.id,
            "message": n.message,
            "level": n.level,
            "read": n.read,
            "created_at": n.created_at.isoformat() if n.created_at else None,
            "case_id": n.case_id,
            "report_id": n.report_id,
            "evidence_id": n.evidence_id,
        }
        for n in notifications
    ]


@router.patch("/notifications/{notif_id}/read")
async def mark_read(
    notif_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    notification = db.query(Notification).filter(
        Notification.id == notif_id,
        Notification.user_id == current_user.id,
    ).first()
    if not notification:
        raise HTTPException(404, "Notification not found")
    notification.read = True
    db.commit()
    db.refresh(notification)
    return {
        "id": notification.id,
        "message": notification.message,
        "level": notification.level,
        "read": notification.read,
        "created_at": notification.created_at.isoformat() if notification.created_at else None,
        "case_id": notification.case_id,
        "report_id": notification.report_id,
        "evidence_id": notification.evidence_id,
    }


# ── Redaction ─────────────────────────────────────────────────────────────────

_REDACT_PATTERNS = {
    "phone": _re.compile(r'\b(\+?\d[\d\s\-().]{7,}\d)\b'),
    "email": _re.compile(r'\b[\w.+-]+@[\w-]+\.[a-z]{2,}\b', _re.I),
    "postcode": _re.compile(r'\b[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}\b', _re.I),
}


@router.post("/cases/{case_id}/reports/{report_id}/redact")
async def redact_report(
    case_id: str,
    report_id: str,
    redact_phones: bool = Form(True),
    redact_emails: bool = Form(True),
    redact_postcodes: bool = Form(False),
    custom_terms: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.FORENSIC_OFFICER, UserRole.REVIEWER)),
):
    report = db.query(Report).filter(Report.id == report_id, Report.case_id == case_id).first()
    if not report:
        raise HTTPException(404, "Report not found")

    data = json.loads(report.report_data)
    text = json.dumps(data)

    if redact_phones:
        text = _REDACT_PATTERNS["phone"].sub("[REDACTED-PHONE]", text)
    if redact_emails:
        text = _REDACT_PATTERNS["email"].sub("[REDACTED-EMAIL]", text)
    if redact_postcodes:
        text = _REDACT_PATTERNS["postcode"].sub("[REDACTED-POSTCODE]", text)
    if custom_terms:
        for term in [t.strip() for t in custom_terms.split(",") if t.strip()]:
            text = text.replace(term, "[REDACTED]")

    redacted_data = json.loads(text)
    redacted_data["_redacted"] = True
    redacted_data["_redacted_at"] = datetime.now(timezone.utc).isoformat()
    redacted_data["_redacted_by"] = current_user.full_name

    return {"redacted_report_data": redacted_data}


# ── Evidence Label / QR ───────────────────────────────────────────────────────

@router.get("/cases/{case_id}/evidence/{evidence_id}/label")
async def evidence_label(
    case_id: str,
    evidence_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ev = db.query(Evidence).filter(Evidence.id == evidence_id, Evidence.case_id == case_id).first()
    if not ev:
        raise HTTPException(404, "Evidence not found")
    case = db.query(Case).filter(Case.id == case_id).first()

    # QR content: a URL or structured string
    qr_content = f"forensix://case/{case_id}/evidence/{evidence_id}"

    return {
        "exhibit_ref": ev.exhibit_ref,
        "case_number": case.case_number if case else case_id,
        "case_title": case.title if case else "",
        "filename": ev.original_filename,
        "sha256": ev.sha256_hash,
        "uploaded_at": ev.uploaded_at.isoformat(),
        "file_type": ev.file_type,
        "file_size_kb": round(ev.file_size / 1024, 1),
        "integrity_status": ev.integrity_status or "PENDING",
        "qr_content": qr_content,
    }


# ── Court / Disclosure Package Types ─────────────────────────────────────────

PACKAGE_TYPES = {
    "internal": "Internal Lab Bundle",
    "court": "Court Submission Bundle",
    "investigator": "Investigator Summary",
    "defense": "Defense Disclosure Copy (Redacted)",
}


@router.get("/cases/{case_id}/package-types")
async def list_package_types(
    case_id: str,
    current_user: User = Depends(get_current_user),
):
    return [{"key": k, "label": v} for k, v in PACKAGE_TYPES.items()]


@router.post("/cases/{case_id}/reports/{report_id}/export/{package_type}")
async def export_package(
    case_id: str,
    report_id: str,
    package_type: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if package_type not in PACKAGE_TYPES:
        raise HTTPException(400, f"Unknown package type. Choose from: {list(PACKAGE_TYPES)}")
    report = db.query(Report).filter(Report.id == report_id, Report.case_id == case_id).first()
    if not report:
        raise HTTPException(404, "Report not found")
    if report.status.value not in ("approved", "exported"):
        raise HTTPException(400, "Only approved reports can be packaged")

    case = db.query(Case).filter(Case.id == case_id).first()
    reviewer = db.query(User).filter(User.id == report.reviewed_by_id).first() if report.reviewed_by_id else None
    report_data = json.loads(report.report_data)

    # For defense package, auto-redact phones/emails
    if package_type == "defense":
        text = json.dumps(report_data)
        text = _REDACT_PATTERNS["phone"].sub("[REDACTED-PHONE]", text)
        text = _REDACT_PATTERNS["email"].sub("[REDACTED-EMAIL]", text)
        report_data = json.loads(text)
        report_data["_package_type"] = PACKAGE_TYPES[package_type]

    pdf_bytes = generate_pdf(report, report_data, case, reviewer)
    filename = f"{report.report_number.replace('/', '-')}-{package_type}.pdf"
    return StreamingResponse(
        iter([pdf_bytes]),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
