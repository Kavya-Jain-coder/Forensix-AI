from fastapi import APIRouter, Depends, HTTPException, Form, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Report, ReportStatus, Evidence, Case, UserRole, AuditAction, User, ChainOfCustody
from app.auth import get_current_user, require_roles, log_action, get_client_ip
from app.services.generator import ReportGenerator
from app.services.rag_service import RAGService
from app.services.pdf_export import generate_pdf
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
import json
import uuid

router = APIRouter(prefix="/cases/{case_id}/reports", tags=["reports"])
generator = ReportGenerator()
rag_service = RAGService()


def gen_report_number():
    return f"FSL/{datetime.utcnow().strftime('%Y')}/CR/{str(uuid.uuid4())[:5].upper()}"


class ReportOut(BaseModel):
    id: str
    case_id: str
    report_number: str
    status: ReportStatus
    report_data: dict
    confidence_score: Optional[float]
    generated_by_id: str
    reviewed_by_id: Optional[str]
    reviewer_comments: Optional[str]
    generated_at: datetime
    reviewed_at: Optional[datetime]
    approved_at: Optional[datetime]
    officer_in_charge: Optional[str]
    submitted_by: Optional[str]
    date_of_examination: Optional[str]

    class Config:
        from_attributes = True

    @classmethod
    def from_orm_custom(cls, r: Report):
        data = cls.model_validate(r)
        data.report_data = json.loads(r.report_data)
        return data


@router.post("", response_model=ReportOut)
async def generate_report(
    case_id: str,
    request: Request,
    officer_in_charge: Optional[str] = Form(None),
    submitted_by: Optional[str] = Form(None),
    date_of_examination: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.FORENSIC_OFFICER)),
):
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    evidence_list = db.query(Evidence).filter(Evidence.case_id == case_id).all()
    if not evidence_list:
        raise HTTPException(status_code=400, detail="No evidence uploaded for this case")

    all_texts = []
    filenames = []
    image_only = []

    for ev in evidence_list:
        # Log chain of custody
        db.add(ChainOfCustody(
            evidence_id=ev.id,
            action="ACCESSED_FOR_REPORT",
            performed_by_id=current_user.id,
            notes="Evidence accessed for report generation",
            ip_address=get_client_ip(request),
        ))
        filenames.append(ev.original_filename)
        if ev.extracted_text and ev.extracted_text.strip():
            all_texts.append(f"=== EXHIBIT: {ev.exhibit_ref} — {ev.original_filename} ===\n{ev.extracted_text}")
        else:
            image_only.append(ev)

    case_meta = {
        "officer_in_charge": officer_in_charge,
        "submitted_by": submitted_by,
        "date_of_examination": date_of_examination,
    }

    # Build context — fall back to image metadata if no OCR text
    if not all_texts:
        exhibits_desc = "\n".join(
            f"  Exhibit {ev.exhibit_ref}: {ev.original_filename} — {ev.file_type}, "
            f"{ev.file_size // 1024} KB, SHA-256: {ev.sha256_hash}"
            for ev in image_only
        )
        combined_text = (
            f"Visual forensic evidence submitted for examination.\n"
            f"Case: {case.title}\n"
            f"Case Number: {case.case_number}\n\n"
            f"Submitted Exhibits (image-based crime scene photographs):\n{exhibits_desc}\n\n"
            f"Examination Note:\n"
            f"These exhibits are photographic forensic evidence captured at the crime scene. "
            f"OCR text extraction was not applicable as these are images. "
            f"Each image should be treated as a physical exhibit requiring visual forensic "
            f"examination — analysis of scene layout, physical evidence visible, damage patterns, "
            f"trace evidence, body position, environmental conditions, and any other forensically "
            f"relevant features observable in the photographs."
        )
        confidence = 0.55
        docs = []
    else:
        # Mix of text + images
        if image_only:
            all_texts.append("=== ADDITIONAL IMAGE EXHIBITS (crime scene photographs) ===")
            for ev in image_only:
                all_texts.append(f"Exhibit {ev.exhibit_ref}: {ev.original_filename} ({ev.file_type})")
        combined_text = "\n\n".join(all_texts)
        vector_store = rag_service.create_vector_store(combined_text)
        _, docs, confidence = rag_service.retrieve_context(
            vector_store,
            "Summarize all forensic evidence, findings, subjects, exhibits, and key observations."
        )

    report_data = await generator.generate(combined_text, filenames, case_meta)

    # Attach SHA-256 hashes
    report_data["evidence_hashes"] = [
        {
            "exhibit_ref": ev.exhibit_ref,
            "filename": ev.original_filename,
            "sha256": ev.sha256_hash,
            "size_bytes": ev.file_size,
        }
        for ev in evidence_list
    ]

    report = Report(
        case_id=case_id,
        report_number=gen_report_number(),
        status=ReportStatus.AI_DRAFT,
        report_data=json.dumps(report_data),
        confidence_score=round(float(confidence) * 100, 2),
        generated_by_id=current_user.id,
        officer_in_charge=officer_in_charge,
        submitted_by=submitted_by,
        date_of_examination=date_of_examination,
    )
    db.add(report)
    db.commit()
    db.refresh(report)

    log_action(db, AuditAction.REPORT_GENERATED, user_id=current_user.id,
               case_id=case_id, report_id=report.id,
               details={"report_number": report.report_number}, ip=get_client_ip(request))

    return ReportOut.from_orm_custom(report)


