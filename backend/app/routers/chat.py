import os
from fastapi import APIRouter, HTTPException
from app.schemas import ChatMessage, ChatResponse
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

router = APIRouter()

# Configure Gemini
api_key = os.getenv("GEMINI_API_KEY")
if api_key:
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel('gemini-2.5-flash')
else:
    model = None

import sys

import asyncio
import random

import re

@router.post("", response_model=ChatResponse)
async def chat_endpoint(chat_msg: ChatMessage):
    print(f"DEBUG: Received chat message: {chat_msg.message[:50]}...", file=sys.stderr, flush=True)
    
    if not model:
        print("DEBUG: Model is not configured", file=sys.stderr, flush=True)
        return ChatResponse(response="API Key not configured. Please set GEMINI_API_KEY in backend/.env")
    
    # Retry configuration
    max_retries = 5
    print("DEBUG: LOADED RETRY LOGIC V2 (Max 5 attempts)", file=sys.stderr, flush=True)
    
    for attempt in range(max_retries):
        try:
            # Generate content asynchronously
            response = await model.generate_content_async(chat_msg.message)
            print("DEBUG: Gemini response received successfully", file=sys.stderr, flush=True)
            return ChatResponse(response=response.text)
            
        except Exception as e:
            error_str = str(e)
            print(f"DEBUG: Attempt {attempt+1} failed with error: {error_str[:100]}...", file=sys.stderr, flush=True)
            
            # Check if it's a rate limit (429) error
            if "429" in error_str and attempt < max_retries - 1:
                wait_time = 5.0 # Default fallback
                
                # Try to extract the requested wait time from the error message
                # Pattern: "Please retry in 16.489711429s."
                match = re.search(r"retry in (\d+(\.\d+)?)s", error_str)
                if match:
                    wait_time = float(match.group(1)) + 1.0 # Add 1s buffer
                else:
                    # Exponential backoff if specific time not found
                    wait_time = 2 * (2 ** attempt) + random.uniform(0, 1)

                print(f"WARNING: Rate limit hit (429). Retrying in {wait_time:.2f}s...", file=sys.stderr, flush=True)
                await asyncio.sleep(wait_time)
                continue
            
            # If successful within retries, the loop returns. 
            # If we reach here, it's either not a 429 or we ran out of retries.
            print(f"CHAT ENDPOINT ERROR: {e}", file=sys.stderr, flush=True) 
            import traceback
            traceback.print_exc()
            raise HTTPException(status_code=500, detail=f"Gemini API Error: {str(e)}")
