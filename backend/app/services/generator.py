import os
import json
import re
import base64
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.messages import HumanMessage
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
        with open(image_path, "rb") as image_file:
            image_data = base64.b64encode(image_file.read()).decode("utf-8")

        # Use Llama 3.2 Vision for image analysis (Mixtral doesn't support vision)
        vision_llm = ChatGroq(
            model="llama-3.2-11b-vision-preview",
            api_key=os.getenv("GROQ_API_KEY"),
            temperature=0.7,
        )

        message = HumanMessage(
            content=[
                {
                    "type": "text",
                    "text": """You are a senior forensic analyst analyzing visual evidence. Generate a COMPLETE structured forensic report with ALL fields.

Return ONLY valid JSON (no markdown, no extra text):
{
  "case_summary": "2-3 sentence summary of what is visible in the image",
  "key_findings": [
    {"title": "Finding title", "description": "Detailed observation", "severity": "high"},
    {"title": "Finding title", "description": "Detailed observation", "severity": "medium"},
    {"title": "Finding title", "description": "Detailed observation", "severity": "medium"}
  ],
  "evidence_extracted": ["Evidence 1 visible in image", "Evidence 2 visible in image", "Evidence 3 visible in image"],
  "risk_level": "high",
  "recommendations": ["Recommendation 1", "Recommendation 2"],
  "technical_notes": "Visual analysis observations"
}

CRITICAL REQUIREMENTS:
- ALWAYS include ALL 6 fields
- key_findings: MUST have exactly 3 findings minimum
- evidence_extracted: MUST have 3-5 items
- risk_level: Use one of: critical, high, medium, low, none
- recommendations: MUST have 2-3 items
- Do NOT identify faces or real people""",
                },
                {
                    "type": "image_url",
                    "image_url": f"data:{mime_type};base64,{image_data}",
                },
            ]
        )
        response = await vision_llm.ainvoke([message])
        result = self._parse_json_response(response.content)
        print(f"[INFO] Image analysis result: {json.dumps(result, indent=2)}")
        return result

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
