from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Debt, Transaction, Person, DebtType, DebtStatus, TransactionType

router = APIRouter(prefix="/debts", tags=["Debts"])

# 1. ФУНКЦИЯ ЧАСТИЧНОГО ИЛИ ПОЛНОГО ВОЗВРАТА ДОЛГА
@router.post("/{debt_id}/repay")
def repay_debt(
    debt_id: int, 
    amount_to_pay: float, 
    wallet_id: int, 
    user_id: int, 
    db: Session = Depends(get_db)
):
    # Находим долг
    debt = db.query(Debt).filter(Debt.id == debt_id).first()
    if not debt:
        raise HTTPException(status_code=404, detail="Долг не найден")
    if debt.status == DebtStatus.closed:
        return {"message": "Этот долг уже закрыт"}

    # Проверяем, сколько уже было выплачено по этому долгу ранее
    repayments = db.query(Transaction).filter(
        Transaction.debt_id == debt_id,
        Transaction.type.in_([TransactionType.loan_repaid_by_us, TransactionType.loan_repaid_to_us])
    ).all()
    
    already_paid = sum(t.amount for t in repayments)
    remaining_before = debt.amount - already_paid

    if amount_to_pay > remaining_before:
        raise HTTPException(status_code=400, detail=f"Сумма платежа больше остатка долга ({remaining_before})")

    # Определяем тип транзакции возврата на основе типа долга
    t_type = TransactionType.loan_repaid_to_us if debt.type == DebtType.they_owe else TransactionType.loan_repaid_by_us

    # Создаем транзакцию возврата (чтобы баланс кошелька тоже изменился!)
    new_transaction = Transaction(
        amount=amount_to_pay,
        type=t_type,
        description=f"Частичный возврат по долгу #{debt_id}",
        person_id=debt.person_id,
        debt_id=debt.id,
        wallet_id=wallet_id,
        user_id=user_id
    )
    db.add(new_transaction)

    # Меняем баланс кошелька (при возврате нам — плюс, когда возвращаем мы — минус)
    wallet = new_transaction.wallet  # SQLAlchemy подтянет кошелек по wallet_id
    if wallet:
        if t_type == TransactionType.loan_repaid_to_us:
            wallet.balance += amount_to_pay
        else:
            wallet.balance -= amount_to_pay

    # Проверяем, закрылся ли долг полностью теперь
    if already_paid + amount_to_pay >= debt.amount:
        debt.status = DebtStatus.closed

    db.commit()
    
    return {
        "message": "Платеж успешно проведен",
        "осталось_вернуть": debt.amount - (already_paid + amount_to_pay),
        "статус_долга": debt.status
    }


# 2. ПОЛНЫЙ УМНЫЙ ОТЧЕТ: КОМУ И СКОЛЬКО ОСТАЛОСЬ
@router.get("/report")
def get_debts_report(user_id: int, db: Session = Depends(get_db)):
    # Находим все активные долги
    active_debts = db.query(Debt).filter(Debt.status == DebtStatus.active).all()
    
    they_owe_list = []
    we_owe_list = []
    
    for debt in active_debts:
        # Находим имя человека, если person_id привязан
        person_name = "Неизвестный контакт"
        if debt.person_id:
            person = db.query(Person).filter(Person.id == debt.person_id).first()
            if person:
                person_name = person.name
        
        # Считаем, сколько по этому долгу уже вернули
        repayments = db.query(Transaction).filter(
            Transaction.debt_id == debt.id,
            Transaction.type.in_([TransactionType.loan_repaid_by_us, TransactionType.loan_repaid_to_us])
        ).all()
        
        total_repaid = sum(t.amount for t in repayments)
        remaining = debt.amount - total_repaid
        
        debt_info = {
            "debt_id": debt.id,
            "имя": person_name,
            "изначальная_сумма": debt.amount,
            "сколько_вернули": total_repaid,
            "осталось_вернуть": remaining
        }
        
        if debt.type == DebtType.they_owe:
            they_owe_list.append(debt_info)
        else:
            we_owe_list.append(debt_info)
            
    return {
        "нам_должны (they_owe)": they_owe_list,
        "мы_должны (we_owe)": we_owe_list
    }