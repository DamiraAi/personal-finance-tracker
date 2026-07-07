from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import models
import schemas
from datetime import datetime
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

    # -------- WALLET (ОТКУДА) --------

    wallet = db.query(models.Wallet).filter(
        models.Wallet.id == transaction.wallet_id,
        models.Wallet.user_id == current_user.id
    ).first()

    if wallet is None:
        raise HTTPException(
            status_code=404,
            detail="Wallet not found"
        )

    # -------- TO_WALLET (КУДА) — ТОЛЬКО ДЛЯ ПЕРЕВОДОВ --------
    to_wallet = None
    if transaction.type == schemas.TransactionType.transfer:
        if not transaction.to_wallet_id:
            raise HTTPException(
                status_code=400,
                detail="For transfer, to_wallet_id is required"
            )
        if transaction.wallet_id == transaction.to_wallet_id:
            raise HTTPException(
                status_code=400,
                detail="Cannot transfer money to the same wallet"
            )

        to_wallet = db.query(models.Wallet).filter(
            models.Wallet.id == transaction.to_wallet_id,
            models.Wallet.user_id == current_user.id
        ).first()

        if to_wallet is None:
            raise HTTPException(
                status_code=404,
                detail="Destination wallet not found"
            )

    # -------- CATEGORY --------
    # Категорию проверяем только если это НЕ перевод (у переводов нет категории)
    if transaction.category_id and transaction.type != schemas.TransactionType.transfer:
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

    if transaction.type in [
        schemas.TransactionType.loan_repaid_to_us,
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

        if debt.status == schemas.DebtStatus.closed:
            raise HTTPException(
                status_code=400,
                detail="Этот долг уже закрыт"
            )

        # debt.amount хранит ИЗНАЧАЛЬНУЮ сумму долга (не трогаем её напрямую).
        # Остаток считаем из суммы всех предыдущих возвратов по этому долгу.
        existing_repayments = db.query(models.Transaction).filter(
            models.Transaction.debt_id == debt.id,
            models.Transaction.type.in_([
                models.TransactionType.loan_repaid_by_us,
                models.TransactionType.loan_repaid_to_us
            ])
        ).all()

        already_paid = sum(t.amount for t in existing_repayments)
        remaining_before = debt.amount - already_paid

        if transaction.amount > remaining_before:
            raise HTTPException(
                status_code=400,
                detail=f"Сумма платежа больше остатка долга ({remaining_before})"
            )

        if already_paid + transaction.amount >= debt.amount:
            debt.status = schemas.DebtStatus.closed

    # -------- BALANCE --------

    # 1. Логика для ПЕРЕВОДА
    if transaction.type == schemas.TransactionType.transfer:
        if wallet.balance < transaction.amount:
            raise HTTPException(
                status_code=400,
                detail="Not enough balance in source wallet"
            )
        wallet.balance -= transaction.amount  # Списываем со счета А
        to_wallet.balance += transaction.amount  # Зачисляем на счет Б
        db.add(to_wallet) # Важно добавить в сессию второй измененный кошелек

    # 2. Твоя существующая логика для доходов, долгов и расходов
    elif transaction.type in ["income", "loan_taken", "loan_repaid_to_us"]:
        wallet.balance += transaction.amount

    elif transaction.type in ["expense", "loan_given", "loan_repaid_by_us"]:
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
        # Если это перевод, принудительно ставим категорию в None
        category_id=transaction.category_id if transaction.type != schemas.TransactionType.transfer else None,
        person_id=transaction.person_id,
        debt_id=transaction.debt_id,
        wallet_id=transaction.wallet_id,
        to_wallet_id=transaction.to_wallet_id if transaction.type == schemas.TransactionType.transfer else None, # Сохраняем кошелек-получатель
        user_id=current_user.id,
        date=transaction.date if transaction.date else datetime.utcnow()
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

    # Основной кошелек (Откуда были списаны деньги при переводе или расходе)
    wallet = db.query(models.Wallet).filter(
        models.Wallet.id == transaction.wallet_id
    ).first()

    # -------- ЛОГИКА БАЛАНСОВ --------

    # 1. Если удаляем перевод (transfer) — <-- НОВОЕ
    if transaction.type == "transfer" or transaction.type == schemas.TransactionType.transfer:
        # Находим кошелек-получатель (Куда пришли деньги)
        to_wallet = db.query(models.Wallet).filter(
            models.Wallet.id == transaction.to_wallet_id
        ).first()

        if to_wallet is None:
            raise HTTPException(
                status_code=404,
                detail="Destination wallet not found"
            )

        # Делаем откат (зеркальное действие):
        wallet.balance += transaction.amount     # Возвращаем на карту/счет списания
        to_wallet.balance -= transaction.amount    # Забираем из наличных/счета зачисления
        db.add(to_wallet)                          # Добавляем второй кошелек в сессию

    # 2. Если удаляем доходы и похожие операции
    elif transaction.type in [
        "income",
        "loan_taken",
        "loan_repaid_to_us"
    ]:
        wallet.balance -= transaction.amount

    # 3. Если удаляем расходы и похожие операции
    elif transaction.type in [
        "expense",
        "loan_given",
        "loan_repaid_by_us"
    ]:
        wallet.balance += transaction.amount

    # -------- УДАЛЕНИЕ --------
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
    tx_data: schemas.Transaction,
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


    # --- 2. ОТКАТ СТАРОГО БАЛАНСА (на основе старых данных db_tx) ---
    
    # Ищем старый основной кошелек
    old_wallet = db.query(models.Wallet).filter(
        models.Wallet.id == db_tx.wallet_id,
        models.Wallet.user_id == current_user.id
    ).first()
    
    if not old_wallet:
        raise HTTPException(status_code=404, detail="Old source wallet not found")

    # Откат старого баланса для ПЕРЕВОДА
    if db_tx.type == "transfer" or db_tx.type == schemas.TransactionType.transfer:
        old_to_wallet = db.query(models.Wallet).filter(
            models.Wallet.id == db_tx.to_wallet_id,
            models.Wallet.user_id == current_user.id
        ).first()
        
        if not old_to_wallet:
            raise HTTPException(status_code=404, detail="Old destination wallet not found")
            
        old_wallet.balance += db_tx.amount      # Возвращаем на кошелек-источник
        old_to_wallet.balance -= db_tx.amount   # Списываем с кошелька-получателя
        db.add(old_to_wallet)

    # Откат старого баланса для обычных операций
    elif db_tx.type in ["income", "loan_taken", "loan_repaid_to_us"]:
        old_wallet.balance -= db_tx.amount
    elif db_tx.type in ["expense", "loan_given", "loan_repaid_by_us"]:
        old_wallet.balance += db_tx.amount


    # --- 3. НАКАТ НОВОГО БАЛАНСА (на основе новых данных tx_data) ---
    
    # Ищем новый основной кошелек (он мог измениться в форме)
    new_wallet = db.query(models.Wallet).filter(
        models.Wallet.id == tx_data.wallet_id,
        models.Wallet.user_id == current_user.id
    ).first()

    if not new_wallet:
        raise HTTPException(status_code=404, detail="New source wallet not found")

    # Накат нового баланса для ПЕРЕВОДА
    if tx_data.type == "transfer" or tx_data.type == schemas.TransactionType.transfer:
        if not tx_data.to_wallet_id:
            raise HTTPException(status_code=400, detail="For transfer, to_wallet_id is required")
        if tx_data.wallet_id == tx_data.to_wallet_id:
            raise HTTPException(status_code=400, detail="Cannot transfer money to the same wallet")

        new_to_wallet = db.query(models.Wallet).filter(
            models.Wallet.id == tx_data.to_wallet_id,
            models.Wallet.user_id == current_user.id
        ).first()

        if not new_to_wallet:
            raise HTTPException(status_code=404, detail="New destination wallet not found")

        # Проверяем, хватает ли денег на новом кошельке-источнике
        if new_wallet.balance < tx_data.amount:
            raise HTTPException(status_code=400, detail="Not enough balance for this transfer")

        new_wallet.balance -= tx_data.amount    # Списываем с нового кошелька-источника
        new_to_wallet.balance += tx_data.amount   # Зачисляем на новый кошелек-получатель
        db.add(new_to_wallet)

    # Накат нового баланса для обычных операций
    elif tx_data.type in ["income", "loan_taken", "loan_repaid_to_us"]:
        new_wallet.balance += tx_data.amount
    elif tx_data.type in ["expense", "loan_given", "loan_repaid_by_us"]:
        if new_wallet.balance < tx_data.amount:
            raise HTTPException(status_code=400, detail="Not enough balance for this update")
        new_wallet.balance -= tx_data.amount


    # --- 4. ОБНОВЛЕНИЕ ПОЛЕЙ В БАЗЕ ДАННЫХ ---
    db_tx.type = tx_data.type
    db_tx.amount = tx_data.amount
    db_tx.description = tx_data.description
    db_tx.person_id = tx_data.person_id
    db_tx.debt_id = tx_data.debt_id
    db_tx.wallet_id = tx_data.wallet_id
    
    # Если это перевод — сохраняем to_wallet_id и стираем категорию
    if tx_data.type == schemas.TransactionType.transfer or tx_data.type == "transfer":
        db_tx.to_wallet_id = tx_data.to_wallet_id
        db_tx.category_id = None
    else:
        db_tx.to_wallet_id = None
        db_tx.category_id = tx_data.category_id

    db.add(old_wallet)
    db.add(new_wallet)
    db.commit()
    db.refresh(db_tx)
    return db_tx