import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"

function Login() {
  // isLogin = true (показываем форму Входа), isLogin = false (показываем форму Регистрации)
  const [isLogin, setIsLogin] = useState(true)
  
  // Общие стейты
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  // Стейт для имени пользователя (нужен только при регистрации)
  const [username, setUsername] = useState("")
  
  const navigate = useNavigate()

  // Если токен уже есть, сразу уводим на дашборд
  useEffect(() => {
    if (localStorage.getItem("token")) {
      navigate("/dashboard")
    }
  }, [navigate])

  // Переключалка между Входом и Регистрацией (очищает поля при переключении)
  const toggleAuthMode = () => {
    setIsLogin(!isLogin)
    setEmail("")
    setPassword("")
    setUsername("")
  }

  // СУЩЕСТВУЮЩАЯ ЛОГИКА: ВХОД (Оставляем как было, она рабочая!)
  const handleLogin = async () => {
    if (!email || !password) {
      alert("Пожалуйста, заполните все поля")
      return
    }

    const formData = new URLSearchParams()
    formData.append("username", email)
    formData.append("password", password)

    try {
      const response = await fetch("https://finance-backend-tj8e.onrender.com/login", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: formData.toString()
      })

      const data = await response.json()

      if (response.ok && data.access_token) {
        localStorage.setItem("token", data.access_token)
        alert("Вход выполнен успешно!")
        navigate("/dashboard")
      } else {
        alert(data.detail || "Неверный логин или пароль")
      }
    } catch (error) {
      console.error("Ошибка при авторизации:", error)
      alert("Ошибка подключения к серверу бэкенда")
    }
  }

  // НОВАЯ ЛОГИКА: РЕГИСТРАЦИЯ (Отправляет JSON со всеми тремя полями)
  const handleRegister = async () => {
    if (!email || !password || !username) {
      alert("Пожалуйста, заполните все поля, включая имя пользователя")
      return
    }

    try {
      const response = await fetch("http://127.0.0.1:8000/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username, // Передаем имя
          email: email,       // Передаем имейл
          password: password  // Передаем пароль
        })
      })

      const data = await response.json()

      if (response.ok) {
        alert("Регистрация успешна! Теперь вы можете войти, используя свои данные.")
        setIsLogin(true) // Переключаем интерфейс на форму Входа
      } else {
        alert(data.detail || "Ошибка при регистрации")
      }
    } catch (error) {
      console.error("Ошибка при регистрации:", error)
      alert("Ошибка подключения к бэкенду")
    }
  }

  return (
    <div style={{ backgroundColor: "#0f172a", minHeight: "100vh", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Arial, sans-serif" }}>
      <div style={{ backgroundColor: "#1e293b", padding: "40px", borderRadius: "15px", maxWidth: "450px", width: "100%", margin: "20px", boxSizing: "border-box", boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.3)" }}>
        
        {/* Меняем заголовок в зависимости от режима */}
        <h2 style={{ textAlign: "center", marginBottom: "25px", fontSize: "24px", fontWeight: "600" }}>
          {isLogin ? "Finance Login" : "Finance Registration"}
        </h2>
        
        {/* Поле Username показывается ТОЛЬКО при Регистрации */}
        {!isLogin && (
          <div style={{ marginBottom: "15px" }}>
            <label style={{ display: "block", marginBottom: "5px", color: "#94a3b8", fontSize: "14px" }}>Имя пользователя (Username)</label>
            <input 
              type="text" 
              placeholder="Damira" 
              value={username} 
              onChange={(e) => setUsername(e.target.value)} 
              style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid #475569", backgroundColor: "#334155", color: "white", boxSizing: "border-box", fontSize: "15px" }} 
            />
          </div>
        )}

        <div style={{ marginBottom: "15px" }}>
          <label style={{ display: "block", marginBottom: "5px", color: "#94a3b8", fontSize: "14px" }}>Email</label>
          <input 
            type="email" 
            placeholder="example@mail.com" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid #475569", backgroundColor: "#334155", color: "white", boxSizing: "border-box", fontSize: "15px" }} 
          />
        </div>

        <div style={{ marginBottom: "25px" }}>
          <label style={{ display: "block", marginBottom: "5px", color: "#94a3b8", fontSize: "14px" }}>Пароль</label>
          <input 
            type="password" 
            placeholder="••••••••" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid #475569", backgroundColor: "#334155", color: "white", boxSizing: "border-box", fontSize: "15px" }} 
          />
        </div>

        {/* Главная кнопка меняет действие и текст */}
        <button 
          onClick={isLogin ? handleLogin : handleRegister} 
          style={{ width: "100%", padding: "14px", backgroundColor: "#3b82f6", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold", fontSize: "16px", transition: "background-color 0.2s" }}
        >
          {isLogin ? "Войти в систему" : "Зарегистрироваться"}
        </button>

        {/* Переключатель режимов */}
        <div style={{ marginTop: "20px", textAlign: "center" }}>
          <span 
            onClick={toggleAuthMode} 
            style={{ color: "#60a5fa", cursor: "pointer", fontSize: "14px", textDecoration: "underline" }}
          >
            {isLogin ? "Ещё нет аккаунта? Зарегистрироваться" : "Уже есть аккаунт? Войти"}
          </span>
        </div>

      </div>
    </div>
  )
}

export default Login