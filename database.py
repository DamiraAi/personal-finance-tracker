from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from models import Category
DATABASE_URL = "sqlite:///./finance.db"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False}
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

Base = declarative_base()

# ДОБАВЛЯЕМ СЮДА:
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
def create_default_categories(db, user_id: int):
    exists = db.query(Category).filter(Category.user_id == user_id).first()
    
    if not exists:
        default_cats = [
            # === РАСХОДЫ (Expense) ===
            {"name": "Продукты & Супермаркеты", "type": "expense"},
            {"name": "Кафе & Рестораны", "type": "expense"},
            {"name": "Транспорт & Такси", "type": "expense"},
            {"name": "Автомобиль & Топливо", "type": "expense"},
            {"name": "Жилье & Коммунальные услуги", "type": "expense"},
            {"name": "Здоровье & Аптеки", "type": "expense"},
            {"name": "Одежда & Обувь", "type": "expense"},
            {"name": "Красота & Уход", "type": "expense"},
            {"name": "Развлечения & Досуг", "type": "expense"},
            {"name": "Образование & Книги", "type": "expense"},
            {"name": "Связь & Интернет", "type": "expense"},
            {"name": "Подписки & Сервисы", "type": "expense"},
            {"name": "Подарки & Благотворительность", "type": "expense"},
            {"name": "Прочие расходы", "type": "expense"},
            
            # === ДОХОДЫ (Income) ===
            {"name": "Зарплата", "type": "income"},
            {"name": "Аванс", "type": "income"},
            {"name": "Фриланс & Подработка", "type": "income"},
            {"name": "Бизнес / Инвестиции", "type": "income"},
            {"name": "Подарки / Награды", "type": "income"},
            {"name": "Кэшбэк & Бонусы", "type": "income"},
            {"name": "Прочие доходы", "type": "income"}
        ]
        
        for cat_data in default_cats:
            new_cat = Category(
                name=cat_data["name"],
                type=cat_data["type"],
                user_id=user_id
            )
            db.add(new_cat)
        
        db.commit()