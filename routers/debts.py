from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import models
import schemas

from auth import get_db, get_current_user

router = APIRouter()

# DEBTS
# =====================================================

@router.post("/debts")
def create_debt(
    debt: schemas.Debt,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):

    person = db.query(models.Person).filter(
        models.Person.id == debt.person_id
    ).first()

    if person is None:
        raise HTTPException(
            status_code=404,
            detail="Person not found"
        )

    db_debt = models.Debt(
        person_id=debt.person_id,
        amount=debt.amount,
        type=debt.type,
        status=schemas.DebtStatus.active
    )

    db.add(db_debt)
    db.commit()
    db.refresh(db_debt)

    return db_debt

@router.get("/debts")
def get_debts(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):

    return db.query(models.Debt).all()
