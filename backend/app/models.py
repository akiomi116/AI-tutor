from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, Text, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    created_at = Column(DateTime, default=datetime.now)

    plans = relationship("Plan", back_populates="user")
    memos = relationship("Memo", back_populates="user")
    settings = relationship("UserSettings", back_populates="user")
    chat_messages = relationship("ChatMessage", back_populates="user")
    upload_sessions = relationship("UploadSession", back_populates="user")

class Plan(Base):
    __tablename__ = "plans"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    title = Column(String, index=True)
    target = Column(String)  # e.g. "To pass the exam"
    created_at = Column(DateTime, default=datetime.now)
    
    user = relationship("User", back_populates="plans")
    items = relationship("PlanItem", back_populates="plan", cascade="all, delete-orphan")

class PlanItem(Base):
    __tablename__ = "plan_items"

    id = Column(Integer, primary_key=True, index=True)
    plan_id = Column(Integer, ForeignKey("plans.id"))
    content = Column(String)
    priority = Column(Integer, default=2) # 1: High, 2: Medium, 3: Low
    due_date = Column(DateTime, nullable=True)
    is_completed = Column(Boolean, default=False)
    understanding_score = Column(Integer, default=0) # 0-100
    last_result = Column(Text, nullable=True) # AI-extracted quantitative result
    
    plan = relationship("Plan", back_populates="items")

class Memo(Base):
    __tablename__ = "memos"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    content = Column(Text)
    created_at = Column(DateTime, default=datetime.now)

    user = relationship("User", back_populates="memos")

class UserSettings(Base):
    __tablename__ = "user_settings"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    learning_mode = Column(String, default="supportive") # "exam" or "supportive"

    user = relationship("User", back_populates="settings")

class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    session_id = Column(String, index=True)
    role = Column(String) # "user" or "assistant"
    content = Column(Text)
    image_url = Column(String, nullable=True)
    understanding_score = Column(Integer, nullable=True)
    mission_id = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.now)

    user = relationship("User", back_populates="chat_messages")

class UploadSession(Base):
    __tablename__ = "upload_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    session_id = Column(String, unique=True, index=True)
    has_image = Column(Boolean, default=False)
    image_path = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.now)

    user = relationship("User", back_populates="upload_sessions")