@router.get("", response_model=List[ReportOut])
async def list_reports(
    case_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    reports = db.query(Report).filter(Report.case_id == case_id).order_by(Report.generated_at.desc()).all()
    return [ReportOut.from_orm_custom(r) for r in reports]


@router.get("/{report_id}", response_model=ReportOut)
async def get_report(
    case_id: str,
    report_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    report = db.query(Report).filter(Report.id == report_id, Report.case_id == case_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return ReportOut.from_orm_custom(report)


@router.patch("/{report_id}/submit")
async def submit_for_review(
    case_id: str,
    report_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.FORENSIC_OFFICER)),
):
    report = db.query(Report).filter(Report.id == report_id, Report.case_id == case_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    if report.status not in (ReportStatus.AI_DRAFT, ReportStatus.NEEDS_CORRECTION):
        raise HTTPException(status_code=400, detail="Report cannot be submitted in its current status")
    report.status = ReportStatus.UNDER_REVIEW
    db.commit()
    log_action(db, AuditAction.REPORT_SUBMITTED, user_id=current_user.id,
               case_id=case_id, report_id=report_id, ip=get_client_ip(request))
    return {"message": "Report submitted for review", "status": report.status}


@router.patch("/{report_id}/review")
async def review_report(
    case_id: str,
    report_id: str,
    request: Request,
    action: str = Form(...),
    comments: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.REVIEWER)),
):
    report = db.query(Report).filter(Report.id == report_id, Report.case_id == case_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    if report.status != ReportStatus.UNDER_REVIEW:
        raise HTTPException(status_code=400, detail="Report is not under review")

    now = datetime.now(timezone.utc)
    report.reviewed_by_id = current_user.id
    report.reviewer_comments = comments
    report.reviewed_at = now

    if action == "approve":
        report.status = ReportStatus.APPROVED
        report.approved_at = now
        audit_action = AuditAction.REPORT_APPROVED
    elif action == "reject":
        report.status = ReportStatus.NEEDS_CORRECTION
        audit_action = AuditAction.REPORT_REJECTED
    else:
        raise HTTPException(status_code=400, detail="Action must be 'approve' or 'reject'")

    db.commit()
    log_action(db, audit_action, user_id=current_user.id,
               case_id=case_id, report_id=report_id,
               details={"comments": comments}, ip=get_client_ip(request))
    return {"message": f"Report {action}d", "status": report.status}


@router.get("/{report_id}/export/pdf")
async def export_pdf(
    case_id: str,
    report_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    report = db.query(Report).filter(Report.id == report_id, Report.case_id == case_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    if report.status != ReportStatus.APPROVED:
        raise HTTPException(status_code=403, detail="Only approved reports can be exported")

    case = db.query(Case).filter(Case.id == case_id).first()
    reviewer = db.query(User).filter(User.id == report.reviewed_by_id).first() if report.reviewed_by_id else None
    report_data = json.loads(report.report_data)

    pdf_bytes = generate_pdf(report, report_data, case, reviewer)

    report.status = ReportStatus.EXPORTED
    report.exported_at = datetime.now(timezone.utc)
    db.commit()

    log_action(db, AuditAction.REPORT_EXPORTED, user_id=current_user.id,
               case_id=case_id, report_id=report_id, ip=get_client_ip(request))

    filename = f"{report.report_number.replace('/', '-')}.pdf"
    return StreamingResponse(
        iter([pdf_bytes]),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
