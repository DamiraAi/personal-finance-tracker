import enum
from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Enum as SQLEnum
from sqlalchemy.orm import relationship
from database import Base
from sqlalchemy import Column, Integer, Float, String, ForeignKey, DateTime
from sqlalchemy.sql import func

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

# ТЕПЕРЬ СТРОГО: Категория может быть либо Income, либо Expense
class CategoryType(str, enum.Enum):
    income = "income"
    expense = "expense"


# 2. Модели таблиц базы данных

class Category(Base):
    __tablename__ = "categories"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)  # Убрали глобальный unique=True
    type = Column(SQLEnum(CategoryType), nullable=False)  # Строго 'income' или 'expense'
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)  # <-- ТЕПЕРЬ ЕСТЬ СВЯЗЬ С ПОЛЬЗОВАТЕЛЕМ!

    # Связи
    user = relationship("User", back_populates="categories")
    transactions = relationship("Transaction", back_populates="category")


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
    currency = Column(String, default="TRY")
    balance = Column(Float, default=0.0)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    # Связи
    user = relationship("User", back_populates="wallets")
    
    transactions = relationship("Transaction", foreign_keys="[Transaction.wallet_id]", back_populates="wallet")

class Transaction(Base):
    __tablename__ = "transactions"
    id = Column(Integer, primary_key=True, index=True)
    amount = Column(Float, nullable=False)
    type = Column(SQLEnum(TransactionType), nullable=False)
    description = Column(String, nullable=True)
    date = Column(DateTime, server_default=func.now(), nullable=False)
    
    # Внешние ключи
    wallet_id = Column(Integer, ForeignKey("wallets.id", ondelete="CASCADE"), nullable=False)
    to_wallet_id = Column(Integer, ForeignKey("wallets.id"), nullable=True)
    wallet = relationship("Wallet", foreign_keys=[wallet_id], back_populates="transactions")
    to_wallet = relationship("Wallet", foreign_keys=[to_wallet_id])
    
    category_id = Column(Integer, ForeignKey("categories.id", ondelete="SET NULL"), nullable=True)  # Если удалить категорию, транзакции останутся
    person_id = Column(Integer, ForeignKey("persons.id"), nullable=True)
    debt_id = Column(Integer, ForeignKey("debts.id"), nullable=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    # Связи (relationships)
    debt = relationship("Debt", back_populates="transactions")
    person = relationship("Person", back_populates="transactions")
    category = relationship("Category", back_populates="transactions")
    
    user = relationship("User", back_populates="transactions")
    

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)

    # Двусторонние связи, чтобы легко выгружать всё для отчетов
    wallets = relationship("Wallet", back_populates="user", cascade="all, delete-orphan")
    categories = relationship("Category", back_populates="user", cascade="all, delete-orphan")
    transactions = relationship("Transaction", back_populates="user", cascade="all, delete-orphan")