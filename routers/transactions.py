from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import models
import schemas

from database import get_db  
from auth import get_current_user

router = APIRouter()


@router.post("/transactions")
def create_transaction(
    transaction: schemas.Transaction,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):

    if transaction.amount <= 0:
        raise HTTPException(
            status_code=400,
            detail="Amount must be positive"
        )

    # -------- WALLET --------

    wallet = db.query(models.Wallet).filter(
        models.Wallet.id == transaction.wallet_id,
        models.Wallet.user_id == current_user.id
    ).first()

    if wallet is None:
        raise HTTPException(
            status_code=404,
            detail="Wallet not found"
        )

    # -------- CATEGORY --------

    if transaction.category_id:

        category = db.query(models.Category).filter(
            models.Category.id == transaction.category_id
        ).first()

        if category is None:
            raise HTTPException(
                status_code=404,
                detail="Category not found"
            )

    # -------- PERSON --------

    if transaction.person_id:

        person = db.query(models.Person).filter(
            models.Person.id == transaction.person_id
        ).first()

        if person is None:
            raise HTTPException(
                status_code=404,
                detail="Person not found"
            )

    # -------- CREATE DEBT --------

    if transaction.type == schemas.TransactionType.loan_given:

        new_debt = models.Debt(
            person_id=transaction.person_id,
            amount=transaction.amount,
            type=schemas.DebtType.they_owe,
            status=schemas.DebtStatus.active
        )

        db.add(new_debt)

    elif transaction.type == schemas.TransactionType.loan_taken:

        new_debt = models.Debt(
            person_id=transaction.person_id,
            amount=transaction.amount,
            type=schemas.DebtType.we_owe,
            status=schemas.DebtStatus.active
        )

        db.add(new_debt)

    # -------- REPAY DEBT --------

    if transaction.type in [schemas.
        TransactionType.loan_repaid_to_us,
        schemas.TransactionType.loan_repaid_by_us
    ]:

        if transaction.debt_id is None:
            raise HTTPException(
                status_code=400,
                detail="Debt ID required"
            )

        debt = db.query(models.Debt).filter(
            models.Debt.id == transaction.debt_id
        ).first()

        if debt is None:
            raise HTTPException(
                status_code=404,
                detail="Debt not found"
            )

        if transaction.amount > debt.amount:
            raise HTTPException(
                status_code=400,
                detail="Amount exceeds debt"
            )

        debt.amount -= transaction.amount

        if debt.amount == 0:
            debt.status = schemas.DebtStatus.closed

    # -------- BALANCE --------

    if transaction.type in [
        "income",
        "loan_taken",
        "loan_repaid_to_us"
    ]:

        wallet.balance += transaction.amount

    elif transaction.type in [
        "expense",
        "loan_given",
        "loan_repaid_by_us"
    ]:

        if wallet.balance < transaction.amount:
            raise HTTPException(
                status_code=400,
                detail="Not enough balance"
            )

        wallet.balance -= transaction.amount

    # -------- SAVE --------

    db_transaction = models.Transaction(
        type=transaction.type,
        amount=transaction.amount,
        description=transaction.description,
        category_id=transaction.category_id,
        person_id=transaction.person_id,
        debt_id=transaction.debt_id,
        wallet_id=transaction.wallet_id,
        user_id=current_user.id
    )
    db.add(wallet)
    db.add(db_transaction)
    db.commit()
    db.refresh(db_transaction)

    return db_transaction


@router.get("/transactions")
def get_transactions(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):

    transactions = db.query(models.Transaction).filter(
        models.Transaction.user_id == current_user.id
    ).all()

    return transactions

@router.delete("/transactions/{transaction_id}")
def delete_transaction(
    transaction_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):

    transaction = db.query(models.Transaction).filter(
        models.Transaction.id == transaction_id,
        models.Transaction.user_id == current_user.id
    ).first()

    if transaction is None:
        raise HTTPException(
            status_code=404,
            detail="Transaction not found"
        )

    wallet = db.query(models.Wallet).filter(
        models.Wallet.id == transaction.wallet_id
    ).first()

    if transaction.type in [
        "income",
        "loan_taken",
        "loan_repaid_to_us"
    ]:

        wallet.balance -= transaction.amount

    elif transaction.type in [
        "expense",
        "loan_given",
        "loan_repaid_by_us"
    ]:

        wallet.balance += transaction.amount

    db.delete(transaction)

    db.commit()

    return {
        "message": "Transaction deleted"
    }

# =====================================================
# UPDATE TRANSACTION (Шаг 4)
# =====================================================
@router.put("/transactions/{transaction_id}")
def update_transaction(
    transaction_id: int,
    tx_data: schemas.Transaction,  # Используем твою готовую схему
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    # 1. Ищем старую версию транзакции
    db_tx = db.query(models.Transaction).filter(
        models.Transaction.id == transaction_id,
        models.Transaction.user_id == current_user.id
    ).first()

    if not db_tx:
        raise HTTPException(status_code=404, detail="Transaction not found")

    # 2. Ищем кошелек для пересчета баланса
    wallet = db.query(models.Wallet).filter(
        models.Wallet.id == db_tx.wallet_id,
        models.Wallet.user_id == current_user.id
    ).first()

    if not wallet:
        raise HTTPException(status_code=404, detail="Wallet not found")

    # --- ОТКАТ СТАРОГО БАЛАНСА (как при удалении) ---
    if db_tx.type in ["income", "loan_taken", "loan_repaid_to_us"]:
        wallet.balance -= db_tx.amount
    elif db_tx.type in ["expense", "loan_given", "loan_repaid_by_us"]:
        wallet.balance += db_tx.amount

    # --- ПРИМЕНЕНИЕ НОВОГО БАЛАНСА (как при создании) ---
    if tx_data.type in ["income", "loan_taken", "loan_repaid_to_us"]:
        wallet.balance += tx_data.amount
    elif tx_data.type in ["expense", "loan_given", "loan_repaid_by_us"]:
        if wallet.balance < tx_data.amount:
            raise HTTPException(status_code=400, detail="Not enough balance for this update")
        wallet.balance -= tx_data.amount

    # 3. Обновляем поля транзакции
    db_tx.type = tx_data.type
    db_tx.amount = tx_data.amount
    db_tx.description = tx_data.description
    db_tx.category_id = tx_data.category_id
    db_tx.person_id = tx_data.person_id
    db_tx.debt_id = tx_data.debt_id
    db_tx.wallet_id = tx_data.wallet_id

    db.commit()
    db.refresh(db_tx)
    return db_tx