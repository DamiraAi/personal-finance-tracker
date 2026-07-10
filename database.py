from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv
import os

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

# 1. СНАЧАЛА создаем базовые элементы SQLAlchemy
engine = create_engine(DATABASE_URL)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

Base = declarative_base()

# 2. ПОТОМ объявляем функции работы с сессией
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# 3. И ТОЛЬКО В САМОМ КОНЦЕ, внутри функции, делаем импорт моделей
def create_default_categories(db, user_id: int):
    # Локальный импорт здесь безопасен, так как Base уже гарантированно создан выше!
    from models import Category 
    
    exists = db.query(Category).filter(Category.user_id == user_id).first()
    
    if not exists:
        default_cats = [
            # === РАСХОДЫ (Expense) ===
            {"name": "categories.food", "type": "expense"},
            {"name": "categories.cafe", "type": "expense"},
            {"name": "categories.transport", "type": "expense"},
            {"name": "categories.car", "type": "expense"},
            {"name": "categories.housing", "type": "expense"},
            {"name": "categories.health", "type": "expense"},
            {"name": "categories.clothing", "type": "expense"},
            {"name": "categories.beauty", "type": "expense"},
            {"name": "categories.entertainment", "type": "expense"},
            {"name": "categories.education", "type": "expense"},
            {"name": "categories.telecom", "type": "expense"},
            {"name": "categories.subscriptions", "type": "expense"},
            {"name": "categories.gifts_expense", "type": "expense"},
            {"name": "categories.other_expense", "type": "expense"},
            
            # === ДОХОДЫ (Income) ===
            {"name": "categories.salary", "type": "income"},
            {"name": "categories.advance", "type": "income"},
            {"name": "categories.freelance", "type": "income"},
            {"name": "categories.business_investment", "type": "income"},
            {"name": "categories.gifts_income", "type": "income"},
            {"name": "categories.cashback", "type": "income"},
            {"name": "categories.other_income", "type": "income"}
        ]
        
        for cat_data in default_cats:
            new_cat = Category(
                name=cat_data["name"],
                type=cat_data["type"],
                user_id=user_id
            )
            db.add(new_cat)
        
        db.commit()