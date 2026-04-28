#!/usr/bin/env python3
"""Test if the Groq API key is valid"""
import os
from dotenv import load_dotenv

load_dotenv()

api_key = os.getenv("GROQ_API_KEY")
if not api_key:
    print("❌ GROQ_API_KEY not found in .env file")
    exit(1)

print(f"Testing Groq API key: {api_key[:10]}...")

try:
    from langchain_groq import ChatGroq
    from langchain_core.messages import HumanMessage
    
    model = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
    print(f"Using model: {model}")
    
    llm = ChatGroq(
        model=model,
        api_key=api_key,
        temperature=0.7,
    )
    
    # Test with a simple message
    message = HumanMessage(content="Say 'test successful' in one word")
    response = llm.invoke([message])
    
    print("✅ Groq API Key is VALID!")
    print(f"Response: {response.content}")
    
except Exception as e:
    print(f"❌ Groq API Key is INVALID!")
    print(f"Error: {e}")
    exit(1)
