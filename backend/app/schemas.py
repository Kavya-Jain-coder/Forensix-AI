from pydantic import BaseModel, Field
from typing import List, Optional
from enum import Enum


class RiskLevel(str, Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    NONE = "none"


class Finding(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: str = Field(..., min_length=10, max_length=2000)
    severity: RiskLevel


class Citation(BaseModel):
    content: str = Field(..., max_length=500)
    segment_id: int


class ForensicReport(BaseModel):
    """Structured forensic analysis report"""
    case_summary: str = Field(..., min_length=50, max_length=1000, description="Executive summary")
    key_findings: List[Finding] = Field(..., min_items=1, max_items=10)
    evidence_extracted: List[str] = Field(..., min_items=1, max_items=20, description="Key evidence segments")
    risk_level: RiskLevel
    recommendations: List[str] = Field(..., min_items=1, max_items=5)
    confidence_score: float = Field(..., ge=0, le=100, description="Confidence as percentage")
    citations: List[Citation]
    technical_notes: Optional[str] = Field(None, max_length=1000)


class ProcessingStage(str, Enum):
    EXTRACTING = "extracting"
    CHUNKING = "chunking"
    EMBEDDING = "embedding"
    RETRIEVING = "retrieving"
    GENERATING = "generating"
    COMPLETE = "complete"


class ProcessingProgress(BaseModel):
    stage: ProcessingStage
    progress_percent: int = Field(..., ge=0, le=100)
    message: str


class ErrorResponse(BaseModel):
    error: str
    code: str
    details: Optional[dict] = None
    source: str

class ReportResponse(BaseModel):
    case_summary: str
    observations: str
    analysis: str
    limitations: str
    conclusion: str
    confidence_score: float
    citations: List[Citation]