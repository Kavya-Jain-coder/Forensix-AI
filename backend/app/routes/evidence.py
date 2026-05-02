from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Request
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Evidence, ChainOfCustody, Case, UserRole, AuditAction, User
from app.auth import get_current_user, require_roles, log_action, get_client_ip
from app.services.processor import DocumentProcessor
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import hashlib
import os
import shutil
import uuid
import re

router = APIRouter(prefix="/cases/{case_id}/evidence", tags=["evidence"])

EVIDENCE_STORE = os.getenv("EVIDENCE_STORE", "evidence_store")
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB
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
    extracted_text: Optional[str]
    ocr_corrected: bool
    uploaded_by_id: str
    uploaded_at: datetime

    class Config:
        from_attributes = True


class CustodyEventOut(BaseModel):
    id: str
    action: str
    performed_by_id: str
    timestamp: datetime
    notes: Optional[str]
    ip_address: Optional[str]

    class Config:
        from_attributes = True


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
        # Validate type
        if file.content_type not in ALLOWED_TYPES:
            raise HTTPException(status_code=400, detail=f"File type not allowed: {file.content_type}")

        safe_name = sanitize_filename(file.filename)
        stored_name = f"{uuid.uuid4()}_{safe_name}"
        store_path = os.path.join(EVIDENCE_STORE, stored_name)

        # Save and validate size
        size = 0
        with open(store_path, "wb") as buf:
            while chunk := await file.read(8192):
                size += len(chunk)
                if size > MAX_FILE_SIZE:
                    os.remove(store_path)
                    raise HTTPException(status_code=400, detail=f"File too large (max 50MB): {file.filename}")
                buf.write(chunk)

        sha256 = compute_sha256(store_path)
        extracted_text = DocumentProcessor.extract_text(store_path, file.content_type)

        evidence = Evidence(
            case_id=case_id,
            exhibit_ref=next_exhibit_ref(case_id, db),
            original_filename=safe_name,
            stored_filename=stored_name,
            file_type=file.content_type,
            file_size=size,
            sha256_hash=sha256,
            extracted_text=extracted_text if extracted_text.strip() else None,
            uploaded_by_id=current_user.id,
            storage_path=store_path,
        )
        db.add(evidence)
        db.flush()

        custody = ChainOfCustody(
            evidence_id=evidence.id,
            action="UPLOADED",
            performed_by_id=current_user.id,
            notes=f"File uploaded: {safe_name}, SHA-256: {sha256}",
            ip_address=get_client_ip(request),
        )
        db.add(custody)

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
    log_action(db, AuditAction.EVIDENCE_ACCESSED, user_id=current_user.id,
               case_id=case_id, evidence_id=evidence_id, ip=get_client_ip(request))
    return ev


@router.patch("/{evidence_id}/ocr")
async def update_ocr_text(
    case_id: str,
    evidence_id: str,
    corrected_text: str = Form(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.FORENSIC_OFFICER, UserRole.INVESTIGATOR)),
):
    ev = db.query(Evidence).filter(Evidence.id == evidence_id, Evidence.case_id == case_id).first()
    if not ev:
        raise HTTPException(status_code=404, detail="Evidence not found")
    ev.extracted_text = corrected_text
    ev.ocr_corrected = True
    db.commit()
    return {"message": "OCR text updated"}


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
    return ev.custody_chain
