from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
from typing import Optional
import calendar
from models import Budget, CategoryType

from database import get_db
from models import Transaction, Category, User, TransactionType
from auth import get_current_user

router = APIRouter(prefix="/report", tags=["Reports"])

@router.get("")
def get_report(
    period: str = "week",
    start_date: Optional[str] = None, 
    end_date: Optional[str] = None,
    year: Optional[int] = None,   
    month: Optional[int] = None,  
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # 1. Логика фильтрации дат (с защитой от пустых строк с фронтенда)
    now = datetime.utcnow()
    
    # Если фронтенд прислал заполненные даты (не пустые и не None)
    if year and month:
        start = datetime(year, month, 1)
        if month == 12:
            end = datetime(year + 1, 1, 1) - timedelta(seconds=1)
        else:
            end = datetime(year, month + 1, 1) - timedelta(seconds=1)
    elif start_date and end_date and start_date.strip() and end_date.strip():
        
        try:
            start = datetime.strptime(start_date.strip(), "%Y-%m-%d")
            end = datetime.strptime(end_date.strip(), "%Y-%m-%d").replace(hour=23, minute=59, second=59)
        except ValueError:
            raise HTTPException(status_code=400, detail="invalid_date")
    else:
        # Приводим период к нижнему регистру на случай "Month" / "Week"
        p = period.lower().strip() if period else "week"
        
        end = now
        
        # >>> ИСПРАВЛЕНО: Расширена поддержка языков для периодов, 
        # чтобы бэкенд не сбоил при отправке 'week'/'month'/'year' на турецком или английском
        if p in ["week", "неделя", "hafta"]:
            start = now - timedelta(days=7)
        elif p in ["month", "месяц", "ay"]:
            start = now - timedelta(days=30)
        elif p in ["year", "год", "yıl"]:
            start = now - timedelta(days=365)
        else:
            start = now - timedelta(days=7)

    # 2. Привязываем фильтры к реальным объектам Enum
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

    # 5. Считаем расходы по категориям
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
        
    income_by_categories = db.query(Category.name, func.sum(Transaction.amount))\
        .select_from(Transaction)\
        .join(Category, Transaction.category_id == Category.id, isouter=True)\
        .filter(
            Transaction.user_id == current_user.id,
            Transaction.type.in_(incoming_types),
            Transaction.date >= start,
            Transaction.date <= end
        )\
        .group_by(Category.name)\
        .all()
        
    expense_list = [
        {"category_name": name if name else "no_category", "total_amount": float(total)}
        for name, total in expense_by_categories
    ]

    income_list = [
        {"category_name": name if name else "no_category", "total_amount": float(total)}
        for name, total in income_by_categories
    ]

    categories_data = []
    for name, total in expense_by_categories:
        cat_name = name if name else "debts_loans"
        categories_data.append({
            "name": cat_name,
            "value": float(total)
        })

    # 6. Собираем данные по дням для трендов (Оптимизировано под строки SQLite)
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

    # 7. Объединяем доходы и расходы по дням безопасно
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

    # =================================================================
    # >>> ИСПРАВЛЕНО: Вычисляем входящий остаток в кошельке ДО даты start,
    # чтобы баланс не сбрасывался в 0 при выборе недели/месяца/года
    # =================================================================
    previous_income = db.query(func.sum(Transaction.amount))\
        .filter(
            Transaction.user_id == current_user.id,
            Transaction.type.in_(incoming_types),
            Transaction.date < start  # Строго до начала выбранного периода
        ).scalar() or 0.0

    previous_expense = db.query(func.sum(Transaction.amount))\
        .filter(
            Transaction.user_id == current_user.id,
            Transaction.type.in_(outgoing_types),
            Transaction.date < start  # Строго до начала выбранного периода
        ).scalar() or 0.0

    # Стартуем расчет не с нуля, а с реального исторического остатка кошелька
    opening_balance = round(float(previous_income) - float(previous_expense), 2)
    # =================================================================

    sorted_dates = sorted(trends_dict.keys())
    daily_data = []
    
    # >>> ИСПРАВЛЕНО: Базовый баланс теперь равен входящему остатку на начало периода
    running_balance = opening_balance

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
            {"date": start.strftime("%Y-%m-%d"), "Expense": 0.0, "Income": 0.0, "Balance": round(opening_balance, 2)},
            {"date": end.strftime("%Y-%m-%d"), "Expense": 0.0, "Income": 0.0, "Balance": round(opening_balance, 2)}
        ]

    return {
        "total_income": float(total_income),
        "total_expense": float(total_expense),
        "net": float(total_income - total_expense),
        # >>> ИСПРАВЛЕНО: Добавлено поле входящего остатка в ответ для фронтенда
        "opening_balance": round(opening_balance, 2),
        "daily_data": daily_data,
        "categories_data": categories_data, 
        "income": income_list,      
        "expense": expense_list 
    }


