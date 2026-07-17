import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next"; // Импортируем хук перевода

function PageHeader({ title, showBackButton = true }) {
  const navigate = useNavigate();
  const { t } = useTranslation(["dashboard", "translation"]); // Подключаем пространства имен

  return (
    <div style={{ 
      display: "flex", 
      alignItems: "center", 
      gap: "12px", 
      marginBottom: "20px" 
    }}>
      {showBackButton && (
        <button
          onClick={() => navigate(-1)}
          style={{
            background: "#334155",
            border: "none",
            color: "white",
            padding: "0 16px", // Сделали кнопку овальной, чтобы поместился текст
            height: "40px",
            borderRadius: "20px", // Скругленные края
            display: "flex",
            alignItems: "center",
            gap: "6px", // Расстояние между стрелочкой и текстом
            cursor: "pointer",
            fontSize: "0.95rem",
            fontWeight: "500",
            boxShadow: "0 2px 5px rgba(0,0,0,0.2)",
            whiteSpace: "nowrap"
          }}
        >
          <span>←</span>
          {/* Переводим слово "Назад" с дефолтным значением на русском */}
          <span>{t("common.back", "Назад", { ns: "translation" })}</span> 
        </button>
      )}
      <h1 style={{ fontSize: "1.5rem", margin: 0 }}>{title}</h1>
    </div>
  );
}

export default PageHeader;