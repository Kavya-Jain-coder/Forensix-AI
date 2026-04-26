from fastapi import APIRouter, UploadFile, File, HTTPException
from app.services.processor import DocumentProcessor
from app.services.rag_service import RAGService
from app.services.generator import ReportGenerator
import os
import shutil

router = APIRouter()
rag_service = RAGService()
generator = ReportGenerator()

@router.post("/generate-report")
async def process_document(file: UploadFile = File(...)):
    temp_path = f"uploads/{file.filename}"
    os.makedirs("uploads", exist_ok=True)
    
    try:
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # 1. Extract
        text = DocumentProcessor.extract_text(temp_path, file.content_type)
        if not text.strip():
            raise HTTPException(status_code=400, detail="No readable text found in file.")

        # 2. RAG Indexing
        vector_store = rag_service.create_vector_store(text)
        
        # 3. Context Retrieval
        query = "Summarize findings and forensic evidence for a formal report."
        context, docs, confidence = rag_service.retrieve_context(vector_store, query)

        # 4. LLM Generation
        report_data = await generator.generate(context)
        
        # 5. Format Citations
        citations = [{"content": doc.page_content, "source": f"Evidence Segment {i+1}"} 
                     for i, (doc, score) in enumerate(docs)]

        return {
            **report_data,
            "confidence_score": round(confidence * 100, 2),
            "citations": citations
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)