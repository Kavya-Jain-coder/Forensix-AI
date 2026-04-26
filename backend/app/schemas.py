from pydantic import BaseModel
from typing import List, Optional

class Citation(BaseModel):
    content: str
    source: str

class ReportResponse(BaseModel):
    case_summary: str
    observations: str
    analysis: str
    limitations: str
    conclusion: str
    confidence_score: float
    citations: List[Citation]