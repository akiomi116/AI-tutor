import datetime
import uuid
import os
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from sqlalchemy.orm import Session
from app import models
from app.database import get_db
from app.schemas import SessionStatus
from app.deps import get_current_user
from typing import Dict

router = APIRouter()

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.get("/session/new", response_model=SessionStatus)
def create_session(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    session_id = str(uuid.uuid4())
    db_session = models.UploadSession(
        user_id=user.id,
        session_id=session_id,
        has_image=False,
        image_path=None
    )
    db.add(db_session)
    db.commit()
    return SessionStatus(session_id=session_id, has_image=False)

@router.get("/session/{session_id}/status", response_model=SessionStatus)
def get_session_status(session_id: str, db: Session = Depends(get_db)):
    db_session = db.query(models.UploadSession).filter(models.UploadSession.session_id == session_id).first()
    if not db_session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    return SessionStatus(
        session_id=session_id,
        has_image=db_session.has_image,
        image_path=db_session.image_path
    )

@router.post("/upload/{session_id}")
async def upload_image(session_id: str, file: UploadFile = File(...), db: Session = Depends(get_db)):
    db_session = db.query(models.UploadSession).filter(models.UploadSession.session_id == session_id).first()
    if not db_session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Save file
    file_extension = file.filename.split(".")[-1] if "." in file.filename else "jpg"
    file_name = f"{session_id}.{file_extension}"
    file_path = os.path.join(UPLOAD_DIR, file_name)
    
    try:
        with open(file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
            
        # Normalize path for web/URL usage (especially on Windows)
        web_path = file_path.replace("\\", "/")
            
        db_session.has_image = True
        db_session.image_path = web_path
        db.commit()
        
        return {"status": "success", "file_path": web_path}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/session/{session_id}/clear")
def clear_session_image(session_id: str, db: Session = Depends(get_db)):
    db_session = db.query(models.UploadSession).filter(models.UploadSession.session_id == session_id).first()
    if not db_session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    db_session.has_image = False
    db_session.image_path = None
    db.commit()
    
    return {"status": "success", "message": "Session image status cleared"}
