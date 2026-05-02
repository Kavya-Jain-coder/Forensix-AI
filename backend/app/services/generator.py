import os
import json
import re
from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage
from dotenv import load_dotenv

load_dotenv()

class ReportGenerator:
    def __init__(self):
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            raise ValueError("GROQ_API_KEY is not configured.")

        model = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
        print(f"[INFO] Using Groq model: {model}")
        self.llm = ChatGroq(model=model, api_key=api_key, temperature=0.3)

    async def generate(self, context: str, filenames: list[str] = None, case_meta: dict = None):
        exhibit_hint = ""
        if filenames:
            exhibit_hint = f"The submitted evidence files are: {', '.join(filenames)}."

        meta = case_meta or {}
        officer = meta.get("officer_in_charge") or "[to be assigned]"
        submitted = meta.get("submitted_by") or "Forensic Submissions Unit"
        exam_date = meta.get("date_of_examination") or "[today's date]"

        prompt_text = f"""You are a senior forensic scientist writing an official forensic laboratory report. Your report must read like a real forensic document — formal, precise, written in third-person narrative prose, referencing specific exhibit labels, sample identifiers, and scientific methodology.

{exhibit_hint}

EVIDENCE CONTENT:
{context}

The following case details have been provided by the submitting officer and MUST be used exactly as given — do not change or infer alternatives:
- Officer in Charge: {officer}
- Submitted By: {submitted}
- Date of Examination: {exam_date}

Generate a detailed forensic report in the following JSON structure. Every field must be substantive and specific to the evidence provided — do NOT use generic placeholder text.

Return ONLY valid JSON:
{{
  "report_number": "FR-2024-XXXX (generate a realistic report number)",
  "classification": "OFFICIAL — FORENSIC SCIENCE LABORATORY REPORT",
  "officer_in_charge": "{officer}",
  "submitted_by": "{submitted}",
  "date_of_examination": "{exam_date}",
  "exhibits": [
    {{"exhibit_ref": "e.g. SJM/1", "description": "Detailed description of the item", "condition": "e.g. Good / Sealed / Degraded"}}
  ],
  "background": "2-3 sentences of case background inferred from the evidence. Who are the subjects? What is the nature of the case?",
  "examination_narrative": "Write 3-5 paragraphs of formal forensic narrative. Describe what was examined, the methodology used (e.g. DNA profiling, fingerprint analysis, digital forensics, toxicology), what was found on each exhibit, and how findings relate to each other. Use formal language like 'A DNA profile was obtained from...', 'Examination of exhibit X revealed...', 'The results are consistent with...'",
  "key_findings": [
    {{"finding_number": 1, "exhibit_ref": "exhibit reference", "finding": "Specific scientific finding in formal language", "significance": "critical|high|medium|low"}}
  ],
  "statistical_analysis": "If applicable, include likelihood ratios, probability statements, or statistical significance (e.g. 'The DNA profile is approximately 29 million times more likely if...'). If not applicable, write 'Not applicable to this examination.'",
  "conclusion": "2-3 sentences formal conclusion. State what the evidence supports or does not support. Use language like 'The findings are consistent with...', 'I am of the opinion that...'",
  "risk_level": "critical|high|medium|low",
  "recommendations": ["Specific actionable recommendation 1", "Specific actionable recommendation 2"],
  "examiner_statement": "I have examined the items listed above and the results of my examination are set out in this report. The opinions expressed are my own professional opinions based on the evidence examined.",
  "confidence_note": "Brief note on confidence level and any limitations of the analysis"
}}

CRITICAL RULES:
- officer_in_charge, submitted_by, and date_of_examination MUST match exactly what was provided above
- Use specific names, exhibit references, and case details from the evidence — never say 'Subject A' or 'the individual'
- examination_narrative must be at least 4 paragraphs of real forensic prose
- key_findings must have at least 3 entries, each tied to a specific exhibit
- Return ONLY the JSON object, no markdown, no extra text"""

        response = await self.llm.ainvoke([HumanMessage(content=prompt_text)])
        result = self._parse_json_response(response.content)
        print(f"[INFO] Report generated successfully")
        return result

    async def generate_from_images(self, image_paths: list[str], mime_types: list[str], filenames: list[str], case_meta: dict = None):
        exhibits_desc = "\n".join(
            f"- Exhibit {i+1}: {filenames[i]} (Type: {mime_types[i]})"
            for i in range(len(filenames))
        )

        context = f"""Visual forensic evidence submitted for examination.

Submitted Exhibits:
{exhibits_desc}

Note: These are image-based exhibits. OCR text extraction was not possible. 
Examination is based on the submitted visual evidence files. 
A detailed physical/visual examination of each exhibit is required."""

        return await self.generate(context, filenames, case_meta)

    def _parse_json_response(self, content):
        raw = self._response_text(content)
        raw = raw.replace('```json', '').replace('```', '').strip()
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            match = re.search(r'\{.*\}', raw, re.DOTALL)
            if match:
                try:
                    return json.loads(match.group())
                except json.JSONDecodeError as e:
                    raise ValueError(f"LLM response is not valid JSON: {e}")
            raise ValueError(f"No JSON found in LLM response: {raw[:200]}")

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
