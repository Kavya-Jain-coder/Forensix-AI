from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from app.services.processor import DocumentProcessor
from app.services.rag_service import RAGService
from app.services.generator import ReportGenerator
from typing import List, Optional
import os
import shutil
import traceback

router = APIRouter()
rag_service = RAGService()
generator = ReportGenerator()

@router.post("/generate-report")
async def process_documents(
    files: List[UploadFile] = File(...),
    officer_in_charge: Optional[str] = Form(None),
    submitted_by: Optional[str] = Form(None),
    date_of_examination: Optional[str] = Form(None),
):
    os.makedirs("uploads", exist_ok=True)
    temp_paths = []

    try:
        all_texts = []
        image_paths = []
        image_mimes = []
        image_names = []
        filenames = [f.filename for f in files]

        print(f"[INFO] Processing {len(files)} file(s): {filenames}")

        for file in files:
            temp_path = f"uploads/{file.filename}"
            temp_paths.append(temp_path)

            with open(temp_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)

            text = DocumentProcessor.extract_text(temp_path, file.content_type)

            if file.content_type and file.content_type.startswith("image/") and not text.strip():
                image_paths.append(temp_path)
                image_mimes.append(file.content_type)
                image_names.append(file.filename)
                print(f"[INFO] {file.filename}: image with no OCR text, using visual fallback")
            elif text.strip():
                all_texts.append(f"=== EXHIBIT: {file.filename} ===\n{text}")
                print(f"[INFO] {file.filename}: extracted {len(text)} characters")
            else:
                print(f"[WARNING] {file.filename}: no text extracted, skipping")

        case_meta = {
            "officer_in_charge": officer_in_charge,
            "submitted_by": submitted_by,
            "date_of_examination": date_of_examination,
        }

        # All images with no OCR text
        if not all_texts and image_paths:
            print("[INFO] All images, no OCR text. Generating from image metadata.")
            report_data = await generator.generate_from_images(image_paths, image_mimes, image_names, case_meta)
            return {
                **report_data,
                "confidence_score": 55.0,
                "citations": [{"content": f"Visual evidence: {name}", "source": name} for name in image_names],
            }

        if not all_texts:
            raise HTTPException(status_code=400, detail="No readable content found in any uploaded file.")

        # Full text passed to LLM — no truncation
        combined_text = "\n\n".join(all_texts)
        print(f"[INFO] Total combined text: {len(combined_text)} characters")

        # RAG used only for confidence scoring
        vector_store = rag_service.create_vector_store(combined_text)
        query = "Summarize all forensic evidence, findings, subjects, exhibits, and key observations."
        _, docs, confidence = rag_service.retrieve_context(vector_store, query)
        print(f"[INFO] Confidence score: {confidence:.3f}")

        # Generate report from full text
        report_data = await generator.generate(combined_text, filenames, case_meta)

        # Fill any missing fields with safe defaults
        defaults = {
            "report_number": "FSL/2024/CR/00001",
            "classification": "OFFICIAL — FORENSIC SCIENCE LABORATORY REPORT",
            "officer_in_charge": officer_in_charge or "Senior Forensic Examiner",
            "submitted_by": submitted_by or "Forensic Submissions Unit",
            "date_of_examination": date_of_examination or "",
            "date_of_report": "",
            "laboratory_reference": "LAB-REF-2024-0001",
            "exhibits": [],
            "background": "Evidence submitted for forensic examination.",
            "scope_of_examination": "Full forensic examination of submitted exhibits.",
            "examination_narrative": combined_text[:800],
            "key_findings": [],
            "statistical_analysis": "Not applicable to this examination.",
            "conclusion": "Examination of submitted evidence is complete.",
            "risk_level": "medium",
            "recommendations": ["Further analysis recommended.", "Preserve all exhibits in secure storage."],
            "limitations": "None identified.",
            "examiner_statement": "I have examined the items listed in this report and the results are set out above.",
            "confidence_note": "Analysis based on available evidence.",
        }
        for key, default in defaults.items():
            if not report_data.get(key):
                report_data[key] = default

        citations = [{"content": doc.page_content[:200], "segment_id": i + 1}
                     for i, (doc, score) in enumerate(docs)]

        return {
            **report_data,
            "confidence_score": round(float(confidence) * 100, 2),
            "citations": citations,
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] {type(e).__name__}: {e}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"{type(e).__name__}: {str(e)}")
    finally:
        for path in temp_paths:
            if os.path.exists(path):
                os.remove(path)
