import datetime
import uuid
import os
from fastapi import APIRouter, UploadFile, File, HTTPException
from app.schemas import SessionStatus
from typing import Dict

router = APIRouter()

# In-memory session store for MVP
# session_id -> { "has_image": bool, "image_path": str | None, "created_at": datetime }
sessions: Dict[str, dict] = {}

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.get("/session/new", response_model=SessionStatus)
def create_session():
    session_id = str(uuid.uuid4())
    sessions[session_id] = {
        "has_image": False,
        "image_path": None,
        "created_at": datetime.datetime.now()
    }
    return SessionStatus(session_id=session_id, has_image=False)

@router.get("/session/{session_id}/status", response_model=SessionStatus)
def get_session_status(session_id: str):
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session = sessions[session_id]
    return SessionStatus(
        session_id=session_id,
        has_image=session["has_image"],
        image_path=session["image_path"]
    )

@router.post("/upload/{session_id}")
async def upload_image(session_id: str, file: UploadFile = File(...)):
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Save file
    file_extension = file.filename.split(".")[-1] if "." in file.filename else "jpg"
    file_name = f"{session_id}.{file_extension}"
    file_path = os.path.join(UPLOAD_DIR, file_name)
    
    try:
        with open(file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
            
        sessions[session_id]["has_image"] = True
        sessions[session_id]["image_path"] = file_path
        
        return {"status": "success", "file_path": file_path}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
