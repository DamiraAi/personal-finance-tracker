import os
import secrets
from datetime import datetime, timedelta
from jose import jwt, JWTError  # type: ignore

import resend  
from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks  # type: ignore
from fastapi.security import OAuth2PasswordRequestForm  # type: ignore
from fastapi.middleware.cors import CORSMiddleware  # type: ignore
from sqlalchemy.orm import Session  # type: ignore

from database import Base, engine, create_default_categories
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

from routers import wallets, transactions, debts, persons, categories, reports

# Создание таблиц (если их нет)
models.Base.metadata.create_all(bind=engine)

# Инициализация приложения FastAPI
app = FastAPI()

# --- КОНФИГУРАЦИЯ RESEND (вместо SMTP/fastapi-mail) ---
resend.api_key = os.environ.get("RESEND_API_KEY")

# Адрес отправителя. Пока домен не верифицирован в Resend, работает только
# onboarding@resend.dev, и письма уходят лишь на email, привязанный к вашему
# аккаунту Resend. После верификации своего домена замените на
# "Finance App <noreply@ваш-домен.com>".
MAIL_FROM = os.environ.get("MAIL_FROM", "Finance App <onboarding@resend.dev>")

# Настройки безопасности токенов восстановления
RESET_SECRET_KEY = os.environ.get("SECRET_KEY", "SUPER_SECRET_RECOVERY_KEY_123")
ALGORITHM = "HS256"


def create_reset_token(email: str):
    expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode = {"exp": expire, "sub": email}
    encoded_jwt = jwt.encode(to_encode, RESET_SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


# --- НАСТРОЙКА CORS MIDDLEWARE ---
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://finance-backend-tj8e.onrender.com",
]

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?|https://finance-backend-tj8e\.onrender\.com",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- КОРНЕВОЙ МАРШРУТ ---
@app.get("/")
def root():
    return {
        "message": "Finance API is running",
        "status": "OK",
        "docs": "/docs"
    }


# =====================================================
# AUTH & USER MANAGEMENT
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

    # Вызов инициализации категорий
    try:
        create_default_categories(db, user_id=db_user.id)
    except Exception as e:
        # Если что-то пойдет не так с категориями, регистрация завершится успешно
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

    if not db_user or not verify_password(form_data.password, db_user.hashed_password):
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


# --- ВОССТАНОВЛЕНИЕ ПАРОЛЯ ---

@app.post("/password-recovery/request")
async def request_password_reset(
    request: schemas.UserPasswordResetRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    user = db.query(models.User).filter(models.User.email == request.email).first()

    if not user:
        # Маскируем ответ ради безопасности данных пользователей
        return {"message": "Если данный Email зарегистрирован, инструкции по сбросу отправлены на почту."}

    token = create_reset_token(user.email)

    # В будущем здесь будет ссылка, обрабатываемая вашим Flet-приложением
    recovery_url = f"https://finance-backend-tj8e.onrender.com/reset-password?token={token}"

    html_content = f"""
    <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #dddddd; border-radius: 10px;">
                <h2 style="color: #2196F3; text-align: center;">Восстановление пароля</h2>
                <p>Привет, <strong>{user.username}</strong>!</p>
                <p>Мы получили запрос на сброс пароля для твоего аккаунта в Финансовом приложении.</p>
                <p>Чтобы установить новый пароль, нажмите на кнопку ниже. Ссылка действительна в течение 15 минут:</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{recovery_url}" style="background-color: #2196F3; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Сбросить пароль</a>
                </div>
                <p style="font-size: 12px; color: #777;">Если вы не запрашивали сброс пароля, просто проигнорируйте это письмо.</p>
            </div>
        </body>
    </html>
    """

    def send_email_via_resend():
        try:
            resend.Emails.send({
                "from": MAIL_FROM,
                "to": [user.email],
                "subject": "Восстановление пароля — Финансовое приложение",
                "html": html_content,
            })
        except Exception as e:
            print(f"Ошибка отправки через Resend: {e}")

    # Запускаем отправку в фоне, чтобы сеть не тормозила ответ пользователю
    background_tasks.add_task(send_email_via_resend)

    return {"message": "Инструкции по восстановлению пароля отправлены на ваш Email."}


@app.post("/password-recovery/reset")
def reset_password(
    data: schemas.UserPasswordResetConfirm,
    db: Session = Depends(get_db)
):
    try:
        payload = jwt.decode(data.token, RESET_SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=400, detail="Неверный или просроченный токен")
    except JWTError:
        raise HTTPException(status_code=400, detail="Неверный или просроченный токен")

    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        raise HTTPException(status_code=444, detail="Пользователь не найден")

    user.hashed_password = hash_password(data.new_password)
    db.commit()

    return {"status": "success", "message": "Пароль успешно обновлен! Теперь вы можете войти в приложение."}


# =====================================================
# ПОДКЛЮЧЕНИЕ РОУТЕРОВ ПРИЛОЖЕНИЯ
# =====================================================
app.include_router(wallets.router)
app.include_router(transactions.router)
app.include_router(debts.router)
app.include_router(persons.router)
app.include_router(categories.router)
app.include_router(reports.router)
