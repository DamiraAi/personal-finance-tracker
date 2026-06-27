from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
from typing import Optional

# Импортируем твои модели и типы перечислений (Enums)
from database import get_db
from models import Transaction, Category, User, TransactionType
from auth import get_current_user

router = APIRouter(prefix="/report", tags=["Reports"])

@router.get("")
def get_report(
    period: str = "week",
    start_date: Optional[str] = None, 
    end_date: Optional[str] = None, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # 1. Логика фильтрации дат
    now = datetime.utcnow()
    
    if start_date and end_date:
        try:
            start = datetime.strptime(start_date, "%Y-%m-%d")
            end = datetime.strptime(end_date, "%Y-%m-%d").replace(hour=23, minute=59, second=59)
        except ValueError:
            raise HTTPException(status_code=400, detail="Неверный формат даты. Используйте ГГГГ-ММ-ДД")
    else:
        end = now
        if period == "week":
            start = now - timedelta(days=7)
        elif period == "month":
            start = now - timedelta(days=30)
        elif period == "year":
            start = now - timedelta(days=365)
        else:
            start = now - timedelta(days=7)

    # 2. Привязываем фильтры к реальным объектам Enum из модели TransactionType
    incoming_types = [
        TransactionType.income, 
        TransactionType.loan_taken, 
        TransactionType.loan_repaid_to_us
    ]
    
    outgoing_types = [
        TransactionType.expense, 
        TransactionType.loan_given, 
        TransactionType.loan_repaid_by_us
    ]

    # 3. Считаем общий приток денег (Total Income)
    total_income = db.query(func.sum(Transaction.amount))\
        .filter(
            Transaction.user_id == current_user.id,
            Transaction.type.in_(incoming_types),
            Transaction.date >= start,
            Transaction.date <= end
        ).scalar() or 0.0

    # 4. Считаем общий отток денег (Total Expense)
    total_expense = db.query(func.sum(Transaction.amount))\
        .filter(
            Transaction.user_id == current_user.id,
            Transaction.type.in_(outgoing_types),
            Transaction.date >= start,
            Transaction.date <= end
        ).scalar() or 0.0

    # 5. Считаем расходы по категориям (делаем LEFT JOIN, чтобы учесть долги, у которых нет категории)
    expense_by_categories = db.query(Category.name, func.sum(Transaction.amount))\
        .select_from(Transaction)\
        .join(Category, Transaction.category_id == Category.id, isouter=True)\
        .filter(
            Transaction.user_id == current_user.id,
            Transaction.type.in_(outgoing_types),
            Transaction.date >= start,
            Transaction.date <= end
        )\
        .group_by(Category.name)\
        .all()

    categories_data = []
    for name, total in expense_by_categories:
        # Если категория пустая (для транзакций долгов), пишем понятное имя
        cat_name = name if name else "Долги / Кредиты"
        categories_data.append({
            "name": cat_name,
            "value": float(total)
        })

    # 6. Собираем данные по дням для трендов
    income_by_day = db.query(func.date(Transaction.date), func.sum(Transaction.amount))\
        .filter(
            Transaction.user_id == current_user.id,
            Transaction.type.in_(incoming_types),
            Transaction.date >= start,
            Transaction.date <= end
        )\
        .group_by(func.date(Transaction.date)).all()

    expense_by_day = db.query(func.date(Transaction.date), func.sum(Transaction.amount))\
        .filter(
            Transaction.user_id == current_user.id,
            Transaction.type.in_(outgoing_types),
            Transaction.date >= start,
            Transaction.date <= end
        )\
        .group_by(func.date(Transaction.date)).all()

    # 7. Объединяем доходы и расходы по дням
    trends_dict = {}
    for date_val, amount in income_by_day:
        date_str = date_val.strftime("%Y-%m-%d") if hasattr(date_val, 'strftime') else str(date_val)
        trends_dict[date_str] = {"date": date_str, "Income": float(amount), "Expense": 0.0}
        
    for date_val, amount in expense_by_day:
        date_str = date_val.strftime("%Y-%m-%d") if hasattr(date_val, 'strftime') else str(date_val)
        if date_str in trends_dict:
            trends_dict[date_str]["Expense"] = float(amount)
        else:
            trends_dict[date_str] = {"date": date_str, "Income": 0.0, "Expense": float(amount)}

    sorted_dates = sorted(trends_dict.keys())
    daily_data = []
    running_balance = 0.0

    for date_str in sorted_dates:
        day_data = trends_dict[date_str]
        day_net = day_data["Income"] - day_data["Expense"]
        running_balance += day_net
        
        daily_data.append({
            "date": date_str,
            "Income": day_data["Income"],
            "Expense": day_data["Expense"],
            "Balance": round(running_balance, 2)
        })

    if not daily_data:
        daily_data = [
            {"date": start.strftime("%Y-%m-%d"), "Expense": 0.0, "Income": 0.0, "Balance": 0.0},
            {"date": end.strftime("%Y-%m-%d"), "Expense": 0.0, "Income": 0.0, "Balance": 0.0}
        ]

    return {
        "total_income": float(total_income),
        "total_expense": float(total_expense),
        "net": float(total_income - total_expense),
        "daily_data": daily_data,
        "categories_data": categories_data 
    }