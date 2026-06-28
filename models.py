import enum
from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Enum as SQLEnum
from sqlalchemy.orm import relationship
from database import Base

# 1. Перечисления для типов и статусов
class TransactionType(str, enum.Enum):
    income = "income"
    expense = "expense"
    loan_given = "loan_given"
    loan_taken = "loan_taken"
    loan_repaid_to_us = "loan_repaid_to_us"
    loan_repaid_by_us = "loan_repaid_by_us"

class DebtType(str, enum.Enum):
    they_owe = "they_owe"  # Нам должны
    we_owe = "we_owe"      # Мы должны

class DebtStatus(str, enum.Enum):
    active = "active"
    closed = "closed"

class Category(Base):
    __tablename__ = "categories"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, unique=True)
    type = Column(SQLEnum(TransactionType), nullable=False)  # income или expense

# 2. Модели таблиц базы данных
class Person(Base):
    __tablename__ = "persons"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    
    # Связи
    debts = relationship("Debt", back_populates="person")
    transactions = relationship("Transaction", back_populates="person")

class Debt(Base):
    __tablename__ = "debts"
    id = Column(Integer, primary_key=True, index=True)
    person_id = Column(Integer, ForeignKey("persons.id"), nullable=False)
    amount = Column(Float, nullable=False)
    type = Column(SQLEnum(DebtType), nullable=False)
    status = Column(SQLEnum(DebtStatus), default=DebtStatus.active)
    
    # Связи
    person = relationship("Person", back_populates="debts")
    transactions = relationship("Transaction", back_populates="debt")

class Wallet(Base):
    __tablename__ = "wallets"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    balance = Column(Float, default=0.0)
    user_id = Column(Integer, nullable=False)

class Transaction(Base):
    __tablename__ = "transactions"
    id = Column(Integer, primary_key=True, index=True)
    amount = Column(Float, nullable=False)
    type = Column(SQLEnum(TransactionType), nullable=False)
    description = Column(String, nullable=True)
    
    # Внешние ключи
    wallet_id = Column(Integer, ForeignKey("wallets.id"), nullable=False)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=True)
    person_id = Column(Integer, ForeignKey("persons.id"), nullable=True)
    debt_id = Column(Integer, ForeignKey("debts.id"), nullable=True)
    user_id = Column(Integer, nullable=False)

    # Связи (relationships)
    debt = relationship("Debt", back_populates="transactions")
    person = relationship("Person", back_populates="transactions")
    wallet = relationship("Wallet") 
    category = relationship("Category")

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)  # Вход по email
    hashed_password = Column(String, nullable=False)