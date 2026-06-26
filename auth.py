from jose import JWTError, jwt
from passlib.context import CryptContext
from datetime import datetime, timedelta
from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from database import SessionLocal
import models

SECRET_KEY = "mysecretkey"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto"
)

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="login"
)

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


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def hash_password(password: str):
    return pwd_context.hash(password)


def verify_password(plain_password, hashed_password):
    return pwd_context.verify(
        plain_password,
        hashed_password
    )


def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(
        minutes=ACCESS_TOKEN_EXPIRE_MINUTES
    )
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(
        to_encode,
        SECRET_KEY,
        algorithm=ALGORITHM
    )
    return encoded_jwt


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    credentials_exception = HTTPException(
        status_code=401,
        detail="Could not validate credentials"
    )

    try:
        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM]
        )
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = db.query(models.User).filter(
        models.User.email == email
    ).first()

    if user is None:
        raise credentials_exception

    return user