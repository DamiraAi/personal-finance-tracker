import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import PageHeader from "../components/PageHeader";

function Profile() {
  const { t, i18n } = useTranslation(["dashboard", "translation"]);
  const navigate = useNavigate();

  const languages = [
    { code: "ru", label: "Русский", flag: "🇷🇺" },
    { code: "en", label: "English", flag: "🇺🇸" },
    { code: "tr", label: "Türkçe", flag: "🇹🇷" },
  ];

  // Получаем чистый двухбуквенный код текущего языка (из "ru-RU" делает "ru")
  const currentLangCode = i18n.language?.split("-")[0] || "ru";

  const changeLanguage = (code) => {
    i18n.changeLanguage(code);
    localStorage.setItem("i18nextLng", code);
  };

  const handleLogout = () => {
    // Сохраняем язык перед полной очисткой хранилища
    const currentLng = localStorage.getItem("i18nextLng");
    
    localStorage.clear(); // Безопасно очищаем все сессионные данные
    
    if (currentLng) {
      localStorage.setItem("i18nextLng", currentLng);
    }
    
    navigate("/");
  };

  return (
    <div style={{ padding: "20px", color: "white" }}>
      <PageHeader title={t("profile.title", "Профиль")} />

      {/* Переключатель языка */}
      <div style={{ backgroundColor: "#1e293b", padding: "16px", borderRadius: "14px", marginBottom: "20px" }}>
        <p style={{ color: "#94a3b8", marginBottom: "12px", fontSize: "0.9rem" }}>
          {t("profile.language", "Язык приложения")}
        </p>
        <div style={{ display: "flex", gap: "8px" }}>
          {languages.map((lang) => {
            const isActive = currentLangCode === lang.code;
            return (
              <button
                key={lang.code}
                onClick={() => changeLanguage(lang.code)}
                style={{
                  flex: 1,
                  padding: "12px 8px",
                  borderRadius: "10px",
                  border: isActive ? "2px solid #3b82f6" : "2px solid transparent",
                  backgroundColor: isActive ? "#1e3a5f" : "#334155",
                  color: "white",
                  cursor: "pointer",
                  fontSize: "0.85rem",
                  transition: "all 0.2s ease" // Добавлена плавная анимация при переключении
                }}
              >
                <div style={{ fontSize: "1.4rem", marginBottom: "4px" }}>{lang.flag}</div>
                {lang.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Выход */}
      <button
        onClick={handleLogout}
        style={{ width: "100%", padding: "14px", backgroundColor: "#ef4444", color: "white", border: "none", borderRadius: "10px", fontWeight: "bold", cursor: "pointer" }}
      >
        {t("profile.logout", "Выйти из аккаунта")}
      </button>
    </div>
  );
}

export default Profile;