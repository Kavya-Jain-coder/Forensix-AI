from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Request
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Evidence, ChainOfCustody, Case, UserRole, AuditAction, User
from app.auth import get_current_user, require_roles, log_action, get_client_ip
from app.services.processor import DocumentProcessor
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone
import hashlib
import os
import uuid
import re

router = APIRouter(prefix="/cases/{case_id}/evidence", tags=["evidence"])

EVIDENCE_STORE = os.getenv("EVIDENCE_STORE", "evidence_store")
MAX_FILE_SIZE = 50 * 1024 * 1024
ALLOWED_TYPES = {
    "application/pdf", "text/plain",
    "image/jpeg", "image/png", "image/gif",
    "image/bmp", "image/tiff", "image/webp",
}


def sanitize_filename(name: str) -> str:
    name = os.path.basename(name)
    name = re.sub(r"[^\w\.\-]", "_", name)
    return name[:200]


def compute_sha256(path: str) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            h.update(chunk)
    return h.hexdigest()


def next_exhibit_ref(case_id: str, db: Session) -> str:
    count = db.query(Evidence).filter(Evidence.case_id == case_id).count()
    letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    prefix = letters[count % 26]
    return f"{prefix}JM/{count + 1}"


class EvidenceOut(BaseModel):
    id: str
    case_id: str
    exhibit_ref: str
    original_filename: str
    file_type: str
    file_size: int
    sha256_hash: str
    raw_ocr_text: Optional[str]
    extracted_text: Optional[str]
    ocr_corrected: bool
    ocr_corrected_by_id: Optional[str]
    ocr_corrected_at: Optional[datetime]
    ocr_correction_reason: Optional[str]
    integrity_verified: bool
    last_integrity_check: Optional[datetime]
    integrity_status: Optional[str]
    uploaded_by_id: str
    uploaded_at: datetime

    class Config:
        from_attributes = True


class CustodyEventOut(BaseModel):
    id: str
    action: str
    performed_by_id: str
    performed_by_name: str
    performed_by_role: str
    timestamp: datetime
    notes: Optional[str]
    ip_address: Optional[str]


@router.post("", response_model=List[EvidenceOut])
async def upload_evidence(
    case_id: str,
    request: Request,
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.FORENSIC_OFFICER, UserRole.INVESTIGATOR)),
):
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    os.makedirs(EVIDENCE_STORE, exist_ok=True)
    results = []

    for file in files:
        if file.content_type not in ALLOWED_TYPES:
            raise HTTPException(status_code=400, detail=f"File type not allowed: {file.content_type}")

        safe_name = sanitize_filename(file.filename)
        stored_name = f"{uuid.uuid4()}_{safe_name}"
        store_path = os.path.join(EVIDENCE_STORE, stored_name)

        size = 0
        with open(store_path, "wb") as buf:
            while chunk := await file.read(8192):
                size += len(chunk)
                if size > MAX_FILE_SIZE:
                    os.remove(store_path)
                    raise HTTPException(status_code=400, detail=f"File too large (max 50MB): {file.filename}")
                buf.write(chunk)

        sha256 = compute_sha256(store_path)
        raw_text = DocumentProcessor.extract_text(store_path, file.content_type)

        evidence = Evidence(
            case_id=case_id,
            exhibit_ref=next_exhibit_ref(case_id, db),
            original_filename=safe_name,
            stored_filename=stored_name,
            file_type=file.content_type,
            file_size=size,
            sha256_hash=sha256,
            raw_ocr_text=raw_text if raw_text.strip() else None,
            extracted_text=raw_text if raw_text.strip() else None,
            uploaded_by_id=current_user.id,
            storage_path=store_path,
            integrity_verified=True,
            last_integrity_check=datetime.now(timezone.utc),
            integrity_status="VERIFIED",
        )
        db.add(evidence)
        db.flush()

        db.add(ChainOfCustody(
            evidence_id=evidence.id,
            action="UPLOADED",
            performed_by_id=current_user.id,
            notes=f"Original file uploaded. SHA-256: {sha256}. Size: {size} bytes.",
            ip_address=get_client_ip(request),
        ))

        log_action(db, AuditAction.EVIDENCE_UPLOADED, user_id=current_user.id,
                   case_id=case_id, evidence_id=evidence.id,
                   details={"filename": safe_name, "sha256": sha256, "size": size},
                   ip=get_client_ip(request))
        results.append(evidence)

    db.commit()
    for e in results:
        db.refresh(e)
    return results


