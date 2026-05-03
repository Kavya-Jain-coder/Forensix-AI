from sqlalchemy import Column, String, Integer, Float, DateTime, Text, ForeignKey, Enum as SAEnum, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum
import uuid


def gen_id():
    return str(uuid.uuid4())


class UserRole(str, enum.Enum):
    ADMIN = "admin"
    FORENSIC_OFFICER = "forensic_officer"
    INVESTIGATOR = "investigator"
    REVIEWER = "reviewer"


class CaseType(str, enum.Enum):
    HOMICIDE = "homicide"
    CYBERCRIME = "cybercrime"
    FRAUD = "fraud"
    NARCOTICS = "narcotics"
    MISSING_PERSON = "missing_person"
    SEXUAL_ASSAULT = "sexual_assault"
    ROBBERY = "robbery"
    TERRORISM = "terrorism"
    OTHER = "other"


class CasePriority(str, enum.Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class CaseStatus(str, enum.Enum):
    OPEN = "open"
    UNDER_REVIEW = "under_review"
    CLOSED = "closed"
    ARCHIVED = "archived"


class ReportStatus(str, enum.Enum):
    AI_DRAFT = "ai_draft"
    UNDER_REVIEW = "under_review"
    NEEDS_CORRECTION = "needs_correction"
    APPROVED = "approved"
    EXPORTED = "exported"


class ReviewOutcome(str, enum.Enum):
    APPROVED = "approved"
    NEEDS_CLARIFICATION = "needs_clarification"
    OCR_CORRECTION_REQUIRED = "ocr_correction_required"
    EVIDENCE_MISSING = "evidence_missing"
    METHODOLOGY_ISSUE = "methodology_issue"
    LEGAL_EXPORT_ISSUE = "legal_export_issue"


class AuditAction(str, enum.Enum):
    USER_LOGIN = "user_login"
    USER_LOGOUT = "user_logout"
    CASE_CREATED = "case_created"
    CASE_UPDATED = "case_updated"
    EVIDENCE_UPLOADED = "evidence_uploaded"
    EVIDENCE_ACCESSED = "evidence_accessed"
    EVIDENCE_INTEGRITY_CHECKED = "evidence_integrity_checked"
    OCR_CORRECTED = "ocr_corrected"
    REPORT_GENERATED = "report_generated"
    REPORT_EDITED = "report_edited"
    REPORT_SUBMITTED = "report_submitted"
    REPORT_APPROVED = "report_approved"
    REPORT_REJECTED = "report_rejected"
    REPORT_EXPORTED = "report_exported"


class User(Base):
    __tablename__ = "users"
    id = Column(String, primary_key=True, default=gen_id)
    username = Column(String(80), unique=True, nullable=False, index=True)
    email = Column(String(120), unique=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String(120), nullable=False)
    role = Column(SAEnum(UserRole), nullable=False, default=UserRole.INVESTIGATOR)
    badge_number = Column(String(40), nullable=True)
    department = Column(String(120), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    cases = relationship("Case", foreign_keys="Case.assigned_officer_id", back_populates="assigned_officer")
    audit_logs = relationship("AuditLog", back_populates="user")


class Case(Base):
    __tablename__ = "cases"
    id = Column(String, primary_key=True, default=gen_id)
    case_number = Column(String(40), unique=True, nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(SAEnum(CaseStatus), default=CaseStatus.OPEN)
    case_type = Column(SAEnum(CaseType), default=CaseType.OTHER)
    priority = Column(SAEnum(CasePriority), default=CasePriority.MEDIUM)
    fir_number = Column(String(80), nullable=True)
    investigating_agency = Column(String(120), nullable=True)
    court_deadline = Column(DateTime(timezone=True), nullable=True)
    submission_date = Column(DateTime(timezone=True), nullable=True)
    evidence_received_date = Column(DateTime(timezone=True), nullable=True)
    assigned_officer_id = Column(String, ForeignKey("users.id"), nullable=True)
    created_by_id = Column(String, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    assigned_officer = relationship("User", foreign_keys=[assigned_officer_id], back_populates="cases")
    created_by = relationship("User", foreign_keys=[created_by_id])
    evidence = relationship("Evidence", back_populates="case", cascade="all, delete-orphan")
    reports = relationship("Report", back_populates="case", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="case")


class Evidence(Base):
    __tablename__ = "evidence"
    id = Column(String, primary_key=True, default=gen_id)
    case_id = Column(String, ForeignKey("cases.id"), nullable=False)
    exhibit_ref = Column(String(40), nullable=False)
    original_filename = Column(String(255), nullable=False)
    stored_filename = Column(String(255), nullable=False)
    file_type = Column(String(100), nullable=False)
    file_size = Column(Integer, nullable=False)
    sha256_hash = Column(String(64), nullable=False)
    raw_ocr_text = Column(Text, nullable=True)
    extracted_text = Column(Text, nullable=True)
    ocr_corrected = Column(Boolean, default=False)
    ocr_corrected_by_id = Column(String, ForeignKey("users.id"), nullable=True)
    ocr_corrected_at = Column(DateTime(timezone=True), nullable=True)
    ocr_correction_reason = Column(Text, nullable=True)
    integrity_verified = Column(Boolean, default=False)
    last_integrity_check = Column(DateTime(timezone=True), nullable=True)
    integrity_status = Column(String(20), nullable=True)
    uploaded_by_id = Column(String, ForeignKey("users.id"), nullable=False)
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())
    storage_path = Column(String(500), nullable=False)

    case = relationship("Case", back_populates="evidence")
    uploaded_by = relationship("User", foreign_keys=[uploaded_by_id])
    ocr_corrected_by = relationship("User", foreign_keys=[ocr_corrected_by_id])
    custody_chain = relationship("ChainOfCustody", back_populates="evidence", order_by="ChainOfCustody.timestamp")


class ChainOfCustody(Base):
    __tablename__ = "chain_of_custody"
    id = Column(String, primary_key=True, default=gen_id)
    evidence_id = Column(String, ForeignKey("evidence.id"), nullable=False)
    action = Column(String(80), nullable=False)
    performed_by_id = Column(String, ForeignKey("users.id"), nullable=False)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    notes = Column(Text, nullable=True)
    ip_address = Column(String(45), nullable=True)

    evidence = relationship("Evidence", back_populates="custody_chain")
    performed_by = relationship("User")


class Report(Base):
    __tablename__ = "reports"
    id = Column(String, primary_key=True, default=gen_id)
    case_id = Column(String, ForeignKey("cases.id"), nullable=False)
    report_number = Column(String(60), nullable=False)
    version = Column(Integer, default=1)
    status = Column(SAEnum(ReportStatus), default=ReportStatus.AI_DRAFT)
    review_outcome = Column(SAEnum(ReviewOutcome), nullable=True)  # structured outcome
    report_data = Column(Text, nullable=False)
    confidence_score = Column(Float, nullable=True)
    generated_by_id = Column(String, ForeignKey("users.id"), nullable=False)
    reviewed_by_id = Column(String, ForeignKey("users.id"), nullable=True)
    reviewer_comments = Column(Text, nullable=True)
    generated_at = Column(DateTime(timezone=True), server_default=func.now())
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    approved_at = Column(DateTime(timezone=True), nullable=True)
    exported_at = Column(DateTime(timezone=True), nullable=True)
    officer_in_charge = Column(String(120), nullable=True)
    submitted_by = Column(String(120), nullable=True)
    date_of_examination = Column(String(40), nullable=True)
    parent_report_id = Column(String, ForeignKey("reports.id"), nullable=True)

    case = relationship("Case", back_populates="reports")
    generated_by = relationship("User", foreign_keys=[generated_by_id])
    reviewed_by = relationship("User", foreign_keys=[reviewed_by_id])
    versions = relationship("Report", foreign_keys=[parent_report_id])


class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(String, primary_key=True, default=gen_id)
    user_id = Column(String, ForeignKey("users.id"), nullable=True)
    action = Column(SAEnum(AuditAction), nullable=False)
    case_id = Column(String, ForeignKey("cases.id"), nullable=True)
    evidence_id = Column(String, nullable=True)
    report_id = Column(String, nullable=True)
    details = Column(Text, nullable=True)
    ip_address = Column(String(45), nullable=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="audit_logs")
    case = relationship("Case", back_populates="audit_logs")
