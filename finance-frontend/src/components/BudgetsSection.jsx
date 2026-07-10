import { useState, useEffect } from "react"

const API_BASE = "https://finance-backend-tj8e.onrender.com"

function authHeaders() {
  const token = localStorage.getItem("token")
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  }
}

function BudgetsSection() {
  const [categories, setCategories] = useState([])
  const [budgets, setBudgets] = useState([])
  const [insights, setInsights] = useState(null)

  const [selectedCategory, setSelectedCategory] = useState("")
  const [limitAmount, setLimitAmount] = useState("")
  const [loading, setLoading] = useState(false)

  const loadAll = async () => {
    try {
      const [catsRes, budgetsRes, insightsRes] = await Promise.all([
        fetch(`${API_BASE}/categories`, { headers: authHeaders() }),
        fetch(`${API_BASE}/budgets`, { headers: authHeaders() }),
        fetch(`${API_BASE}/report/insights`, { headers: authHeaders() }),
      ])

      const catsData = await catsRes.json()
      const budgetsData = await budgetsRes.json()
      const insightsData = await insightsRes.json()

      // Оставляем только категории расходов — бюджет для доходов не имеет смысла
      setCategories(Array.isArray(catsData) ? catsData.filter(c => c.type === "expense") : [])
      setBudgets(Array.isArray(budgetsData) ? budgetsData : [])
      setInsights(insightsData)
    } catch (error) {
      console.error("Ошибка загрузки данных бюджетов:", error)
    }
  }

  useEffect(() => {
    loadAll()
  }, [])

  const handleCreateBudget = async () => {
    if (!selectedCategory || !limitAmount) {
      alert("Выберите категорию и укажите лимит")
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`${API_BASE}/budgets`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          category_id: parseInt(selectedCategory),
          monthly_limit: parseFloat(limitAmount),
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setLimitAmount("")
        setSelectedCategory("")
        await loadAll()
      } else {
        alert(data.detail || "Не удалось сохранить бюджет")
      }
    } catch (error) {
      console.error("Ошибка создания бюджета:", error)
      alert("Ошибка подключения к серверу")
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteBudget = async (id) => {
    try {
      const response = await fetch(`${API_BASE}/budgets/${id}`, {
        method: "DELETE",
        headers: authHeaders(),
      })

      if (response.ok) {
        await loadAll()
      } else {
        const data = await response.json()
        alert(data.detail || "Не удалось удалить бюджет")
      }
    } catch (error) {
      console.error("Ошибка удаления бюджета:", error)
    }
  }

  const getBarColor = (percent) => {
    if (percent >= 100) return "#ef4444"
    if (percent >= 80) return "#f59e0b"
    return "#22c55e"
  }

  return (
    <div style={{ backgroundColor: "#1e293b", padding: "20px", borderRadius: "15px", marginBottom: "20px" }}>
      <h2 style={{ fontSize: "1.3rem", marginBottom: "20px" }}>Бюджеты и инсайты</h2>

      {/* --- Дневной лимит --- */}
      {insights && (
        <div style={{ backgroundColor: "#334155", padding: "16px", borderRadius: "10px", marginBottom: "20px" }}>
          {insights.daily_allowance !== null ? (
            <>
              <p style={{ color: "#94a3b8", fontSize: "13px", margin: "0 0 4px 0" }}>
                Можно потратить сегодня (осталось {insights.days_remaining} дн. в месяце)
              </p>
              <p style={{
                fontSize: "1.6rem",
                fontWeight: "bold",
                margin: 0,
                color: insights.daily_allowance < 0 ? "#ef4444" : "#3b82f6"
              }}>
                {insights.daily_allowance.toFixed(0)} ₺ / день
              </p>
            </>
          ) : (
            <p style={{ color: "#94a3b8", fontSize: "14px", margin: 0 }}>
              {insights.daily_allowance_note}
            </p>
          )}
        </div>
      )}

      {/* --- Форма добавления бюджета --- */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "20px", flexWrap: "wrap" }}>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          style={{ padding: "10px 14px", borderRadius: "8px", backgroundColor: "#334155", color: "white", border: "1px solid #475569" }}
        >
          <option value="">Выберите категорию</option>
          {categories.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        <input
          type="number"
          placeholder="Лимит в месяц"
          value={limitAmount}
          onChange={(e) => setLimitAmount(e.target.value)}
          style={{ padding: "10px 14px", borderRadius: "8px", backgroundColor: "#334155", color: "white", border: "1px solid #475569", width: "150px" }}
        />

        <button
          onClick={handleCreateBudget}
          disabled={loading}
          style={{ padding: "10px 20px", backgroundColor: "#3b82f6", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" }}
        >
          {loading ? "Сохранение..." : "Задать бюджет"}
        </button>
      </div>

      {/* --- Список бюджетов с прогресс-барами --- */}
      {budgets.length === 0 ? (
        <p style={{ color: "#94a3b8", fontSize: "14px" }}>Бюджеты ещё не заданы</p>
      ) : (
        budgets.map(b => (
          <div key={b.id} style={{ backgroundColor: "#334155", padding: "14px", borderRadius: "10px", marginBottom: "12px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
              <span style={{ fontWeight: "bold" }}>{b.category_name}</span>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ color: "#94a3b8", fontSize: "13px" }}>
                  {b.spent.toFixed(0)} / {b.monthly_limit.toFixed(0)} ₺
                </span>
                <button
                  onClick={() => handleDeleteBudget(b.id)}
                  style={{ padding: "4px 10px", backgroundColor: "#ef4444", color: "white", border: "none", borderRadius: "6px", fontSize: "12px", cursor: "pointer" }}
                >
                  Удалить
                </button>
              </div>
            </div>

            <div style={{ backgroundColor: "#1e293b", borderRadius: "6px", height: "10px", overflow: "hidden" }}>
              <div
                style={{
                  width: `${Math.min(b.percent_used, 100)}%`,
                  backgroundColor: getBarColor(b.percent_used),
                  height: "100%",
                  transition: "width 0.3s",
                }}
              />
            </div>
            <p style={{ margin: "4px 0 0 0", fontSize: "12px", color: "#94a3b8" }}>
              {b.percent_used.toFixed(0)}% использовано
            </p>
          </div>
        ))
      )}

      {/* --- Текстовые инсайты --- */}
      {insights && insights.insights && insights.insights.length > 0 && (
        <div style={{ marginTop: "20px" }}>
          <h3 style={{ fontSize: "1rem", marginBottom: "10px", color: "#e2e8f0" }}>Инсайты</h3>
          {insights.insights.map((text, idx) => (
            <div
              key={idx}
              style={{
                backgroundColor: "#334155",
                padding: "10px 14px",
                borderRadius: "8px",
                marginBottom: "8px",
                fontSize: "14px",
                color: "#e2e8f0",
              }}
            >
              {text}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default BudgetsSection
