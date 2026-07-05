from pydantic import BaseModel
from enum import Enum
from datetime import datetime, model_validator


# -------- USER --------

class UserCreate(BaseModel):
    username: str
    email: str
    password: str


class UserLogin(BaseModel):
    email: str
    password: str


# -------- CATEGORY --------

class Category(BaseModel):
    id: int | None = None
    name: str


# -------- PERSON --------

class Person(BaseModel):
    id: int | None = None
    name: str
    contact: str


# -------- WALLET --------

class WalletCreate(BaseModel):
    name: str
    currency: str


class Wallet(BaseModel):
    balance: float


# -------- DEBT --------

class DebtType(str, Enum):
    we_owe = "we_owe"
    they_owe = "they_owe"


class DebtStatus(str, Enum):
    active = "active"
    closed = "closed"


class Debt(BaseModel):
    id: int | None = None
    person_id: int
    amount: float
    type: DebtType
    status: DebtStatus = DebtStatus.active


# -------- TRANSACTION --------

class TransactionType(str, Enum):
    income = "income"
    expense = "expense"
    transfer = "transfer"
    loan_given = "loan_given"
    loan_taken = "loan_taken"
    loan_repaid_by_us = "loan_repaid_by_us"
    loan_repaid_to_us = "loan_repaid_to_us"


class Transaction(BaseModel):
    id: int | None = None
    type: TransactionType
    amount: float
    description: str
    category_id: int | None = None
    person_id: int | None = None
    debt_id: int | None = None
    wallet_id: int

    @model_validator(mode='after')
    def validate_transaction_logic(self) -> 'Transaction':
        # Если это перевод
        if self.type == TransactionType.transfer:
            if self.to_wallet_id is None:
                raise ValueError("Для перевода необходимо указать 'to_wallet_id'")
            if self.wallet_id == self.to_wallet_id:
                raise ValueError("Нельзя перевести деньги на тот же самый кошелек")
        
        # Если это стандартный доход или расход
        elif self.type in (TransactionType.income, TransactionType.expense):
            if self.category_id is None:
                raise ValueError(f"Для типа '{self.type.value}' необходимо указать 'category_id'")
                
        return self
    
    date: datetime| None = None