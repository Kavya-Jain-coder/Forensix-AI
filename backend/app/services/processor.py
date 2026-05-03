import pdfplumber
import pytesseract
from PIL import Image
import io
import os


class DocumentProcessor:
    @staticmethod
    def extract_text(file_path: str, file_type: str) -> str:
        try:
            if file_type == "application/pdf":
                return DocumentProcessor._extract_pdf(file_path)
            elif file_type.startswith("image/"):
                return DocumentProcessor._extract_image(file_path)
            else:
                return DocumentProcessor._extract_text_file(file_path)
        except Exception as e:
            print(f"[WARN] Text extraction failed for {file_path}: {type(e).__name__}: {e}")
            return ""

    @staticmethod
    def _extract_pdf(file_path: str) -> str:
        text_parts = []
        try:
            with pdfplumber.open(file_path) as pdf:
                if not pdf.pages:
                    return ""
                for i, page in enumerate(pdf.pages):
                    try:
                        page_text = page.extract_text()
                        if page_text and page_text.strip():
                            text_parts.append(page_text)
                        else:
                            # Fallback to OCR for image-based pages
                            try:
                                img = page.to_image(resolution=150).original
                                ocr = pytesseract.image_to_string(img)
                                if ocr.strip():
                                    text_parts.append(ocr)
                            except pytesseract.TesseractNotFoundError:
                                print("[WARN] Tesseract not installed — skipping OCR for PDF page")
                            except Exception as e:
                                print(f"[WARN] OCR failed on PDF page {i}: {e}")
                    except Exception as e:
                        print(f"[WARN] Failed to extract page {i}: {e}")
                        continue
        except Exception as e:
            print(f"[WARN] Could not open PDF (possibly corrupted or password-protected): {e}")
            return ""
        return "\n".join(text_parts)

    @staticmethod
    def _extract_image(file_path: str) -> str:
        try:
            img = Image.open(file_path)
            img.verify()
            img = Image.open(file_path)  # reopen after verify
            text = pytesseract.image_to_string(img)
            return text.strip()
        except pytesseract.TesseractNotFoundError:
            print("[WARN] Tesseract not installed — image OCR unavailable")
            return ""
        except Exception as e:
            print(f"[WARN] Image OCR failed: {e}")
            return ""

    @staticmethod
    def _extract_text_file(file_path: str) -> str:
        # Try common encodings
        for encoding in ("utf-8", "latin-1", "cp1252", "utf-16"):
            try:
                with open(file_path, "r", encoding=encoding) as f:
                    content = f.read()
                if content.strip():
                    return content
            except (UnicodeDecodeError, LookupError):
                continue
            except Exception as e:
                print(f"[WARN] Could not read text file with {encoding}: {e}")
                break
        return ""
