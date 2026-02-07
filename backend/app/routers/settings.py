from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from .. import models, schemas
from ..database import get_db

router = APIRouter(tags=["settings"])

@router.get("", response_model=schemas.UserSettings)
def get_settings(db: Session = Depends(get_db)):
    settings = db.query(models.UserSettings).first()
    if not settings:
        # Create default settings if not exists
        settings = models.UserSettings(learning_mode="supportive")
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings

@router.put("", response_model=schemas.UserSettings)
def update_settings(settings_update: schemas.UserSettingsBase, db: Session = Depends(get_db)):
    settings = db.query(models.UserSettings).first()
    if not settings:
        settings = models.UserSettings(learning_mode=settings_update.learning_mode)
        db.add(settings)
    else:
        settings.learning_mode = settings_update.learning_mode
    
    db.commit()
    db.refresh(settings)
    return settings
