import os
import re
import sys
import asyncio
import random
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
import google.generativeai as genai
from dotenv import load_dotenv

from app.schemas import ChatMessage, ChatResponse
from app.database import get_db
from app import models

load_dotenv()

router = APIRouter()

# Configure Gemini
api_key = os.getenv("GEMINI_API_KEY")
if api_key:
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel('gemini-2.5-flash')
else:
    model = None

@router.post("", response_model=ChatResponse)
async def chat_endpoint(chat_msg: ChatMessage, db: Session = Depends(get_db)):
    if not model:
        return ChatResponse(response="API Key not configured. Please set GEMINI_API_KEY in backend/.env")
    
    # Fetch User Settings
    settings = db.query(models.UserSettings).first()
    if not settings:
        settings = models.UserSettings(learning_mode="supportive")
        db.add(settings)
        db.commit()
    
    mode = settings.learning_mode
    
    # Context gathering
    mission_context = ""
    if chat_msg.current_mission_id:
        mission = db.query(models.PlanItem).filter(models.PlanItem.id == chat_msg.current_mission_id).first()
        if mission:
            mission_context = f"\n\n[現在取り組んでいるミッション: {mission.content}]\n"
            mission_context += f"このユーザーの現在の理解度スコア: {mission.understanding_score}/100\n"
            mission_context += "ユーザーがこのミッションの内容を理解しているか、対話を通じて評価してください。"

    # Define Persona and Rules based on mode
    if mode == "exam":
        system_instr = (
            "あなたは進学塾のトップ講師です（受験モード）。\n"
            "生徒が『初見の入試問題』を解ける実力があるか、一切の妥協なく厳格に審査してください。\n"
            "【評価基準】\n"
            "- 論理性、正確性、および『自分の言葉』での説明能力を最重視します。\n"
            "- 完了（80%以上）には、試験会場で自力で正解を導き出せる確信が必要です。\n"
            "- 回答の最後に必ず [[SCORE: 数値]] (0-100) を付与してください。"
        )
    else:
        system_instr = (
            "あなたは優しい学習メンターです（支援モード）。\n"
            "生徒のやる気を引き出し、小さな成長やメタ認知（わからないと言えたこと）を褒めてください。\n"
            "【評価基準】\n"
            "- 努力・参加 (0-40%): 質問、対話への応答、ヒントを元に考えたプロセスを高く評価します。\n"
            "- 理解・気づき (40-100%): 自分の言葉での説明ができたら、積極的にスコアを上げてください。\n"
            "- 完了閾値（60%）を目指して、優しくガイドしてください。\n"
            "- 回答の最後に必ず [[SCORE: 数値]] (0-100) を付与してください。"
        )

    full_prompt = f"{system_instr}{mission_context}\n\nユーザー: {chat_msg.message}"
    
    max_retries = 5
    for attempt in range(max_retries):
        try:
            response = await model.generate_content_async(full_prompt)
            raw_text = response.text
            
            # Extract score
            score = None
            score_match = re.search(r"\[\[SCORE:\s*(\d+)\]\]", raw_text)
            if score_match:
                score = int(score_match.group(1))
                # Remove the score tag from the public response
                clean_text = re.sub(r"\[\[SCORE:\s*\d+\]\]", "", raw_text).strip()
            else:
                clean_text = raw_text

            # Update DB if score found and mission exists
            if score is not None and chat_msg.current_mission_id:
                mission = db.query(models.PlanItem).filter(models.PlanItem.id == chat_msg.current_mission_id).first()
                if mission:
                    # Score is cumulative
                    if score > mission.understanding_score:
                        mission.understanding_score = score
                        db.commit()

            return ChatResponse(response=clean_text, understanding_score=score)
            
        except Exception as e:
            error_str = str(e)
            if "429" in error_str and attempt < max_retries - 1:
                wait_time = 2 * (2 ** attempt) + random.uniform(0, 1)
                await asyncio.sleep(wait_time)
                continue
            
            print(f"CHAT ENDPOINT ERROR: {e}", file=sys.stderr, flush=True) 
            raise HTTPException(status_code=500, detail=str(e))
