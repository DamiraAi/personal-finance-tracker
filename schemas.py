from pydantic import BaseModel
from enum import Enum
from datetime import datetime


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
    date: datetime| None = None