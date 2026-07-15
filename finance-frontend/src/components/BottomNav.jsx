import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";

function BottomNav({ onAddClick }) {
  const { t } = useTranslation("translation");

  const linkStyle = ({ isActive }) => ({
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "4px",
    textDecoration: "none",
    color: isActive ? "#3b82f6" : "#94a3b8",
    fontSize: "0.7rem",
    fontWeight: isActive ? "bold" : "normal",
    flex: 1,
    padding: "6px 0"
  });

  return (
    <nav style={{
      position: "fixed",
      bottom: 0,
      left: 0,
      right: 0,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-around",
      backgroundColor: "#1e293b",
      borderTop: "1px solid #334155",
      padding: "8px 0",
      paddingBottom: "calc(8px + env(safe-area-inset-bottom, 0px))",
      zIndex: 1000
    }}>
      <NavLink to="/" style={linkStyle} end>
        <span style={{ fontSize: "1.4rem" }}>🏠</span>
        <span>{t("nav.home", "Главная")}</span>
      </NavLink>

      <NavLink to="/wallets" style={linkStyle}>
        <span style={{ fontSize: "1.4rem" }}>💳</span>
        <span>{t("nav.wallets", "Счета")}</span>
      </NavLink>

      {/* Центральная выделенная кнопка "Добавить" */}
      <button
        onClick={onAddClick}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "56px",
          height: "56px",
          borderRadius: "50%",
          backgroundColor: "#3b82f6",
          border: "4px solid #1e293b",
          color: "white",
          fontSize: "1.8rem",
          fontWeight: "bold",
          cursor: "pointer",
          marginTop: "-28px",
          boxShadow: "0 4px 14px rgba(59, 130, 246, 0.5)",
          flexShrink: 0
        }}
      >
        +
      </button>

      <NavLink to="/reports" style={linkStyle}>
        <span style={{ fontSize: "1.4rem" }}>📊</span>
        <span>{t("nav.reports", "Отчёты")}</span>
      </NavLink>

      <NavLink to="/profile" style={linkStyle}>
        <span style={{ fontSize: "1.4rem" }}>👤</span>
        <span>{t("nav.profile", "Профиль")}</span>
      </NavLink>
    </nav>
  );
}

export default BottomNav;