from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, Text, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base

class Plan(Base):
    __tablename__ = "plans"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    target = Column(String)  # e.g. "To pass the exam"
    created_at = Column(DateTime, default=datetime.now)
    
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
    
    plan = relationship("Plan", back_populates="items")

class Memo(Base):
    __tablename__ = "memos"

    id = Column(Integer, primary_key=True, index=True)
    content = Column(Text)
    created_at = Column(DateTime, default=datetime.now)

class UserSettings(Base):
    __tablename__ = "user_settings"

    id = Column(Integer, primary_key=True, index=True)
    learning_mode = Column(String, default="supportive") # "exam" or "supportive"
