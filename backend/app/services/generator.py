import os
import json
import re
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from dotenv import load_dotenv

load_dotenv()

class ReportGenerator:
    def __init__(self):
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            raise ValueError("GROQ_API_KEY is not configured. Add it to your .env file.")

        model = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
        print(f"[INFO] Using Groq model: {model}")
        self.llm = ChatGroq(
            model=model,
            api_key=api_key,
            temperature=0.7,
        )

    async def generate(self, context: str):
        prompt = ChatPromptTemplate.from_template("""You are a senior forensic analyst. Analyze the evidence and generate a COMPLETE forensic report.

EVIDENCE:
{context}

Return ONLY valid JSON (no markdown, no extra text):
{{
  "case_summary": "2-3 sentence objective summary of evidence and findings",
  "key_findings": [
    {{"title": "Finding 1", "description": "Detailed description", "severity": "critical"}},
    {{"title": "Finding 2", "description": "Detailed description", "severity": "high"}},
    {{"title": "Finding 3", "description": "Detailed description", "severity": "medium"}}
  ],
  "evidence_extracted": ["Evidence point 1", "Evidence point 2", "Evidence point 3"],
  "risk_level": "high",
  "recommendations": ["Recommendation 1", "Recommendation 2"],
  "technical_notes": "Additional technical observations"
}}

CRITICAL REQUIREMENTS:
- Generate ALL 6 fields - NO MISSING FIELDS
- case_summary: 50-150 words
- key_findings: EXACTLY 3 findings, each with severity (critical|high|medium|low|none)
- evidence_extracted: 3-5 specific items from context
- risk_level: One of critical|high|medium|low|none
- recommendations: 2-3 actionable items
- technical_notes: 100-200 chars technical details
- Return ONLY the JSON object, nothing else""")
        
        chain = prompt | self.llm
        response = await chain.ainvoke({"context": context})
        result = self._parse_json_response(response.content)
        print(f"[INFO] Report generation result: {json.dumps(result, indent=2)}")
        return result

    async def generate_from_image(self, image_path: str, mime_type: str):
        """
        Fallback for image analysis when OCR doesn't extract text.
        Since Groq no longer provides vision models, generate report from image metadata.
        """
        import os
        
        filename = os.path.basename(image_path)
        
        # Create a context based on image metadata
        context = f"""
        Image Evidence: {filename}
        File Type: {mime_type}
        
        Analysis: Visual evidence has been received. Detailed text extraction was not possible through automated OCR.
        Manual review and analysis of the image evidence is recommended for accurate forensic assessment.
        
        Evidence Type: Image-based forensic evidence requiring visual interpretation.
        """
        
        # Generate report from this minimal context
        return await self.generate(context)

    def _parse_json_response(self, content):
        raw_content = self._response_text(content)
        raw_content = raw_content.replace('```json', '').replace('```', '').strip()

        try:
            return json.loads(raw_content)
        except json.JSONDecodeError:
            json_match = re.search(r'\{.*\}', raw_content, re.DOTALL)
            if json_match:
                try:
                    return json.loads(json_match.group())
                except json.JSONDecodeError as e:
                    print(f"Error parsing JSON: {e}")
                    raise ValueError(f"LLM response is not valid JSON: {raw_content}")
            raise ValueError(f"No JSON found in LLM response: {raw_content}")

    @staticmethod
    def _response_text(content) -> str:
        if isinstance(content, str):
            return content
        if isinstance(content, list):
            parts = []
            for item in content:
                if isinstance(item, str):
                    parts.append(item)
                elif isinstance(item, dict) and "text" in item:
                    parts.append(item["text"])
            return "\n".join(parts)
        return str(content)
