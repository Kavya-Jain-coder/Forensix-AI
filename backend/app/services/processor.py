import pdfplumber
import pytesseract
from PIL import Image
import io

class DocumentProcessor:
    @staticmethod
    def extract_text(file_path: str, file_type: str) -> str:
        text = ""
        if file_type == "application/pdf":
            with pdfplumber.open(file_path) as pdf:
                for page in pdf.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text += page_text + "\n"
                    else:
                        # Fallback to OCR if page is an image
                        img = page.to_image().original
                        text += pytesseract.image_to_string(img) + "\n"
        elif file_type.startswith("image/"):
            try:
                text = pytesseract.image_to_string(Image.open(file_path))
            except pytesseract.TesseractNotFoundError:
                text = ""
        else:
            with open(file_path, "r") as f:
                text = f.read()
        return text
