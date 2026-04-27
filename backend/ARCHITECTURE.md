# ForensixAI Backend Architecture

## System Overview

```
┌─────────────────────────────────────────────────────┐
│                   Frontend (React)                   │
│                 http://localhost:5174                │
└────────────────┬────────────────────────────────────┘
                 │ HTTP/REST
                 ▼
┌─────────────────────────────────────────────────────┐
│              FastAPI Backend                        │
│              http://localhost:8001                  │
│  ┌───────────────────────────────────────────────┐ │
│  │  POST /api/generate-report                    │ │
│  │  ├─ File Upload Handler                      │ │
│  │  ├─ Document Processor                       │ │
│  │  ├─ RAG Pipeline                             │ │
│  │  ├─ Report Generator (Gemini)                │ │
│  │  └─ Response Formatter                       │ │
│  └───────────────────────────────────────────────┘ │
└────────────┬─────────────────────────────────────┬─┘
             │                                     │
             ▼                                     ▼
    ┌──────────────────┐            ┌──────────────────────┐
    │ File System      │            │ Google Gemini API    │
    │ (uploads/)       │            │ (LLM Generation)     │
    └──────────────────┘            └──────────────────────┘
```

## Pipeline Flow

```
1. FILE UPLOAD
   User selects file → HTTP POST /api/generate-report
   │
   ├─ Save to disk (uploads/{filename})
   └─ Get MIME type for format detection

2. TEXT EXTRACTION
   DocumentProcessor.extract_text()
   │
   ├─ PDF → Use pdfplumber
   ├─ Image → Use PyTesseract (OCR)
   ├─ Text → Read directly
   └─ Fallback: Use Gemini Vision API for images

3. VECTOR STORE CREATION
   RAGService.create_vector_store(text)
   │
   ├─ Split text into chunks (800 chars, 100 overlap)
   ├─ Generate embeddings (all-MiniLM-L6-v2)
   ├─ Create FAISS index
   └─ Return vector store object

4. CONTEXT RETRIEVAL
   RAGService.retrieve_context(vector_store, query)
   │
   ├─ Query: "Summarize findings and forensic evidence"
   ├─ Semantic search using embeddings
   ├─ Retrieve top chunks + relevance scores
   ├─ Calculate confidence from scores
   └─ Return (context, docs, confidence)

5. REPORT GENERATION
   ReportGenerator.generate(context)
   │
   ├─ Create structured prompt with JSON schema
   ├─ Call Gemini LLM with context
   ├─ Robust JSON extraction (3-level fallback)
   ├─ Validate with Pydantic
   └─ Return structured ForensicReport

6. RESPONSE FORMATTING
   API formats citations and returns to frontend
   │
   └─ Response: {
        case_summary,
        key_findings[],
        evidence_extracted[],
        risk_level,
        recommendations[],
        confidence_score,
        citations[]
      }
```

## Service Architecture

### 1. DocumentProcessor (`services/processor.py`)
**Purpose:** Convert documents to text  
**Supported formats:** PDF, Images (PNG/JPG), TXT, DOCX  
**Methods:**
- `extract_text(file_path, content_type)` → str

**Logic:**
```python
if content_type.startswith('application/pdf'):
    return extract_from_pdf()
elif content_type.startswith('image/'):
    return extract_from_image()  # OCR
else:
    return extract_from_text()
```

### 2. RAGService (`services/rag_service.py`)
**Purpose:** Vector storage and semantic retrieval  
**Components:**
- HuggingFaceEmbeddings (all-MiniLM-L6-v2 model)
- FAISS vector store
- RecursiveCharacterTextSplitter

**Methods:**
- `create_vector_store(text)` → FAISS object
- `retrieve_context(vector_store, query)` → (context_str, docs_with_scores, confidence)

**Key parameters:**
```python
chunk_size = 800          # Characters per chunk
chunk_overlap = 100       # Overlap between chunks
top_k = 5                 # Retrieve top 5 chunks
```

### 3. ReportGenerator (`services/generator.py`)
**Purpose:** Generate structured forensic reports using LLM  
**Model:** Gemini 2.5 Flash (or 1.5 Pro)  
**Temperature:** 0.3 (low for consistency)

**Methods:**
- `generate(context)` → dict (ForensicReport)
- `generate_from_image(image_path, mime_type)` → dict
- `_parse_json_response(response)` → dict (robust parsing)

**JSON Schema:**
```python
{
  "case_summary": "string",
  "key_findings": [
    {"title": "string", "description": "string", "severity": "enum"}
  ],
  "evidence_extracted": ["string"],
  "risk_level": "enum",
  "recommendations": ["string"],
  "technical_notes": "string|null"
}
```

## Data Models

### Pydantic Schemas (`schemas.py`)

**ForensicReport** - Main output model
```python
case_summary: str (50-1000 chars)
key_findings: List[Finding] (1-10 items)
evidence_extracted: List[str] (1-20 items)
risk_level: RiskLevel (enum)
recommendations: List[str] (1-5 items)
confidence_score: float (0-100)
citations: List[Citation]
technical_notes: Optional[str]
```

**Finding** - Individual forensic finding
```python
title: str
description: str (10-2000 chars)
severity: RiskLevel (critical|high|medium|low|none)
```

