import os
import json
import re
import base64
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.messages import HumanMessage
from dotenv import load_dotenv

load_dotenv()

class ReportGenerator:
    def __init__(self):
        api_key = os.getenv("GOOGLE_API_KEY")
        if not api_key:
            raise ValueError("GOOGLE_API_KEY is not configured.")

        model = os.getenv("GOOGLE_GEMINI_MODEL", "gemini-2.5-flash")
        print(f"[INFO] Using Gemini model: {model}")
        self.llm = ChatGoogleGenerativeAI(
            model=model,
            google_api_key=api_key,
            temperature=0,
        )

    async def generate(self, context: str):
        prompt = ChatPromptTemplate.from_template("""
        You are a senior forensic analyst. Generate a structured report based ONLY on the provided evidence.
        Be objective, cautious, and technical.
        
        Evidence Context: {context}

        Return only a valid JSON object with these string keys:
        {{
          "case_summary": "Brief overview.",
          "observations": "Bullet points of raw findings.",
          "analysis": "Expert interpretation.",
          "limitations": "What is missing or uncertain.",
          "conclusion": "Final determination."
        }}
        """)
        
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
                    "text": """
                    You are a senior forensic analyst. Generate a structured report based ONLY on the provided image evidence.
                    Be objective, cautious, and technical. Describe visible evidence without identifying real people.

                    Return only a valid JSON object with these string keys:
                    {
                      "case_summary": "Brief overview.",
                      "observations": "Bullet points of visible raw findings.",
                      "analysis": "Expert interpretation.",
                      "limitations": "What is missing or uncertain from the image alone.",
                      "conclusion": "Final determination."
                    }
                    """,
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
