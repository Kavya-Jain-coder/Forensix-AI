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

        model = os.getenv("GROQ_MODEL", "mixtral-8x7b-32768")
        print(f"[INFO] Using Groq model: {model}")
        self.llm = ChatGroq(
            model=model,
            api_key=api_key,
            temperature=0.7,
        )

    async def generate(self, context: str):
        prompt = ChatPromptTemplate.from_template("""You are a senior forensic analyst. Analyze the evidence and generate a COMPLETE structured forensic report.

EVIDENCE:
{context}

RESPOND WITH ONLY VALID JSON (no markdown, no explanation):
{{
  "case_summary": "2-3 sentence executive summary of the evidence and findings",
  "key_findings": [
    {{"title": "Finding title", "description": "Detailed description of the finding", "severity": "critical"}},
    {{"title": "Finding title", "description": "Detailed description of the finding", "severity": "high"}},
    {{"title": "Finding title", "description": "Detailed description of the finding", "severity": "medium"}}
  ],
  "evidence_extracted": ["Key evidence point 1", "Key evidence point 2", "Key evidence point 3"],
  "risk_level": "high",
  "recommendations": ["Actionable recommendation 1", "Actionable recommendation 2"],
  "technical_notes": "Additional technical details or observations"
}}

REQUIREMENTS:
- Generate EXACTLY this structure with ALL fields
- case_summary: 50-150 words, objective summary
- key_findings: MUST have minimum 2-3 findings, each with title (max 50 chars), detailed description (100-300 chars), severity (critical|high|medium|low|none)
- evidence_extracted: List 3-5 specific evidence items from the context
- risk_level: Assess overall risk as critical|high|medium|low|none
- recommendations: Provide 2-3 specific, actionable recommendations
- technical_notes: Any additional technical observations (100-200 chars)
- Be factual and only use information from the provided context
- Avoid hallucinations or made-up details""")
        
        chain = prompt | self.llm
        response = await chain.ainvoke({"context": context})
        return self._parse_json_response(response.content)

    async def generate_from_image(self, image_path: str, mime_type: str):
        with open(image_path, "rb") as image_file:
            image_data = base64.b64encode(image_file.read()).decode("utf-8")

        message = HumanMessage(
            content=[
                {
                    "type": "text",
                    "text": """You are a senior forensic analyst analyzing visual evidence. Generate a COMPLETE structured forensic report.

RESPOND WITH ONLY VALID JSON (no markdown):
{
  "case_summary": "2-3 sentence summary of what is visible in the image",
  "key_findings": [
    {"title": "Finding from image", "description": "What was observed", "severity": "high"},
    {"title": "Finding from image", "description": "What was observed", "severity": "medium"},
    {"title": "Finding from image", "description": "What was observed", "severity": "medium"}
  ],
  "evidence_extracted": ["Observable evidence 1", "Observable evidence 2", "Observable evidence 3"],
  "risk_level": "high",
  "recommendations": ["Investigation recommendation 1", "Investigation recommendation 2"],
  "technical_notes": "Visual observations and image analysis notes"
}

REQUIREMENTS:
- Minimum 2-3 key findings with severity levels
- 3-5 evidence items visible in the image
- Do NOT identify faces or real people
- Be specific about what is observable
- Include measurement scales if visible
- Note any text visible in the image
- Describe container/evidence bag labels if visible""",
                },
                {
                    "type": "image_url",
                    "image_url": f"data:{mime_type};base64,{image_data}",
                },
            ]
        )
        response = await self.llm.ainvoke([message])
        return self._parse_json_response(response.content)

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
