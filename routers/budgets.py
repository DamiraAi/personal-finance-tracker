from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime
import calendar

import models
import schemas
from database import get_db
from auth import get_current_user

router = APIRouter(prefix="/budgets", tags=["Budgets"])


def _current_month_bounds():
    now = datetime.utcnow()
    start = datetime(now.year, now.month, 1)
    last_day = calendar.monthrange(now.year, now.month)[1]
    end = datetime(now.year, now.month, last_day, 23, 59, 59)
    return start, end


@router.post("", response_model=schemas.BudgetOut)
def create_or_update_budget(
    budget: schemas.BudgetCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    category = db.query(models.Category).filter(
        models.Category.id == budget.category_id,
        models.Category.user_id == current_user.id,
    ).first()

    # Меняем текст ошибки на ключ для локализации
    if category is None:
        raise HTTPException(status_code=404, detail="category_not_found")

    if category.type != models.CategoryType.expense:
        raise HTTPException(
            status_code=400,
            detail="budget_only_for_expenses",
        )

    # Если бюджет для этой категории уже есть — обновляем лимит, а не дублируем
    existing = db.query(models.Budget).filter(
        models.Budget.category_id == budget.category_id,
        models.Budget.user_id == current_user.id,
    ).first()

    if existing:
        existing.monthly_limit = budget.monthly_limit
        db.commit()
        db.refresh(existing)
        db_budget = existing
    else:
        db_budget = models.Budget(
            category_id=budget.category_id,
            user_id=current_user.id,
            monthly_limit=budget.monthly_limit,
        )
        db.add(db_budget)
        db.commit()
        db.refresh(db_budget)

    return _build_budget_out(db, db_budget, category)


@router.get("", response_model=list[schemas.BudgetOut])
def list_budgets(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    budgets = db.query(models.Budget).filter(
        models.Budget.user_id == current_user.id
    ).all()

    result = []
    for b in budgets:
        category = db.query(models.Category).filter(
            models.Category.id == b.category_id
        ).first()
        result.append(_build_budget_out(db, b, category))

    return result


@router.delete("/{budget_id}")
def delete_budget(
    budget_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    budget = db.query(models.Budget).filter(
        models.Budget.id == budget_id,
        models.Budget.user_id == current_user.id,
    ).first()

    # Меняем текст ошибки на ключ для локализации
    if budget is None:
        raise HTTPException(status_code=404, detail="budget_not_found")

    db.delete(budget)
    db.commit()
    return {"message": "budget_deleted"}


def _build_budget_out(db: Session, budget: models.Budget, category: models.Category) -> schemas.BudgetOut:
    start, end = _current_month_bounds()

    outgoing_types = [
        models.TransactionType.expense,
        models.TransactionType.loan_given,
        models.TransactionType.loan_repaid_by_us,
    ]

    spent = db.query(func.sum(models.Transaction.amount)).filter(
        models.Transaction.user_id == budget.user_id,
        models.Transaction.category_id == budget.category_id,
        models.Transaction.type.in_(outgoing_types),
        models.Transaction.date >= start,
        models.Transaction.date <= end,
    ).scalar() or 0.0

    spent = float(spent)
    remaining = budget.monthly_limit - spent
    percent_used = round((spent / budget.monthly_limit) * 100, 1) if budget.monthly_limit > 0 else 0.0

    return schemas.BudgetOut(
        id=budget.id,
        category_id=budget.category_id,
        # ИСХОДНАЯ ОШИБКА ЗДЕСЬ: заменяем "Без категории" на ключ "no_category"
        category_name=category.name if category else "no_category",
        monthly_limit=budget.monthly_limit,
        spent=spent,
        remaining=remaining,
        percent_used=percent_used,
    )