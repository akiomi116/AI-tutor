from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app import models, schemas
from app.database import get_db

router = APIRouter()

@router.post("", response_model=schemas.Memo)
def create_memo(memo: schemas.MemoCreate, db: Session = Depends(get_db)):
    db_memo = models.Memo(content=memo.content)
    db.add(db_memo)
    db.commit()
    db.refresh(db_memo)
    return db_memo

@router.get("", response_model=List[schemas.Memo])
def read_memos(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    memos = db.query(models.Memo).order_by(models.Memo.created_at.desc()).offset(skip).limit(limit).all()
    return memos

@router.delete("/{memo_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_memo(memo_id: int, db: Session = Depends(get_db)):
    memo = db.query(models.Memo).filter(models.Memo.id == memo_id).first()
    if memo is None:
        raise HTTPException(status_code=404, detail="Memo not found")
    
    db.delete(memo)
    db.commit()
    return None