**RiskLevel** - Enum
```python
CRITICAL = "critical"
HIGH = "high"
MEDIUM = "medium"
LOW = "low"
NONE = "none"
```

## API Endpoint

### POST /api/generate-report

**Request:**
```http
POST /api/generate-report HTTP/1.1
Content-Type: multipart/form-data

file: <binary data>
```

**Response (Success - 200):**
```json
{
  "case_summary": "Evidence indicates...",
  "key_findings": [
    {
      "title": "Unauthorized Access",
      "description": "Timeline shows...",
      "severity": "high"
    }
  ],
  "evidence_extracted": ["log entry 1", "log entry 2"],
  "risk_level": "high",
  "recommendations": ["Investigate...", "Monitor..."],
  "confidence_score": 85.5,
  "citations": [
    {"content": "source text", "segment_id": 1}
  ],
  "technical_notes": null
}
```

**Response (Error - 500):**
```json
{
  "detail": "DocumentProcessor: No readable text found in file."
}
```

## Error Handling

### Error Types
| Error | Status | Cause | Fix |
|-------|--------|-------|-----|
| No readable text | 400 | Unsupported format | Use PDF/TXT/Image |
| API rate limit | 429 | Too many requests | Implement backoff |
| Invalid JSON | 500 | LLM response malformed | Check prompt |
| File too large | 413 | >100MB | Implement size limit |
| API key missing | 500 | GOOGLE_API_KEY not set | Configure env var |

### Logging Strategy
```python
# Each pipeline stage logs:
print(f"[INFO] Stage: Description")     # Progress
print(f"[ERROR] Error: {traceback}")    # Failures

# Frontend receives in response
raise HTTPException(status_code=500, detail="Human-readable error")
```

## Performance Characteristics

### Typical Processing Times
```
File upload & save:     50-200ms
Text extraction:        100-500ms (depends on file size)
Vector store creation:  500-2000ms (depends on text length)
Context retrieval:      100-300ms (semantic search)
Report generation:      2-8 seconds (LLM API call)
Response formatting:    50-100ms

TOTAL: 3-11 seconds (typical)
```

### Memory Usage
```
Embeddings model:       ~100MB (loaded once on startup)
FAISS index:            ~10MB per 1000 documents
Gemini API calls:       Streaming (no local buffering)
```

### Scalability Bottlenecks
1. **LLM API latency** - Most significant (2-8s)
2. **Embedding generation** - For very large documents (>50k chars)
3. **Memory** - Vector stores accumulate in memory (use cleanup)

## Security Considerations

### Current Implementation
- ✓ File validation by content-type
- ✓ Temporary files cleaned up
- ✗ No file size limits
- ✗ No rate limiting
- ✗ No authentication
- ✗ No input sanitization for LLM prompts

### Recommendations
1. Add max file size (e.g., 50MB)
2. Implement rate limiting per IP
3. Add authentication for API access
4. Validate file content (magic bytes)
5. Add request timeout (30s)
6. Sanitize user inputs in prompts

## Environment Setup

### Dependencies
```bash
pip install -r requirements.txt
```

### Key packages
- fastapi: Web framework
- langchain: LLM orchestration
- langchain-google-genai: Gemini API
- langchain-huggingface: Embeddings
- faiss-cpu: Vector store (use faiss-gpu for production)
- pdfplumber: PDF extraction
- pytesseract: OCR
- python-dotenv: Environment variables

### Environment Variables
```bash
GOOGLE_API_KEY=your_api_key
GOOGLE_GEMINI_MODEL=gemini-2.5-flash  # or gemini-1.5-pro
PORT=8001
```

## Monitoring & Debugging

### Access Logs
```bash
tail -f /path/to/logs/app.log
```

### Health Check
```bash
curl http://localhost:8001/docs
```

### Manual Testing
```bash
curl -X POST http://localhost:8001/api/generate-report \
  -F "file=@test.pdf"
```

## Future Architecture Improvements

### 1. Task Queue
```
FastAPI (receives request)
    ↓
Redis Queue
    ↓
Worker (processes report)
    ↓
Database (stores result)
```

### 2. Caching Layer
```
FastAPI
    ↓
Redis Cache (check if file analyzed before)
    ↓
If miss → Generate report
    ↓
Store in cache + DB
```

### 3. Streaming Responses
```
FastAPI Streaming
    ↓
Send each section as it generates
    ↓
Frontend shows report progressively
```

### 4. Database Integration
```
PostgreSQL
    ├─ users table
    ├─ analyses table (history)
    ├─ reports table (cached results)
    └─ citations table (indexed)
```

## Deployment Checklist

- [ ] Migrate to faiss-gpu for production
- [ ] Add Redis for caching
- [ ] Set up PostgreSQL database
- [ ] Implement authentication
- [ ] Add rate limiting middleware
- [ ] Configure logging aggregation
- [ ] Set up monitoring/alerting
- [ ] Add request timeout handling
- [ ] Implement retry logic
- [ ] Add health check endpoint
- [ ] Document API with OpenAPI/Swagger
- [ ] Set up CI/CD pipeline

---

**Architecture Version:** 1.0  
**Last Updated:** 2024  
**Status:** Production-Ready with Recommendations
