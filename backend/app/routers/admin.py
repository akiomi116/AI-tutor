from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from app import models, schemas
from app.database import get_db
from app.deps import get_current_user

router = APIRouter()

@router.get("/logs", response_model=List[schemas.AdminLogItem])
def get_admin_logs(
    username: Optional[str] = None,
    session_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # In a real app, we check if current_user.is_admin is True here
    
    query = db.query(
        models.ChatMessage.id,
        models.ChatMessage.role,
        models.ChatMessage.content,
        models.ChatMessage.image_url,
        models.ChatMessage.understanding_score,
        models.ChatMessage.mission_id,
        models.ChatMessage.created_at,
        models.User.username.label("username")
    ).join(models.User, models.ChatMessage.user_id == models.User.id)

    if username:
        query = query.filter(models.User.username == username)
    if session_id:
        query = query.filter(models.ChatMessage.session_id == session_id)

    logs = query.order_by(models.ChatMessage.created_at.desc()).all()
    return logs
