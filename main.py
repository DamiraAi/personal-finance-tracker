from fastapi import FastAPI, HTTPException, Depends # type: ignore
from sqlalchemy.orm import Session # type: ignore
from fastapi.security import OAuth2PasswordRequestForm # type: ignore
from database import Base, engine
import models
import schemas
from database import create_default_categories

from fastapi import Depends, APIRouter



from auth import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
    get_db,
    DEFAULT_CATEGORIES  # Импортируем наш профессиональный список категорий
)

from routers import wallets
from routers import transactions
from routers import debts
from routers import persons
from routers import categories
from routers import reports
from fastapi.middleware.cors import CORSMiddleware # type: ignore

app = FastAPI()

origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://finance-backend-tj8e.onrender.com",
]

# Важно: middleware настраивается ПОСЛЕ создания app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?|https://finance-backend-tj8e\.onrender\.com",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {
        "message": "Finance API is running",
        "status": "OK",
        "docs": "/docs"
    }

Base.metadata.create_all(bind=engine)

# =====================================================
# AUTH
# =====================================================

@app.post("/register")
def register(user: schemas.UserCreate, db: Session = Depends(get_db)):
    existing_user = db.query(models.User).filter(
        models.User.email == user.email
    ).first()

    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )

    hashed_password = hash_password(user.password)

    db_user = models.User(
        username=user.username,
        email=user.email,
        hashed_password=hashed_password
    )

    db.add(db_user)
    db.commit()
    db.refresh(db_user)  # Получаем сгенерированный db_user.id

    # ВЫЗЫВАЕМ ФУНКЦИЮ ИЗ DATABASE.PY:
    try:
        from database import create_default_categories
        create_default_categories(db, user_id=db_user.id)
    except Exception as e:
        # Если что-то пойдет не так с категориями, регистрация пользователя все равно завершится успешно
        print(f"Ошибка при создании дефолтных категорий для пользователя {db_user.id}: {e}")

    return {
        "message": "User created successfully and default professional categories initialized"
    }


@app.post("/login")
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):

    db_user = db.query(models.User).filter(
        models.User.email == form_data.username
    ).first()

    if not db_user:
        raise HTTPException(
            status_code=400,
            detail="Invalid email or password"
        )

    if not verify_password(
        form_data.password,
        db_user.hashed_password
    ):
        raise HTTPException(
            status_code=400,
            detail="Invalid email or password"
        )

    access_token = create_access_token(
        data={"sub": db_user.email}
    )

    return {
        "access_token": access_token,
        "token_type": "bearer"
    }


# Подключение роутеров приложения
app.include_router(wallets.router)
app.include_router(transactions.router)
app.include_router(debts.router)
app.include_router(persons.router)
app.include_router(categories.router)
app.include_router(reports.router)