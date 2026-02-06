from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app import models, schemas
from app.database import get_db

router = APIRouter()

@router.post("", response_model=schemas.Plan)
def create_plan(plan: schemas.PlanCreate, db: Session = Depends(get_db)):
    db_plan = models.Plan(title=plan.title, target=plan.target)
    db.add(db_plan)
    db.commit()
    db.refresh(db_plan)
    
    for item in plan.items:
        db_item = models.PlanItem(plan_id=db_plan.id, content=item.content, is_completed=item.is_completed)
        db.add(db_item)
    
    db.commit()
    db.refresh(db_plan)
    return db_plan

@router.get("", response_model=List[schemas.Plan])
def read_plans(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    plans = db.query(models.Plan).order_by(models.Plan.created_at.desc()).offset(skip).limit(limit).all()
    return plans

@router.get("/{plan_id}", response_model=schemas.Plan)
def read_plan(plan_id: int, db: Session = Depends(get_db)):
    plan = db.query(models.Plan).filter(models.Plan.id == plan_id).first()
    if plan is None:
        raise HTTPException(status_code=404, detail="Plan not found")
    return plan

@router.put("/{plan_id}/items/{item_id}", response_model=schemas.PlanItem)
def update_plan_item(plan_id: int, item_id: int, item: schemas.PlanItemCreate, db: Session = Depends(get_db)):
    db_item = db.query(models.PlanItem).filter(models.PlanItem.id == item_id, models.PlanItem.plan_id == plan_id).first()
    if db_item is None:
        raise HTTPException(status_code=404, detail="Plan Item not found")
    
    db_item.is_completed = item.is_completed
    db.commit()
    db.refresh(db_item)
    return db_item

@router.delete("/{plan_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_plan(plan_id: int, db: Session = Depends(get_db)):
    plan = db.query(models.Plan).filter(models.Plan.id == plan_id).first()
    if plan is None:
        raise HTTPException(status_code=404, detail="Plan not found")
    
    db.delete(plan)
    db.commit()
    return None
