from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from .. import models, schemas
from ..database import get_db
from ..deps import get_current_user

router = APIRouter(tags=["settings"])

@router.get("", response_model=schemas.UserSettings)
def get_settings(
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user)
):
    settings = db.query(models.UserSettings).filter(models.UserSettings.user_id == user.id).first()
    if not settings:
        # Create default settings if not exists
        settings = models.UserSettings(user_id=user.id, learning_mode="supportive")
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings

@router.put("", response_model=schemas.UserSettings)
def update_settings(
    settings_update: schemas.UserSettingsBase, 
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user)
):
    settings = db.query(models.UserSettings).filter(models.UserSettings.user_id == user.id).first()
    if not settings:
        settings = models.UserSettings(user_id=user.id, learning_mode=settings_update.learning_mode)
        db.add(settings)
    else:
        settings.learning_mode = settings_update.learning_mode
    
    db.commit()
    db.refresh(settings)
    return settings
