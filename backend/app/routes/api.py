from fastapi import APIRouter, UploadFile, File, HTTPException
from app.services.processor import DocumentProcessor
from app.services.rag_service import RAGService
from app.services.generator import ReportGenerator
import os
import shutil
import traceback

router = APIRouter()
rag_service = RAGService()
generator = ReportGenerator()

@router.post("/generate-report")
async def process_document(file: UploadFile = File(...)):
    temp_path = f"uploads/{file.filename}"
    os.makedirs("uploads", exist_ok=True)
    
    try:
        print(f"[INFO] Processing file: {file.filename}")
        
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        print(f"[INFO] File saved to {temp_path}")

        # 1. Extract
        print("[INFO] Extracting text from file...")
        text = DocumentProcessor.extract_text(temp_path, file.content_type)
        if file.content_type and file.content_type.startswith("image/") and not text.strip():
            print("[INFO] No OCR text found. Generating report from image evidence...")
            report_data = await generator.generate_from_image(temp_path, file.content_type)
            return {
                **report_data,
                "confidence_score": 100.0,
                "citations": [
                    {
                        "content": f"Visual analysis of uploaded image evidence: {file.filename}",
                        "source": "Uploaded Image Evidence",
                    }
                ],
            }

        if not text.strip():
            raise HTTPException(status_code=400, detail="No readable text found in file.")
        print(f"[INFO] Extracted {len(text)} characters")

        # 2. RAG Indexing
        print("[INFO] Creating vector store...")
        vector_store = rag_service.create_vector_store(text)
        print("[INFO] Vector store created")
        
        # 3. Context Retrieval
        print("[INFO] Retrieving context...")
        query = "Summarize findings and forensic evidence for a formal report."
        context, docs, confidence = rag_service.retrieve_context(vector_store, query)
        print(f"[INFO] Context retrieved with confidence: {confidence}")

        # 4. LLM Generation
        print("[INFO] Generating report with LLM...")
        report_data = await generator.generate(context)
        print("[INFO] Report generated successfully")
        
        # 5. Format Citations
        citations = [{"content": doc.page_content, "source": f"Evidence Segment {i+1}"} 
                     for i, (doc, score) in enumerate(docs)]

        return {
            **report_data,
            "confidence_score": round(float(confidence) * 100, 2),
            "citations": citations
        }

    except HTTPException as e:
        print(f"[ERROR] HTTP Exception: {e.detail}")
        raise
    except Exception as e:
        error_msg = f"{type(e).__name__}: {str(e)}"
        print(f"[ERROR] {error_msg}")
        print(f"[ERROR] Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=error_msg)
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)
            print(f"[INFO] Cleaned up {temp_path}")
