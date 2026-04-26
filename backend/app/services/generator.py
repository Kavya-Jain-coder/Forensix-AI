import os
import json
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from dotenv import load_dotenv

import os

load_dotenv()
class ReportGenerator:
    def __init__(self):
        print("API KEY:", os.getenv("GOOGLE_API_KEY"))
        self.llm = ChatGoogleGenerativeAI(model="gemini-1.5-pro", google_api_key=os.getenv("GOOGLE_API_KEY"))

    async def generate(self, context: str):
        prompt = ChatPromptTemplate.from_template("""
        You are a senior forensic analyst. Generate a structured report based ONLY on the provided evidence.
        Be objective, cautious, and technical.
        
        Evidence Context: {context}

        Output the report strictly in JSON format with these keys:
        - case_summary: Brief overview.
        - observations: Bullet points of raw findings.
        - analysis: Expert interpretation.
        - limitations: What is missing or uncertain.
        - conclusion: Final determination.
        """)
        
        chain = prompt | self.llm
        response = await chain.ainvoke({"context": context})
        
        # Clean the response (handle potential markdown blocks)
        raw_content = response.content.replace('```json', '').replace('```', '').strip()
        
        return json.loads(raw_content)