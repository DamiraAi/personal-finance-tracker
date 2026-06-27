import flet as ft
import requests

# URL твоего живого бэкенда на Render
API_URL = "https://finance-backend-tj8e.onrender.com/debts/report"

def main(page: ft.Page):
    page.title = "Мой Трекер Финансов"
    page.theme_mode = ft.ThemeMode.DARK  # Темная тема
    
    # Центрируем ВСЁ содержимое прямо на странице
    page.vertical_alignment = ft.MainAxisAlignment.CENTER
    page.horizontal_alignment = ft.CrossAxisAlignment.CENTER

    # Текстовые поля для вывода данных
    title = ft.Text("Учёт Долгов", size=28, weight=ft.FontWeight.BOLD)
    status_text = ft.Text("Загрузка данных с сервера...", size=16, color="blue")

    def fetch_data(e):
        try:
            # Делаем реальный запрос к твоему серверу Render
            response = requests.get(API_URL, params={"user_id": 1})
            if response.status_code == 200:
                data = response.json()
                they_owe = data.get("нам_должны (they_owe)", [])
                total_they_owe = sum(item["осталось_вернуть"] for item in they_owe)
                
                status_text.value = f"Нам должны: {total_they_owe}"
                status_text.color = "green"
            else:
                # Показываем код ошибки и текст ответа сервера
                status_text.value = f"Ошибка сервера: {response.status_code}\n{response.text}"
                status_text.color = "red"
        except Exception as ex:
            status_text.value = f"Ошибка подключения: {ex}"
            status_text.color = "red"
        
        page.update()

    # Кнопка для обновления данных
    btn = ft.ElevatedButton("Обновить баланс", on_click=fetch_data)

    # Просто добавляем колонку с элементами, страница сама отцентрирует её
    page.add(
        ft.Column(
            [title, status_text, btn],
            horizontal_alignment=ft.CrossAxisAlignment.CENTER,
            spacing=20
        )
    )

ft.app(target=main)