#!/usr/bin/env python3
"""List available Groq models"""
import os
from dotenv import load_dotenv

load_dotenv()

api_key = os.getenv("GROQ_API_KEY")

try:
    from groq import Groq
    client = Groq(api_key=api_key)
    
    # List available models
    models = client.models.list()
    
    print("Available Groq Models:")
    print("=" * 60)
    for model in models.data:
        print(f"  • {model.id}")
    
except Exception as e:
    print(f"Error: {e}")
