from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import models
from database import SessionLocal, get_db  # <-- Импортируем get_db отсюда
from auth import get_current_user
from pydantic import BaseModel

router = APIRouter()

class WalletCreate(BaseModel):
    name: str
    currency: str



def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# =====================================================
# CREATE WALLET
# =====================================================
@router.post("/wallets")
def create_wallet(
    wallet: WalletCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    db_wallet = models.Wallet(
        name=wallet.name,
        currency=wallet.currency,
        balance=0.0,  # Задали float
        user_id=current_user.id
    )

    db.add(db_wallet)
    db.commit()
    db.refresh(db_wallet)
    return db_wallet  # Теперь функция возвращает созданный кошелек!

# =====================================================
# UPDATE WALLET (Шаг 3)
# =====================================================
@router.put("/wallets/{wallet_id}")
def update_wallet(
    wallet_id: int,
    wallet_data: WalletCreate,  # Используем локальную схему WalletCreate вместо schemas.WalletCreate
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    db_wallet = db.query(models.Wallet).filter(
        models.Wallet.id == wallet_id,
        models.Wallet.user_id == current_user.id
    ).first()

    if not db_wallet:
        raise HTTPException(status_code=404, detail="Wallet not found")

    # Обновляем поля кошелька
    db_wallet.name = wallet_data.name
    db_wallet.currency = wallet_data.currency

    db.commit()
    db.refresh(db_wallet)
    return db_wallet  # Убрали дублирующий return

# =====================================================
# GET WALLETS
# =====================================================
@router.get("/wallets")
def get_wallets(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    wallets = db.query(models.Wallet).filter(
        models.Wallet.user_id == current_user.id
    ).all()

    return wallets