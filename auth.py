import os
import bcrypt
from datetime import datetime, timedelta
from jose import jwt, JWTError  # type: ignore
from sqlalchemy.orm import Session  # type: ignore
from fastapi import Depends, HTTPException, status  # type: ignore
from fastapi.security import OAuth2PasswordBearer  # type: ignore

import models
from database import SessionLocal

# Настройки безопасности (Секретный ключ вытягивается из .env, если его нет — берется дефолт)
SECRET_KEY = os.environ.get("SECRET_KEY", "mysecretkey")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

# =====================================================
# ФУНКЦИИ ХЕШИРОВАНИЯ (ЧИСТЫЙ BCRYPT БЕЗ ASSLIB)
# =====================================================

def hash_password(password: str) -> str:
    """Хеширование пароля при регистрации"""
    password_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password_bytes, salt)
    return hashed.decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Проверка пароля при авторизации"""
    try:
        plain_bytes = plain_password.encode('utf-8')
        hashed_bytes = hashed_password.encode('utf-8')
        return bcrypt.checkpw(plain_bytes, hashed_bytes)
    except Exception:
        return False

# =====================================================
# РАБОТА С СЕССИЯМИ БАЗЫ ДАННЫХ
# =====================================================

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# =====================================================
# ГЕНЕРАЦИЯ И ВАЛИДАЦИЯ JWT ТОКЕНОВ
# =====================================================

def create_access_token(data: dict):
    """Создание JWT токена доступа для вошедшего пользователя"""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    """Dependency для защиты роутов и получения текущего авторизованного юзера"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = db.query(models.User).filter(models.User.email == email).first()
    if user is None:
        raise credentials_exception

    return user

# =====================================================
# ПРОФЕССИОНАЛЬНЫЙ СПИСОК КАТЕГОРИЙ ДЛЯ НОВЫХ ЮЗЕРОВ
# =====================================================
DEFAULT_CATEGORIES = [
    # Расходы (Expenses)
    "Food & Groceries",
    "Cafes & Restaurants",
    "Transport & Taxi",
    "Rent & Housing",
    "Utilities (Gas, Water, Electricity)",
    "Internet & Mobile",
    "Entertainment & Leisure",
    "Health & Medicine",
    "Beauty & Sport",
    "Shopping (Clothes, Electronics)",
    "Education & Books",
    "Travel & Hotels",
    "Gifts & Donations",
    "Insurance & Taxes",
    
    # Доходы (Income)
    "Salary",
    "Freelance & Side Hustle",
    "Investments & Dividends",
    "Cashback & Rewards",
    "Gifts (Received)",
    
    # Общее
    "Other"
]