@router.get("", response_model=List[EvidenceOut])
async def list_evidence(
    case_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return db.query(Evidence).filter(Evidence.case_id == case_id).all()


@router.get("/{evidence_id}", response_model=EvidenceOut)
async def get_evidence(
    case_id: str,
    evidence_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ev = db.query(Evidence).filter(Evidence.id == evidence_id, Evidence.case_id == case_id).first()
    if not ev:
        raise HTTPException(status_code=404, detail="Evidence not found")
    db.add(ChainOfCustody(
        evidence_id=ev.id, action="VIEWED",
        performed_by_id=current_user.id,
        notes=f"Evidence record viewed by {current_user.full_name}",
        ip_address=get_client_ip(request),
    ))
    log_action(db, AuditAction.EVIDENCE_ACCESSED, user_id=current_user.id,
               case_id=case_id, evidence_id=evidence_id, ip=get_client_ip(request))
    db.commit()
    return ev


@router.patch("/{evidence_id}/ocr")
async def update_ocr_text(
    case_id: str,
    evidence_id: str,
    request: Request,
    corrected_text: str = Form(...),
    reason: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.FORENSIC_OFFICER, UserRole.INVESTIGATOR)),
):
    ev = db.query(Evidence).filter(Evidence.id == evidence_id, Evidence.case_id == case_id).first()
    if not ev:
        raise HTTPException(status_code=404, detail="Evidence not found")

    ev.extracted_text = corrected_text
    ev.ocr_corrected = True
    ev.ocr_corrected_by_id = current_user.id
    ev.ocr_corrected_at = datetime.now(timezone.utc)
    ev.ocr_correction_reason = reason

    db.add(ChainOfCustody(
        evidence_id=ev.id, action="OCR_CORRECTED",
        performed_by_id=current_user.id,
        notes=f"OCR text manually corrected by {current_user.full_name}. Reason: {reason or 'Not specified'}",
        ip_address=get_client_ip(request),
    ))
    log_action(db, AuditAction.OCR_CORRECTED, user_id=current_user.id,
               case_id=case_id, evidence_id=evidence_id,
               details={"reason": reason}, ip=get_client_ip(request))
    db.commit()
    return {"message": "OCR text updated"}


@router.post("/{evidence_id}/verify-integrity")
async def verify_integrity(
    case_id: str,
    evidence_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ev = db.query(Evidence).filter(Evidence.id == evidence_id, Evidence.case_id == case_id).first()
    if not ev:
        raise HTTPException(status_code=404, detail="Evidence not found")
    if not os.path.exists(ev.storage_path):
        now = datetime.now(timezone.utc)
        ev.integrity_verified = False
        ev.last_integrity_check = now
        ev.integrity_status = "FILE_MISSING"
        db.add(ChainOfCustody(
            evidence_id=ev.id, action="INTEGRITY_CHECKED",
            performed_by_id=current_user.id,
            notes="CRITICAL: Original file not found on disk. Evidence may have been deleted or moved.",
            ip_address=get_client_ip(request),
        ))
        log_action(db, AuditAction.EVIDENCE_INTEGRITY_CHECKED, user_id=current_user.id,
                   case_id=case_id, evidence_id=evidence_id,
                   details={"status": "FILE_MISSING", "storage_path": ev.storage_path},
                   ip=get_client_ip(request))
        db.commit()
        return {"status": "FILE_MISSING", "message": "CRITICAL: Original file not found on disk. This has been logged.", "match": False}

    current_hash = compute_sha256(ev.storage_path)
    match = current_hash == ev.sha256_hash
    status = "VERIFIED" if match else "TAMPERED"

    ev.integrity_verified = match
    ev.last_integrity_check = datetime.now(timezone.utc)
    ev.integrity_status = status

    db.add(ChainOfCustody(
        evidence_id=ev.id, action="INTEGRITY_CHECKED",
        performed_by_id=current_user.id,
        notes=f"Integrity check: {status}. Expected: {ev.sha256_hash}. Got: {current_hash}",
        ip_address=get_client_ip(request),
    ))
    log_action(db, AuditAction.EVIDENCE_INTEGRITY_CHECKED, user_id=current_user.id,
               case_id=case_id, evidence_id=evidence_id,
               details={"status": status, "expected": ev.sha256_hash, "actual": current_hash},
               ip=get_client_ip(request))
    db.commit()

    return {
        "status": status,
        "match": match,
        "expected_hash": ev.sha256_hash,
        "current_hash": current_hash,
        "checked_at": ev.last_integrity_check.isoformat(),
        "message": "File integrity verified — hash matches original." if match else "WARNING: File hash does not match. Evidence may have been tampered with.",
    }


@router.get("/{evidence_id}/custody", response_model=List[CustodyEventOut])
async def get_custody_chain(
    case_id: str,
    evidence_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ev = db.query(Evidence).filter(Evidence.id == evidence_id, Evidence.case_id == case_id).first()
    if not ev:
        raise HTTPException(status_code=404, detail="Evidence not found")

    result = []
    for c in ev.custody_chain:
        u = db.query(User).filter(User.id == c.performed_by_id).first()
        result.append(CustodyEventOut(
            id=c.id,
            action=c.action,
            performed_by_id=c.performed_by_id,
            performed_by_name=u.full_name if u else "Unknown",
            performed_by_role=u.role.value if u else "",
            timestamp=c.timestamp,
            notes=c.notes,
            ip_address=c.ip_address,
        ))
    return result
