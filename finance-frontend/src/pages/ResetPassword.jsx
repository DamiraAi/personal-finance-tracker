import { useState } from "react"
import { useNavigate, useSearchParams, Link } from "react-router-dom"
import { useTranslation } from "react-i18next" // Импортируем хук локализации

function ResetPassword() {
  const { t } = useTranslation() // Активируем функцию t()
  const [searchParams] = useSearchParams()
  const token = searchParams.get("token")

  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const navigate = useNavigate()

  const handleSubmit = async () => {
    if (!token) {
      alert(t("alert_missing_token"))
      return
    }

    if (!newPassword || !confirmPassword) {
      alert(t("alert_fill_all_fields"))
      return
    }

    if (newPassword !== confirmPassword) {
      alert(t("alert_pwd_mismatch"))
      return
    }

    if (newPassword.length < 6) {
      alert(t("alert_pwd_too_short"))
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
        alert(data.detail ? t(data.detail) : t("alert_reset_failed"))
      }
    } catch (error) {
      console.error("Ошибка при сбросе пароля:", error)
      alert(t("alert_connection_error"))
    } finally {
      setLoading(false)
    }
  }

  // Экран ошибки, если в ссылке отсутствует токен сессии
  if (!token) {
    return (
      <div style={{ backgroundColor: "#0f172a", minHeight: "100vh", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Arial, sans-serif" }}>
        <div style={{ backgroundColor: "#1e293b", padding: "40px", borderRadius: "15px", maxWidth: "450px", width: "100%", margin: "20px", boxSizing: "border-box", boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.3)", textAlign: "center" }}>
          <h2 style={{ marginBottom: "15px", fontSize: "22px" }}>{t("reset_pwd_invalid_link")}</h2>
          <p style={{ color: "#94a3b8", fontSize: "14px", marginBottom: "20px" }}>
            {t("reset_pwd_missing_token_desc")}
          </p>
          <Link to="/forgot-password" style={{ color: "#60a5fa", fontSize: "14px", textDecoration: "underline" }}>
            {t("reset_pwd_request_again_btn")}
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div style={{ backgroundColor: "#0f172a", minHeight: "100vh", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Arial, sans-serif" }}>
      <div style={{ backgroundColor: "#1e293b", padding: "40px", borderRadius: "15px", maxWidth: "450px", width: "100%", margin: "20px", boxSizing: "border-box", boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.3)" }}>

        <h2 style={{ textAlign: "center", marginBottom: "25px", fontSize: "24px", fontWeight: "600" }}>
          {t("reset_pwd_title")}
        </h2>

        {done ? (
          <>
            <p style={{ color: "#94a3b8", fontSize: "14px", textAlign: "center", lineHeight: "1.6", marginBottom: "20px" }}>
              {t("reset_pwd_success")}
            </p>
            <button
              onClick={() => navigate("/")}
              style={{ width: "100%", padding: "14px", backgroundColor: "#3b82f6", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold", fontSize: "16px" }}
            >
              {t("reset_pwd_go_to_login")}
            </button>
          </>
        ) : (
          <>
            <div style={{ marginBottom: "15px" }}>
              <label style={{ display: "block", marginBottom: "5px", color: "#94a3b8", fontSize: "14px" }}>
                {t("reset_pwd_new_label")}
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid #475569", backgroundColor: "#334155", color: "white", boxSizing: "border-box", fontSize: "15px" }}
              />
            </div>

            <div style={{ marginBottom: "25px" }}>
              <label style={{ display: "block", marginBottom: "5px", color: "#94a3b8", fontSize: "14px" }}>
                {t("reset_pwd_confirm_label")}
              </label>
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
              {loading ? t("reset_pwd_saving") : t("reset_pwd_save_btn")}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export default ResetPassword