@router.get("/insights")
def get_insights(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    now = datetime.utcnow()
 
    current_start = datetime(now.year, now.month, 1)
    days_in_month = calendar.monthrange(now.year, now.month)[1]
    current_end = datetime(now.year, now.month, days_in_month, 23, 59, 59)
    days_elapsed = (now.date() - current_start.date()).days + 1
    days_remaining = max(days_in_month - days_elapsed + 1, 1)
 
    if now.month == 1:
        prev_year, prev_month = now.year - 1, 12
    else:
        prev_year, prev_month = now.year, now.month - 1
    prev_start = datetime(prev_year, prev_month, 1)
    prev_days = calendar.monthrange(prev_year, prev_month)[1]
    prev_end = datetime(prev_year, prev_month, prev_days, 23, 59, 59)
 
    outgoing_types = [
        TransactionType.expense,
        TransactionType.loan_given,
        TransactionType.loan_repaid_by_us,
    ]
    incoming_types = [
        TransactionType.income,
        TransactionType.loan_taken,
        TransactionType.loan_repaid_to_us,
    ]
 
    expense_this_month = float(db.query(func.sum(Transaction.amount)).filter(
        Transaction.user_id == current_user.id,
        Transaction.type.in_(outgoing_types),
        Transaction.date >= current_start,
        Transaction.date <= current_end,
    ).scalar() or 0.0)
 
    income_this_month = float(db.query(func.sum(Transaction.amount)).filter(
        Transaction.user_id == current_user.id,
        Transaction.type.in_(incoming_types),
        Transaction.date >= current_start,
        Transaction.date <= current_end,
    ).scalar() or 0.0)
 
    this_month_by_cat = {
        row.category_id: {"name": row.name, "amount": float(row.amount)}
        for row in db.query(
            Transaction.category_id,
            Category.name,
            func.sum(Transaction.amount).label("amount"),
        )
        .select_from(Transaction)
        .join(Category, Transaction.category_id == Category.id)
        .filter(
            Transaction.user_id == current_user.id,
            Transaction.type.in_(outgoing_types),
            Transaction.date >= current_start,
            Transaction.date <= current_end,
        )
        .group_by(Transaction.category_id, Category.name)
        .all()
    }
 
    last_month_by_cat = {
        row.category_id: float(row.amount)
        for row in db.query(
            Transaction.category_id,
            func.sum(Transaction.amount).label("amount"),
        )
        .select_from(Transaction)
        .filter(
            Transaction.user_id == current_user.id,
            Transaction.type.in_(outgoing_types),
            Transaction.date >= prev_start,
            Transaction.date <= prev_end,
        )
        .group_by(Transaction.category_id)
        .all()
    }
 
    budgets = db.query(Budget).filter(Budget.user_id == current_user.id).all()
    total_budget = sum(b.monthly_limit for b in budgets)
 
    daily_allowance = None
    daily_allowance_note = None 
 
    if total_budget > 0:
        remaining_budget = total_budget - expense_this_month
        daily_allowance = round(remaining_budget / days_remaining, 2)
        if daily_allowance < 0:
            daily_allowance_note = "budget_already_exceeded"
    else:
        daily_allowance_note = "set_budget"
 
    insights = []
 
    for b in budgets:
        cat_data = this_month_by_cat.get(b.category_id)
        cat_name = cat_data["name"] if cat_data else None
        spent = cat_data["amount"] if cat_data else 0.0
 
        if not cat_name or b.monthly_limit <= 0:
            continue
 
        pct = (spent / b.monthly_limit) * 100
        if pct >= 100:
            insights.append({
                "key": "budget_exceeded",
                "params": {
                    "category": cat_name,
                    "spent": round(spent),
                    "limit": round(b.monthly_limit),
                },
            })
        elif pct >= 80:
            insights.append({
                "key": "budget_used",
                "params": {"category": cat_name, "percent": round(pct)},
            })
 
    for cat_id, data in this_month_by_cat.items():
        prev_amount = last_month_by_cat.get(cat_id, 0.0)
        if prev_amount and prev_amount > 0:
            change_pct = ((data["amount"] - prev_amount) / prev_amount) * 100
            if change_pct >= 20:
                insights.append({
                    "key": "expense_growing",
                    "params": {"category": data["name"], "percent": round(change_pct)},
                })
 
    if income_this_month > 0 and expense_this_month > income_this_month:
        insights.append({"key": "expenses_exceed_income", "params": {}})
 
    if this_month_by_cat:
        top_cat_id, top_data = max(this_month_by_cat.items(), key=lambda x: x[1]["amount"])
        insights.append({
            "key": "top_category",
            "params": {"category": top_data["name"], "amount": round(top_data["amount"])},
        })
 
    if not insights:
        insights.append({"key": "not_enough_data", "params": {}})
 
    return {
        "days_remaining": days_remaining,
        "daily_allowance": daily_allowance,
        "daily_allowance_note": daily_allowance_note,
        "total_budget": total_budget,
        "expense_this_month": expense_this_month,
        "income_this_month": income_this_month,
        "insights": insights,
    }