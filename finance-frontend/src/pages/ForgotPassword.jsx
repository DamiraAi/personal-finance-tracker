import { useState } from "react"
import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next" // <-- Импортируем хук локализации

function ForgotPassword() {
  const { t } = useTranslation() // <-- Подключаем функцию перевода t()
  
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async () => {
    if (!email) {
      alert(t("alert_enter_email")) // <-- Перевод алерта
      return
    }

    setLoading(true)

    try {
      const response = await fetch("https://finance-backend-tj8e.onrender.com/password-recovery/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      })

      const data = await response.json()

      if (response.ok) {
        setSent(true)
      } else {
        // Проверяем, вернул ли бэкенд ключ, иначе используем дефолтный перевод ошибки
        alert(data.detail ? t(data.detail) : t("alert_send_error"))
      }
    } catch (error) {
      console.error("Ошибка при запросе сброса пароля:", error)
      alert(t("alert_server_error")) // <-- Перевод ошибки сети
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ backgroundColor: "#0f172a", minHeight: "100vh", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Arial, sans-serif" }}>
      <div style={{ backgroundColor: "#1e293b", padding: "40px", borderRadius: "15px", maxWidth: "450px", width: "100%", margin: "20px", boxSizing: "border-box", boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.3)" }}>

        <h2 style={{ textAlign: "center", marginBottom: "15px", fontSize: "24px", fontWeight: "600" }}>
          {t("forgot_password_title")} {/* <-- Название формы */}
        </h2>

        {sent ? (
          <>
            <p style={{ color: "#94a3b8", fontSize: "14px", textAlign: "center", lineHeight: "1.6", marginBottom: "10px" }}>
              {t("forgot_password_success")} {/* <-- Сообщение об успешной отправке */}
            </p>
            <div style={{ marginTop: "20px", textAlign: "center" }}>
              <Link to="/" style={{ color: "#60a5fa", fontSize: "14px", textDecoration: "underline" }}>
                {t("back_to_login")} {/* <-- Ссылка назад */}
              </Link>
            </div>
          </>
        ) : (
          <>
            <p style={{ color: "#94a3b8", fontSize: "14px", textAlign: "center", marginBottom: "25px" }}>
              {t("forgot_password_desc")} {/* <-- Описание действия */}
            </p>

            <div style={{ marginBottom: "25px" }}>
              <label style={{ display: "block", marginBottom: "5px", color: "#94a3b8", fontSize: "14px" }}>
                {t("email_label")} {/* <-- Лейбл поля */}
              </label>
              <input
                type="email"
                placeholder="example@mail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid #475569", backgroundColor: "#334155", color: "white", boxSizing: "border-box", fontSize: "15px" }}
              />
            </div>

            <button
              onClick={handleSubmit}
              disabled={loading}
              style={{ width: "100%", padding: "14px", backgroundColor: "#3b82f6", color: "white", border: "none", borderRadius: "8px", cursor: loading ? "default" : "pointer", fontWeight: "bold", fontSize: "16px", opacity: loading ? 0.7 : 1 }}
            >
              {loading ? t("sending_btn") : t("send_link_btn")} {/* <-- Состояние кнопки */}
            </button>

            <div style={{ marginTop: "20px", textAlign: "center" }}>
              <Link to="/" style={{ color: "#60a5fa", fontSize: "14px", textDecoration: "underline" }}>
                {t("back_to_login")} {/* <-- Ссылка назад */}
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default ForgotPassword