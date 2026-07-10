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
    # 1. Логика фильтрации дат
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
            raise HTTPException(status_code=400, detail="Неверный формат даты. Используйте ГГГГ-ММ-ДД")
    else:
        # Приводим период к нижнему регистру на случай "Month" / "Week"
        p = period.lower().strip() if period else "week"
        
        end = now
        if p in ["week", "неделя"]:
            start = now - timedelta(days=7)
        elif p in ["month", "месяц"]:
            start = now - timedelta(days=30)
        elif p in ["year", "год"]:
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
        {"category_name": name if name else "Без категории", "total_amount": float(total)}
        for name, total in expense_by_categories
    ]

    income_list = [
        {"category_name": name if name else "Без категории", "total_amount": float(total)}
        for name, total in income_by_categories
    ]


    categories_data = []
    for name, total in expense_by_categories:
        cat_name = name if name else "Долги / Кредиты"
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
        # Безопасное приведение к строке формата YYYY-MM-DD
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
 
    # --- Границы текущего и прошлого месяца ---
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
 
    # --- Общие суммы за текущий и прошлый месяц ---
    expense_this_month = db.query(func.sum(Transaction.amount)).filter(
        Transaction.user_id == current_user.id,
        Transaction.type.in_(outgoing_types),
        Transaction.date >= current_start,
        Transaction.date <= current_end,
    ).scalar() or 0.0
    expense_this_month = float(expense_this_month)
 
    income_this_month = db.query(func.sum(Transaction.amount)).filter(
        Transaction.user_id == current_user.id,
        Transaction.type.in_(incoming_types),
        Transaction.date >= current_start,
        Transaction.date <= current_end,
    ).scalar() or 0.0
    income_this_month = float(income_this_month)
 
    expense_last_month = db.query(func.sum(Transaction.amount)).filter(
        Transaction.user_id == current_user.id,
        Transaction.type.in_(outgoing_types),
        Transaction.date >= prev_start,
        Transaction.date <= prev_end,
    ).scalar() or 0.0
    expense_last_month = float(expense_last_month)
 
    # --- Расходы по категориям в этом и прошлом месяце (для сравнения) ---
    this_month_by_cat = dict(
        db.query(Category.name, func.sum(Transaction.amount))
        .select_from(Transaction)
        .join(Category, Transaction.category_id == Category.id)
        .filter(
            Transaction.user_id == current_user.id,
            Transaction.type.in_(outgoing_types),
            Transaction.date >= current_start,
            Transaction.date <= current_end,
        )
        .group_by(Category.name)
        .all()
    )
    last_month_by_cat = dict(
        db.query(Category.name, func.sum(Transaction.amount))
        .select_from(Transaction)
        .join(Category, Transaction.category_id == Category.id)
        .filter(
            Transaction.user_id == current_user.id,
            Transaction.type.in_(outgoing_types),
            Transaction.date >= prev_start,
            Transaction.date <= prev_end,
        )
        .group_by(Category.name)
        .all()
    )
 
    # --- Бюджеты пользователя ---
    budgets = db.query(Budget).filter(Budget.user_id == current_user.id).all()
    total_budget = sum(b.monthly_limit for b in budgets)
 
    # --- Прогноз "сколько можно тратить в день" ---
    daily_allowance = None
    daily_allowance_note = None
 
    if total_budget > 0:
        remaining_budget = total_budget - expense_this_month
        daily_allowance = round(remaining_budget / days_remaining, 2)
        if daily_allowance < 0:
            daily_allowance_note = "Бюджет уже превышен в этом месяце"
    else:
        daily_allowance_note = "Задайте хотя бы один бюджет по категории, чтобы увидеть дневной лимит"
 
    # --- Генерация текстовых инсайтов на основе правил ---
    insights = []
 
    # 1. Превышение бюджета по категориям
    for b in budgets:
        cat = db.query(Category).filter(Category.id == b.category_id).first()
        if not cat:
            continue
        spent = float(this_month_by_cat.get(cat.name, 0.0))
        if b.monthly_limit > 0:
            pct = (spent / b.monthly_limit) * 100
            if pct >= 100:
                insights.append(
                    f"⚠️ Бюджет по категории «{cat.name}» превышен: потрачено {spent:.0f} из {b.monthly_limit:.0f}"
                )
            elif pct >= 80:
                insights.append(
                    f"Вы использовали {pct:.0f}% бюджета по категории «{cat.name}»"
                )
 
    # 2. Рост расходов по категориям по сравнению с прошлым месяцем
    for cat_name, amount in this_month_by_cat.items():
        prev_amount = last_month_by_cat.get(cat_name, 0.0)
        amount = float(amount)
        if prev_amount and prev_amount > 0:
            change_pct = ((amount - prev_amount) / prev_amount) * 100
            if change_pct >= 20:
                insights.append(
                    f"Траты на «{cat_name}» выросли на {change_pct:.0f}% по сравнению с прошлым месяцем"
                )
 
    # 3. Расходы превышают доходы
    if income_this_month > 0 and expense_this_month > income_this_month:
        insights.append("Расходы в этом месяце превышают доходы")
 
    # 4. Самая крупная категория расходов в этом месяце
    if this_month_by_cat:
        top_category, top_amount = max(this_month_by_cat.items(), key=lambda x: x[1])
        insights.append(
            f"Больше всего в этом месяце потрачено на «{top_category}»: {float(top_amount):.0f}"
        )
 
    if not insights:
        insights.append("Пока недостаточно данных для инсайтов — добавьте больше транзакций")
 
    return {
        "days_remaining": days_remaining,
        "daily_allowance": daily_allowance,
        "daily_allowance_note": daily_allowance_note,
        "total_budget": total_budget,
        "expense_this_month": expense_this_month,
        "income_this_month": income_this_month,
        "insights": insights,
    }
 