import { useState } from "react"
import { useNavigate, useSearchParams, Link } from "react-router-dom"

function ResetPassword() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get("token")

  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const navigate = useNavigate()

  const handleSubmit = async () => {
    if (!token) {
      alert("Ссылка недействительна: отсутствует токен")
      return
    }

    if (!newPassword || !confirmPassword) {
      alert("Пожалуйста, заполните оба поля")
      return
    }

    if (newPassword !== confirmPassword) {
      alert("Пароли не совпадают")
      return
    }

    if (newPassword.length < 6) {
      alert("Пароль должен содержать минимум 6 символов")
      return
    }

    setLoading(true)

    try {
      const response = await fetch("https://finance-backend-tj8e.onrender.com/password-recovery/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, new_password: newPassword })
      })

      const data = await response.json()

      if (response.ok) {
        setDone(true)
      } else {
        alert(data.detail || "Не удалось сбросить пароль. Возможно, ссылка устарела.")
      }
    } catch (error) {
      console.error("Ошибка при сбросе пароля:", error)
      alert("Ошибка подключения к серверу бэкенда")
    } finally {
      setLoading(false)
    }
  }

  // Если в ссылке вообще нет токена — сразу показываем ошибку, без формы
  if (!token) {
    return (
      <div style={{ backgroundColor: "#0f172a", minHeight: "100vh", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Arial, sans-serif" }}>
        <div style={{ backgroundColor: "#1e293b", padding: "40px", borderRadius: "15px", maxWidth: "450px", width: "100%", margin: "20px", boxSizing: "border-box", boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.3)", textAlign: "center" }}>
          <h2 style={{ marginBottom: "15px", fontSize: "22px" }}>Ссылка недействительна</h2>
          <p style={{ color: "#94a3b8", fontSize: "14px", marginBottom: "20px" }}>
            В ссылке отсутствует токен сброса пароля. Запросите восстановление пароля заново.
          </p>
          <Link to="/forgot-password" style={{ color: "#60a5fa", fontSize: "14px", textDecoration: "underline" }}>
            Запросить сброс пароля
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div style={{ backgroundColor: "#0f172a", minHeight: "100vh", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Arial, sans-serif" }}>
      <div style={{ backgroundColor: "#1e293b", padding: "40px", borderRadius: "15px", maxWidth: "450px", width: "100%", margin: "20px", boxSizing: "border-box", boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.3)" }}>

        <h2 style={{ textAlign: "center", marginBottom: "25px", fontSize: "24px", fontWeight: "600" }}>
          Новый пароль
        </h2>

        {done ? (
          <>
            <p style={{ color: "#94a3b8", fontSize: "14px", textAlign: "center", lineHeight: "1.6", marginBottom: "20px" }}>
              Пароль успешно обновлён. Теперь можно войти с новым паролем.
            </p>
            <button
              onClick={() => navigate("/")}
              style={{ width: "100%", padding: "14px", backgroundColor: "#3b82f6", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold", fontSize: "16px" }}
            >
              Перейти ко входу
            </button>
          </>
        ) : (
          <>
            <div style={{ marginBottom: "15px" }}>
              <label style={{ display: "block", marginBottom: "5px", color: "#94a3b8", fontSize: "14px" }}>Новый пароль</label>
              <input
                type="password"
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid #475569", backgroundColor: "#334155", color: "white", boxSizing: "border-box", fontSize: "15px" }}
              />
            </div>

            <div style={{ marginBottom: "25px" }}>
              <label style={{ display: "block", marginBottom: "5px", color: "#94a3b8", fontSize: "14px" }}>Повторите пароль</label>
              <input
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid #475569", backgroundColor: "#334155", color: "white", boxSizing: "border-box", fontSize: "15px" }}
              />
            </div>

            <button
              onClick={handleSubmit}
              disabled={loading}
              style={{ width: "100%", padding: "14px", backgroundColor: "#3b82f6", color: "white", border: "none", borderRadius: "8px", cursor: loading ? "default" : "pointer", fontWeight: "bold", fontSize: "16px", opacity: loading ? 0.7 : 1 }}
            >
              {loading ? "Сохранение..." : "Сохранить новый пароль"}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export default ResetPassword
