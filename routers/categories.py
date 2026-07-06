from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_
from pydantic import BaseModel

import models
from database import get_db
from auth import get_current_user

router = APIRouter()


class CategoryCreate(BaseModel):
    name: str
    type: str


@router.get("/categories")
def get_categories(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return db.query(models.Category).filter(
        or_(
            models.Category.user_id == None,
            models.Category.user_id == current_user.id,
        )
    ).all()


@router.post("/categories")
def create_category(
    category_data: CategoryCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    name = category_data.name.strip()

    if not name:
        raise HTTPException(status_code=400, detail="Category name is required")
    if category_data.type not in ["income", "expense"]:
        raise HTTPException(status_code=400, detail="Category type must be income or expense")

    existing = db.query(models.Category).filter(
        models.Category.name == name,
        models.Category.user_id == current_user.id,
    ).first()

    if existing:
        raise HTTPException(status_code=400, detail="Category already exists")

    
    db_category = models.Category(
        name=name,
        type=category_data.type,
        user_id=current_user.id,
    )

    db.add(db_category)
    db.commit()
    db.refresh(db_category)

    return db_category