from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List

class ChatMessage(BaseModel):
    message: str
    session_id: Optional[str] = None
    image_url: Optional[str] = None
    current_mission_id: Optional[int] = None

class ChatResponse(BaseModel):
    response: str
    understanding_score: Optional[int] = None

class SessionStatus(BaseModel):
    session_id: str
    has_image: bool
    image_path: Optional[str] = None

# --- Plan Schemas ---
class PlanItemBase(BaseModel):
    content: str
    priority: int = 2
    due_date: Optional[datetime] = None
    is_completed: bool = False
    understanding_score: int = 0

class PlanItemCreate(PlanItemBase):
    pass

class PlanItem(PlanItemBase):
    id: int
    plan_id: int

    class Config:
        from_attributes = True

class PlanBase(BaseModel):
    title: str
    target: Optional[str] = None

class PlanCreate(PlanBase):
    items: List[PlanItemCreate]

class Plan(PlanBase):
    id: int
    created_at: datetime
    items: List[PlanItem] = []

    class Config:
        from_attributes = True

# --- Memo Schemas ---
class MemoBase(BaseModel):
    content: str

class MemoCreate(MemoBase):
    pass

class Memo(MemoBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

# --- Settings Schemas ---
class UserSettingsBase(BaseModel):
    learning_mode: str = "supportive"

class UserSettings(UserSettingsBase):
    id: int

    class Config:
        from_attributes = True
