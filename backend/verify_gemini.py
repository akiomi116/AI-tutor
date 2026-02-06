import os
import google.generativeai as genai
from dotenv import load_dotenv

print("Loading environment...")
load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")

print(f"API Key present: {bool(api_key)}")
if api_key:
    print(f"API Key prefix: {api_key[:5]}...")
    try:
        genai.configure(api_key=api_key)
        print("Listing available models...")
        for m in genai.list_models():
            if 'generateContent' in m.supported_generation_methods:
                print(f"- {m.name}")
        
        # Fallback test with gemini-2.5-flash
        target_model = 'gemini-2.5-flash'
        print(f"\nTesting with {target_model}...")
        model = genai.GenerativeModel(target_model)
        response = model.generate_content("Hello")
        print(f"Response received: {response.text}")

    except Exception as e:
        print(f"CRITICAL ERROR: {e}")
        import traceback
        traceback.print_exc()
else:
    print("ERROR: GEMINI_API_KEY not found in .env")
