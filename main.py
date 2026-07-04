from fastapi import FastAPI, HTTPException, Depends # type: ignore
from sqlalchemy.orm import Session # type: ignore
from fastapi.security import OAuth2PasswordRequestForm # type: ignore
from database import Base, engine
import models
import schemas

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
    "https://finance-backend-tj8e.onrender.com", # На всякий случай
]
@app.get("/")
def root():
    return {
        "message": "Finance API is running",
        "status": "OK",
        "docs": "/docs"
    }

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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

    # МИКРО-ЦИКЛ: Автоматически создаем персональный набор топ-категорий для нового юзера
    try:
        for cat_name in DEFAULT_CATEGORIES:
            db_category = models.Category(
                name=cat_name,
                user_id=db_user.id  # Жесткая привязка к конкретному пользователю
            )
            db.add(db_category)
        db.commit()
    except Exception as e:
        # Если что-то пойдет не так с категориями, регистрация пользователя все равно завершится успешно
        print(f"Ошибка при создании дефолтных категорий для пользователя {db_user.id}: {e}")

    return {
        "message": "User created successfully and default categories initialized"
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