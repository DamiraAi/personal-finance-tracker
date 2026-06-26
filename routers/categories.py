from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import models
from database import get_db
from auth import get_current_user
from pydantic import BaseModel

router = APIRouter()

# Схема для валидации приходящих данных
class CategoryCreate(BaseModel):
    name: str

# Получить все категории пользователя (и общие, если нужно)
@router.get("/categories")
def get_categories(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    # Возвращаем категории, которые создал этот пользователь
    categories = db.query(models.Category).filter(
        models.Category.user_id == current_user.id
    ).all()
    return categories

# Создать новую категорию
@router.post("/categories")
def create_category(
    category_data: CategoryCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    # Проверяем, нет ли уже категории с таким именем у этого пользователя
    existing = db.query(models.Category).filter(
        models.Category.name == category_data.name,
        models.Category.user_id == current_user.id
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Category already exists")

    db_category = models.Category(
        name=category_data.name,
        user_id=current_user.id
    )
    db.add(db_category)
    db.commit()
    db.refresh(db_category)
    return db_category