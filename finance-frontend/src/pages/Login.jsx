import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

export default function Login() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  // 1. Все необходимые стейты
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);

  // Режимы экрана: "login" | "register" | "recovery"
  const [authMode, setAuthMode] = useState("login"); 

  // Если токен уже есть, сразу уводим на дашборд
  useEffect(() => {
    if (localStorage.getItem("token")) {
      navigate("/dashboard");
    }
  }, [navigate]);

  // Смена языка
  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
  };

  // Очистка полей при смене режима
  const switchMode = (mode) => {
    setAuthMode(mode);
    setEmail("");
    setPassword("");
    setUsername("");
  };

  // Логика Входа
  const handleLogin = async (e) => {
    if (e) e.preventDefault(); // Предотвращаем перезагрузку формы
    if (!email || !password) {
      alert(t("alert_fill_all") || "Пожалуйста, заполните все поля");
      return;
    }

    const formData = new URLSearchParams();
    formData.append("username", email);
    formData.append("password", password);

    try {
      setLoading(true);
      const response = await fetch("https://finance-backend-tj8e.onrender.com/login", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: formData.toString()
      });

      const data = await response.json();

      if (response.ok && data.access_token) {
        localStorage.setItem("token", data.access_token);
        alert(t("alert_login_success") || "Вход выполнен успешно!");
        navigate("/dashboard");
      } else {
        alert(data.detail || t("alert_login_error") || "Неверный логин или пароль");
      }
    } catch (error) {
      console.error("Ошибка при авторизации:", error);
      alert(t("alert_server_error") || "Ошибка подключения к серверу");
    } finally {
      setLoading(false);
    }
  };

  // Логика Регистрации
  const handleRegister = async (e) => {
    if (e) e.preventDefault();
    if (!email || !password || !username) {
      alert(t("alert_fill_all_register") || "Пожалуйста, заполните все поля, включая имя пользователя");
      return;
    }

    try {
      setLoading(true);
      const response = await fetch("https://finance-backend-tj8e.onrender.com/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password })
      });

      const data = await response.json();

      if (response.ok) {
        alert(t("alert_register_success") || "Регистрация успешна!");
        switchMode("login"); // Возвращаем на вход
      } else {
        alert(data.detail || t("alert_register_error") || "Ошибка при регистрации");
      }
    } catch (error) {
      console.error("Ошибка при регистрации:", error);
      alert(t("alert_server_error") || "Ошибка подключения к бэкенду");
    } finally {
      setLoading(false);
    }
  };

  // Логика Восстановления (Заглушка)
  const handleRecovery = async (e) => {
    e.preventDefault();
    if (!email) {
      alert(t("alert_fill_email") || "Введите email");
      return;
    }
    // Здесь ваш fetch запрос на восстановление пароля...
    alert(t("alert_recovery_sent") || "Ссылка отправлена!");
  };

  return (
    <div style={{ backgroundColor: "#0f172a", minHeight: "100vh", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Arial, sans-serif" }}>
      <div style={{ backgroundColor: "#1e293b", padding: "40px", borderRadius: "15px", maxWidth: "450px", width: "100%", margin: "20px", boxSizing: "border-box", boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.3)" }}>
        
        {/* Шапка: Кнопки переключения языков */}
        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginBottom: "20px" }}>
          <button onClick={() => changeLanguage("ru")} style={langBtnStyle}>RU</button>
          <button onClick={() => changeLanguage("tr")} style={langBtnStyle}>TR</button>
          <button onClick={() => changeLanguage("en")} style={langBtnStyle}>EN</button>
        </div>

        {/* --- ЭКРАН ВОССТАНОВЛЕНИЯ ПАРОЛЯ --- */}
        {authMode === "recovery" && (
          <form onSubmit={handleRecovery}>
            <h2 style={titleStyle}>{t("recovery_title", "Восстановление пароля")}</h2>
            <p style={{ color: "#94a3b8", fontSize: "14px", marginBottom: "20px", textAlign: "center" }}>
              {t("recovery_desc", "Введите ваш email для получения ссылки")}
            </p>
            
            <div style={{ marginBottom: "20px" }}>
              <label style={labelStyle}>{t("email_label", "Email")}</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required style={inputStyle} placeholder="example@mail.com" />
            </div>

            <button type="submit" disabled={loading} style={submitBtnStyle}>
              {loading ? t("loading", "Загрузка...") : t("send_link_btn", "Отправить ссылку")}
            </button>
            
            <button type="button" onClick={() => switchMode("login")} style={linkBtnStyle}>
              {t("back_to_login", "Назад к входу")}
            </button>
          </form>
        )}

        {/* --- ЭКРАН ВХОДА ИЛИ РЕГИСТРАЦИИ --- */}
        {authMode !== "recovery" && (
          <form onSubmit={authMode === "login" ? handleLogin : handleRegister}>
            <h2 style={titleStyle}>
              {authMode === "login" ? t("login_title", "Finance Login") : t("register_title", "Finance Registration")}
            </h2>

            {/* Имя пользователя (только для регистрации) */}
            {authMode === "register" && (
              <div style={{ marginBottom: "15px" }}>
                <label style={labelStyle}>{t("username_label", "Имя пользователя")}</label>
                <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} required style={inputStyle} />
              </div>
            )}

            {/* Email */}
            <div style={{ marginBottom: "15px" }}>
              <label style={labelStyle}>{t("email_label", "Email")}</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required style={inputStyle} placeholder="example@mail.com" />
            </div>

            {/* Пароль */}
            <div style={{ marginBottom: "15px" }}>
              <label style={labelStyle}>{t("password_label", "Пароль")}</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required style={inputStyle} placeholder="••••••••" />
            </div>

            {/* Забыли пароль? (только для входа) */}
            {authMode === "login" && (
              <div style={{ textAlign: "right", marginBottom: "20px" }}>
                <span onClick={() => switchMode("recovery")} style={{ color: "#60a5fa", fontSize: "13px", textDecoration: "underline", cursor: "pointer" }}>
                  {t("forgot_password", "Забыли пароль?")}
                </span>
              </div>
            )}

            {/* Кнопка отправки формы */}
            <button type="submit" disabled={loading} style={submitBtnStyle}>
              {loading ? t("loading", "Загрузка...") : authMode === "login" ? t("login_btn", "Войти в систему") : t("register_btn", "Зарегистрироваться")}
            </button>

            {/* Переключатель Вход / Регистрация */}
            <div style={{ marginTop: "20px", textAlign: "center" }}>
              <span onClick={() => switchMode(authMode === "login" ? "register" : "login")} style={{ color: "#60a5fa", cursor: "pointer", fontSize: "14px", textDecoration: "underline" }}>
                {authMode === "login" ? t("no_account", "Ещё нет аккаунта? Зарегистрироваться") : t("have_account", "Уже есть аккаунт? Войти")}
              </span>
            </div>
          </form>
        )}

      </div>
    </div>
  );
}

// Повторяющиеся стили для чистоты кода
const inputStyle = { width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid #475569", backgroundColor: "#334155", color: "white", boxSizing: "border-box", fontSize: "15px" };
const labelStyle = { display: "block", marginBottom: "5px", color: "#94a3b8", fontSize: "14px" };
const titleStyle = { textAlign: "center", marginBottom: "25px", fontSize: "24px", fontWeight: "600" };
const langBtnStyle = { background: "none", border: "1px solid #475569", color: "#94a3b8", padding: "5px 10px", borderRadius: "5px", cursor: "pointer" };
const submitBtnStyle = { width: "100%", padding: "14px", backgroundColor: "#3b82f6", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold", fontSize: "16px" };
const linkBtnStyle = { width: "100%", padding: "10px", background: "none", border: "none", color: "#60a5fa", cursor: "pointer", fontSize: "14px", textDecoration: "underline", marginTop: "10px" };
