from sqlalchemy.orm import Session
from fastapi import Depends
from app.database import get_db
from app import models

def get_current_user(db: Session = Depends(get_db)):
    # Simple logic for now: always use a default user
    user = db.query(models.User).filter(models.User.username == "demo_user").first()
    if not user:
        user = models.User(username="demo_user", email="demo@example.com")
        db.add(user)
        db.commit()
        db.refresh(user)
    return user
