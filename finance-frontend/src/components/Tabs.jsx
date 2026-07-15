import { useState } from "react";

function Tabs({ tabs, defaultTab = 0 }) {
  const [activeIndex, setActiveIndex] = useState(defaultTab);

  return (
    <div>
      {/* Переключатели табов */}
      <div style={{
        display: "flex",
        gap: "8px",
        backgroundColor: "#1e293b",
        padding: "6px",
        borderRadius: "12px",
        marginBottom: "20px"
      }}>
        {tabs.map((tab, index) => (
          <button
            key={index}
            onClick={() => setActiveIndex(index)}
            style={{
              flex: 1,
              padding: "10px 16px",
              borderRadius: "8px",
              border: "none",
              cursor: "pointer",
              fontWeight: "bold",
              fontSize: "0.95rem",
              backgroundColor: activeIndex === index ? "#3b82f6" : "transparent",
              color: activeIndex === index ? "white" : "#94a3b8",
              transition: "all 0.2s ease"
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Контент активного таба */}
      <div>
        {tabs[activeIndex].content}
      </div>
    </div>
  );
}

export default Tabs;