import os
import re
import sys
import asyncio
import random
from typing import List, Optional, Any
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
import google.generativeai as genai
from dotenv import load_dotenv

from app.schemas import ChatMessage, ChatResponse, ChatHistoryItem
from app.database import get_db
from app import models
from app.deps import get_current_user

load_dotenv()

router = APIRouter()

# Configure Gemini
api_key = os.getenv("GEMINI_API_KEY")
if api_key:
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel('gemini-2.0-flash') # Updated to 2.0-flash
else:
    model = None

@router.get("/history/{session_id}", response_model=List[ChatHistoryItem])
async def get_chat_history(
    session_id: str, 
    db: Session = Depends(get_db), 
    user: models.User = Depends(get_current_user)
):
    history = db.query(models.ChatMessage).filter(
        models.ChatMessage.user_id == user.id,
        models.ChatMessage.session_id == session_id
    ).order_by(models.ChatMessage.created_at.asc()).all()
    return history

@router.post("", response_model=ChatResponse)
async def chat_endpoint(
    chat_msg: ChatMessage, 
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user)
):
    if not model:
        return ChatResponse(response="API Key not configured. Please set GEMINI_API_KEY in backend/.env")
    
    # Save user message to DB
    user_msg_db = models.ChatMessage(
        user_id=user.id,
        session_id=chat_msg.session_id,
        role="user",
        content=chat_msg.message,
        image_url=chat_msg.image_url,
        mission_id=chat_msg.current_mission_id
    )
    db.add(user_msg_db)
    db.commit()

    # Fetch User Settings
    settings = db.query(models.UserSettings).filter(models.UserSettings.user_id == user.id).first()
    if not settings:
        settings = models.UserSettings(user_id=user.id, learning_mode="supportive")
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
    
    app_guide = (
        "\n【アプリの操作ガイド】\n"
        "- スマホ連携: 左下の『画像を同期』からQRを表示してスマホで撮影・送信すると、画面に画像が表示されます。\n"
        "- ミッション登録: AIの回答の下にある『📅 この内容をミッションに登録』ボタンから学習計画として保存できます。\n"
        "- メモ機能: 右下のペンアイコン（黄色）からクイックメモを作成・管理できます。\n"
        "- 学習モード: 左側のサイドバーで『支援』と『受験』を切り替えられます。\n"
        "- ミッション完了: 理解度スコアが目標（受験:80%, 支援:60%）を超えると、ダッシュボードの『完了』ボタンが有効になります。\n"
        "操作に関する質問には、これらの情報に基づいて家庭教師として優しく答えてください。"
    )

    # Define Persona and Rules based on Mode (Mission Focus vs Free Talk)
    if chat_msg.current_mission_id:
        # Mission Focus Mode: Coach / Evaluator
        if mode == "exam":
            system_instr = (
                "あなたは進学塾のトップ講師です（実績評価：受験モード）。\n"
                "現在取り組んでいるミッションの進捗報告を受け、厳格に審査してください。\n"
                "【評価基準】\n"
                "- 論理性、正確性、および『自分の言葉』での説明能力を最重視します。\n"
                "- 受験レベルで自力で解けると確信できるまで厳しく評価してください。\n"
                "- 報告の中に数値や具体的な成果があれば、回答のどこかに [[RESULT: サマリー]] (例: [[RESULT: 10問中8問正解]]) を含めてください。\n"
                "- 回答の最後に必ず [[SCORE: 数値]] (0-100) を付与してください。"
            )
        else:
            system_instr = (
                "あなたは優しいコーチです（実績評価：支援モード）。\n"
                "現在取り組んでいるミッションの進捗報告を受け、努力を褒めつつ理解度を確認してください。\n"
                "【評価基準】\n"
                "- 努力・参加を高く評価します。自分の言葉で説明できたらスコアを上げてください。\n"
                "- 完了閾値（60%）を目指して、優しくガイドしてください。\n"
                "- 報告の中に数値や具体的な成果があれば、回答のどこかに [[RESULT: サマリー]] (例: [[RESULT: 英単語を3つ覚えた]]) を含めてください。\n"
                "- 回答の最後に必ず [[SCORE: 数値]] (0-100) を付与してください。"
            )
    else:
        # Free Talk Mode: Learning Assistant / Mentor
        if mode == "exam":
            system_instr = (
                "あなたは知的な学習メンターです（フリートーク：受験モード）。\n"
                "生徒の疑問に対し、学術的・論理的な背景を含めて詳細に解説してください。\n"
                "このモードでは進捗評価（スコア付与）はせず、純粋な学習相談に乗ってください。\n"
                "※スコア付与記法 [[SCORE: XX]] は絶対に使用しないでください。"
            )
        else:
            system_instr = (
                "あなたは親しみやすい学習パートナーです（フリートーク：支援モード）。\n"
                "「わからない」という気持ちを大切にし、噛み砕いて優しく教えてあげてください。\n"
                "このモードでは進捗評価（スコア付与）はせず、楽しく対話してください。\n"
                "※スコア付与記法 [[SCORE: XX]] は絶対に使用しないでください。"
            )

    system_instr += app_guide

    # Fetch recent history for context (last 10 messages)
    history_text = ""
    if chat_msg.session_id:
        recent_history = db.query(models.ChatMessage).filter(
            models.ChatMessage.user_id == user.id,
            models.ChatMessage.session_id == chat_msg.session_id
        ).order_by(models.ChatMessage.created_at.desc()).limit(11).all()
        history_text = "\n".join([f"{m.role}: {m.content}" for m in reversed(recent_history)])
    
    # Prepare contents for Gemini
    content_parts = [system_instr + mission_context]
    if history_text:
        content_parts.append(f"\n\n【これまでの会話】\n{history_text}")
    
    # Add current image if available
    if chat_msg.image_url:
        try:
            filename = os.path.basename(chat_msg.image_url)
            local_path = os.path.join("uploads", filename)
            
            if os.path.exists(local_path):
                import PIL.Image
                img = PIL.Image.open(local_path)
                content_parts.append(img)
            else:
                print(f"Warning: Image path not found: {local_path}", file=sys.stderr)
        except Exception as e:
            print(f"Error loading image: {e}", file=sys.stderr)

    max_retries = 3
    for attempt in range(max_retries):
        try:
            # Pass the list of parts to Gemini
            response = await model.generate_content_async(content_parts)
            raw_text = response.text
            
            # Extract result
            res_val = None
            res_match = re.search(r"\[\[RESULT:\s*(.*?)\]\]", raw_text)
            if res_match:
                res_val = res_match.group(1).strip()
                clean_text = re.sub(r"\[\[RESULT:\s*.*?\]\]", "", raw_text).strip()
            else:
                clean_text = raw_text

            # Extract score
            score = None
            score_match = re.search(r"\[\[SCORE:\s*(\d+)\]\]", clean_text)
            if score_match:
                score = int(score_match.group(1))
                clean_text = re.sub(r"\[\[SCORE:\s*\d+\]\]", "", clean_text).strip()
            
            # Save assistant response to DB
            assistant_msg_db = models.ChatMessage(
                user_id=user.id,
                session_id=chat_msg.session_id,
                role="assistant",
                content=clean_text,
                understanding_score=score,
                mission_id=chat_msg.current_mission_id
            )
            db.add(assistant_msg_db)
            db.commit()

            # Update DB if score or result found and mission exists
            if (score is not None or res_val is not None) and chat_msg.current_mission_id:
                mission = db.query(models.PlanItem).filter(models.PlanItem.id == chat_msg.current_mission_id).first()
                if mission:
                    if score is not None:
                        mission.understanding_score = score
                    if res_val is not None:
                        mission.last_result = res_val
                    db.commit()

            return ChatResponse(response=clean_text, understanding_score=score, extracted_result=res_val)
            
        except Exception as e:
            error_str = str(e)
            print(f"Gemini API Error (Attempt {attempt+1}): {e}", file=sys.stderr)
            
            if "429" in error_str and attempt < max_retries - 1:
                wait_time = 2 * (2 ** attempt) + random.uniform(0, 1)
                await asyncio.sleep(wait_time)
                continue
            
            if attempt == max_retries - 1:
                raise HTTPException(status_code=500, detail=f"AIとの対話に失敗しました: {error_str}")
