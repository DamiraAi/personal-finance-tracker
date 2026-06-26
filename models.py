from sqlalchemy import Column, Integer, String, Float, DateTime, Enum, ForeignKey
from sqlalchemy.orm import relationship
from database import Base
import enum
from datetime import datetime

# -------- ENUMS --------

class TransactionType(str, enum.Enum):
    income = "income"
    expense = "expense"
    loan_given = "loan_given"
    loan_taken = "loan_taken"
    loan_repaid_by_us = "loan_repaid_by_us"
    loan_repaid_to_us = "loan_repaid_to_us"


class DebtType(str, enum.Enum):
    we_owe = "we_owe"
    they_owe = "they_owe"


class DebtStatus(str, enum.Enum):
    active = "active"
    closed = "closed"


# -------- MODELS --------

class Person(Base):
    __tablename__ = "persons"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    contact = Column(String)
    
    # ДОБАВЛЕНО: Привязка контакта к конкретному пользователю
    user_id = Column(Integer, ForeignKey("users.id"))


class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    
    # ДОБАВЛЕНО: Привязка категории к конкретному пользователю
    user_id = Column(Integer, ForeignKey("users.id"))


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, nullable=False)
    email = Column(String, unique=True, nullable=False)
    hashed_password = Column(String, nullable=False)

    # Исправлены отступы и добавлены обратные связи для безопасности данных
    wallets = relationship("Wallet", backref="user")
    transactions = relationship("Transaction", backref="user")
    categories = relationship("Category", backref="user")
    persons = relationship("Person", backref="user")


class Wallet(Base):
    __tablename__ = "wallets"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    currency = Column(String, nullable=False)
    balance = Column(Float, default=0.0)
    
    user_id = Column(Integer, ForeignKey("users.id"))
    
    transactions = relationship("Transaction", back_populates="wallet")


class Debt(Base):
    __tablename__ = "debts"

    id = Column(Integer, primary_key=True, index=True)
    person_id = Column(Integer, ForeignKey("persons.id"))
    amount = Column(Float)
    type = Column(Enum(DebtType))
    status = Column(Enum(DebtStatus), default=DebtStatus.active)

    transactions = relationship("Transaction", back_populates="debt")


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    amount = Column(Float, nullable=False)
    type = Column(Enum(TransactionType), nullable=False)
    description = Column(String)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=True)
    person_id = Column(Integer, ForeignKey("persons.id"), nullable=True)
    debt_id = Column(Integer, ForeignKey("debts.id"), nullable=True)
    wallet_id = Column(Integer, ForeignKey("wallets.id"))
    
    date = Column(DateTime, default=datetime.utcnow)
    user_id = Column(Integer, ForeignKey("users.id"))
    
    wallet = relationship("Wallet", back_populates="transactions")
    debt = relationship("Debt", back_populates="transactions")