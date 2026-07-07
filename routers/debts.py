from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import models
import schemas
from auth import get_db, get_current_user

router = APIRouter(prefix="/debts", tags=["Debts"])

# 1. Получить все долги текущего пользователя (активные)
@router.get("")
@router.get("/")
def get_user_debts(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    return db.query(models.Debt)\
        .join(models.Person, models.Debt.person_id == models.Person.id)\
        .filter(models.Person.user_id == current_user.id, models.Debt.status == "active")\
        .all()


# 2. Создать нового человека (контакт для долга)
@router.post("/people")
def create_person(
    name: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    new_person = models.Person(name=name, user_id=current_user.id)
    db.add(new_person)
    db.commit()
    db.refresh(new_person)
    return new_person


# 3. Получить список всех людей пользователя
@router.get("/people")
def get_people(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    return db.query(models.Person).filter(models.Person.user_id == current_user.id).all()


# 4. СОЗДАНИЕ ДОЛГА
@router.post("")
@router.post("/")
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
        status=models.DebtStatus.active
    )

    db.add(db_debt)
    db.commit()
    db.refresh(db_debt)
    return db_debt


# 5. ФУНКЦИЯ ЧАСТИЧНОГО ИЛИ ПОЛНОГО ВОЗВРАТА ДОЛГА
@router.post("/{debt_id}/repay")
def repay_debt(
    debt_id: int, 
    amount_to_pay: float, 
    wallet_id: int, 
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    debt = db.query(models.Debt).filter(models.Debt.id == debt_id).first()
    if not debt:
        raise HTTPException(status_code=404, detail="Долг не найден")
    if debt.status == models.DebtStatus.closed:
        return {"message": "Этот долг уже закрыт"}

    repayments = db.query(models.Transaction).filter(
        models.Transaction.debt_id == debt_id,
        models.Transaction.type.in_([models.TransactionType.loan_repaid_by_us, models.TransactionType.loan_repaid_to_us])
    ).all()
    
    already_paid = sum(t.amount for t in repayments)
    remaining_before = debt.amount - already_paid

    if amount_to_pay > remaining_before:
        raise HTTPException(status_code=400, detail=f"Сумма платежа больше остатка долга ({remaining_before})")

    t_type = models.TransactionType.loan_repaid_to_us if debt.type == models.DebtType.they_owe else models.TransactionType.loan_repaid_by_us

    new_transaction = models.Transaction(
        amount=amount_to_pay,
        type=t_type,
        description=f"Частичный возврат по долгу #{debt_id}",
        person_id=debt.person_id,
        debt_id=debt.id,
        wallet_id=wallet_id,
        user_id=current_user.id
    )
    db.add(new_transaction)

    if hasattr(new_transaction, 'wallet') and new_transaction.wallet:
        if t_type == models.TransactionType.loan_repaid_to_us:
            new_transaction.wallet.balance += amount_to_pay
        else:
            new_transaction.wallet.balance -= amount_to_pay

    if already_paid + amount_to_pay >= debt.amount:
        debt.status = models.DebtStatus.closed

    db.commit()
    
    return {
        "message": "Платеж успешно проведен",
        "осталось_вернуть": debt.amount - (already_paid + amount_to_pay),
        "статус_долга": debt.status
    }


# 6. ПОЛНЫЙ УМНЫЙ ОТЧЕТ: КОМУ И СКОЛЬКО ОСТАЛОСЬ
@router.get("/report")
def get_debts_report(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    active_debts = db.query(models.Debt).filter(models.Debt.status == models.DebtStatus.active).all()
    
    they_owe_list = []
    we_owe_list = []
    
    for debt in active_debts:
        person_name = "Неизвестный контакт"
        if debt.person_id:
            person = db.query(models.Person).filter(models.Person.id == debt.person_id).first()
            if person:
                person_name = person.name
        
        repayments = db.query(models.Transaction).filter(
            models.Transaction.debt_id == debt.id,
            models.Transaction.type.in_([models.TransactionType.loan_repaid_by_us, models.TransactionType.loan_repaid_to_us])
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
        
        if debt.type == models.DebtType.they_owe:
            they_owe_list.append(debt_info)
        else:
            we_owe_list.append(debt_info)
            
    return {
        "нам_должны (they_owe)": they_owe_list,
        "мы_должны (we_owe)": we_owe_list
    }