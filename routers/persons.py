from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import models
import schemas

# Исправляем импорт get_db из database, как договаривались ранее
from database import get_db 
from auth import get_current_user

router = APIRouter()

# =====================================================
# PERSONS
# =====================================================

@router.post("/persons")
def create_person(
    person: schemas.Person,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    # Привязываем создаваемый контакт к текущему вошедшему пользователю
    db_person = models.Person(
        name=person.name,
        contact=person.contact,
        user_id=current_user.id  # Убедись, что в модели Person есть это поле!
    )

    db.add(db_person)
    db.commit()
    db.refresh(db_person)

    return db_person


@router.get("/persons")
def get_persons(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    # Профессиональный трекер: каждый видит ТОЛЬКО своих контрагентов
    return db.query(models.Person).filter(
        models.Person.user_id == current_user.id
    ).all()