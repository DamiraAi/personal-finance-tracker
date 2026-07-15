import { useTranslation } from "react-i18next";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell
} from "recharts";
import { useAppData } from "../context/AppDataContext";
import Tabs from "../components/Tabs";
import BudgetsSection from "../components/BudgetsSection";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d"];

function AnalyticsTab() {
  const { t } = useTranslation(["dashboard", "translation"]);
  const { report, period, setPeriod, startDate, setStartDate, endDate, setEndDate } = useAppData();

  const formatCategoryName = (name) => {
    if (!name) return t("transactions.no_category");
    return name.startsWith("categories.") ? t(name, { ns: "translation" }) : name;
  };

  const chartData = report?.daily_data || [
    { date: "Mon", Income: 0, Expense: 0 },
    { date: "Tue", Income: 0, Expense: 0 },
    { date: "Wed", Income: 0, Expense: 0 },
  ];

  const monthlyExpenseData = Array.isArray(report?.expense) ? report.expense : [];
  const monthlyIncomeData = Array.isArray(report?.income) ? report.income : [];

  return (
    <div>
      {/* Переключатель периода */}
      <div style={{
        backgroundColor: "#1e293b", padding: "15px", borderRadius: "14px", marginBottom: "20px",
        display: "flex", alignItems: "center", flexWrap: "wrap", gap: "10px"
      }}>
        {["week", "month", "year", "custom"].map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            style={{
              padding: "8px 14px", backgroundColor: period === p ? "#3b82f6" : "#334155",
              color: "white", border: "none", borderRadius: "8px", fontWeight: "bold", fontSize: "0.85rem"
            }}
          >
            {t(`period.${p}`)}
          </button>
        ))}

        {period === "custom" && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px", width: "100%", marginTop: "8px" }}>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
              style={{ flex: 1, padding: "8px", borderRadius: "8px", backgroundColor: "#334155", color: "white", border: "1px solid #475569" }} />
            <span style={{ color: "#94a3b8" }}>—</span>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
              style={{ flex: 1, padding: "8px", borderRadius: "8px", backgroundColor: "#334155", color: "white", border: "1px solid #475569" }} />
          </div>
        )}
      </div>

      {/* Карточки доход/расход/баланс */}
      {report && (
        <div style={{ display: "flex", gap: "12px", marginBottom: "20px", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: "140px", backgroundColor: "#1e293b", padding: "18px", borderRadius: "14px", borderLeft: "4px solid #22c55e" }}>
            <p style={{ color: "#94a3b8", margin: 0, fontSize: "0.75rem", textTransform: "uppercase" }}>{t("summary.income")}</p>
            <h2 style={{ color: "#22c55e", margin: "6px 0 0 0", fontSize: "1.3rem" }}>{report.total_income}</h2>
          </div>
          <div style={{ flex: 1, minWidth: "140px", backgroundColor: "#1e293b", padding: "18px", borderRadius: "14px", borderLeft: "4px solid #ef4444" }}>
            <p style={{ color: "#94a3b8", margin: 0, fontSize: "0.75rem", textTransform: "uppercase" }}>{t("summary.expense")}</p>
            <h2 style={{ color: "#ef4444", margin: "6px 0 0 0", fontSize: "1.3rem" }}>{report.total_expense}</h2>
          </div>
          <div style={{ flex: 1, minWidth: "140px", backgroundColor: "#1e293b", padding: "18px", borderRadius: "14px", borderLeft: "4px solid #3b82f6" }}>
            <p style={{ color: "#94a3b8", margin: 0, fontSize: "0.75rem", textTransform: "uppercase" }}>{t("summary.balance")}</p>
            <h2 style={{ color: "#3b82f6", margin: "6px 0 0 0", fontSize: "1.3rem" }}>{report.current_balance}</h2>
          </div>
        </div>
      )}

      {/* График трендов */}
      <div style={{ backgroundColor: "#1e293b", padding: "16px", borderRadius: "14px", marginBottom: "20px", height: "300px" }}>
        <h3 style={{ marginTop: 0, marginBottom: "10px", fontSize: "1rem", color: "#cbd5e1" }}>
          {t("charts.daily_trends")} ({period === "custom" ? t("period.custom") : t(`period.${period}`)})
        </h3>
        <ResponsiveContainer width="100%" height={230}>
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
            <YAxis stroke="#94a3b8" fontSize={12} />
            <Tooltip contentStyle={{ backgroundColor: "#1e293b", borderColor: "#475569", color: "#fff", borderRadius: "8px" }} />
            <Legend />
            <Area type="monotone" dataKey="Income" stroke="#22c55e" fill="#22c55e" fillOpacity={0.1} strokeWidth={2} name={t("transaction.income")} />
            <Area type="monotone" dataKey="Expense" stroke="#ef4444" fill="#ef4444" fillOpacity={0.1} strokeWidth={2} name={t("transaction.expense")} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Круговые диаграммы */}
      <div style={{ backgroundColor: "#1e293b", padding: "16px", borderRadius: "14px", marginBottom: "20px", textAlign: "center" }}>
        <h3 style={{ color: "white", marginBottom: "10px", fontSize: "1rem" }}>{t("charts.expense_analytics")}</h3>
        {monthlyExpenseData.length === 0 ? (
          <p style={{ color: "#64748b", padding: "30px 0" }}>{t("charts.no_expense_data")}</p>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={monthlyExpenseData} cx="50%" cy="50%" innerRadius={55} outerRadius={75}
                paddingAngle={5} dataKey="total_amount" nameKey="category_name"
                label={(entry) => `${formatCategoryName(entry.category_name)}: ${(entry.percent * 100).toFixed(0)}%`}
              >
                {monthlyExpenseData.map((entry, index) => (
                  <Cell key={`expense-cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value, name, props) => [`${Number(value).toFixed(2)} (${(props.payload.percent * 100).toFixed(0)}%)`, formatCategoryName(name)]} />
              <Legend formatter={(value) => formatCategoryName(value)} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>

      <div style={{ backgroundColor: "#1e293b", padding: "16px", borderRadius: "14px", textAlign: "center" }}>
        <h3 style={{ color: "white", marginBottom: "10px", fontSize: "1rem" }}>{t("charts.income_analytics")}</h3>
        {monthlyIncomeData.length === 0 ? (
          <p style={{ color: "#64748b", padding: "30px 0" }}>{t("charts.no_income_data")}</p>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={monthlyIncomeData} cx="50%" cy="50%" innerRadius={55} outerRadius={75}
                paddingAngle={5} dataKey="total_amount" nameKey="category_name"
                label={(entry) => `${formatCategoryName(entry.category_name)}: ${(entry.percent * 100).toFixed(0)}%`}
              >
                {monthlyIncomeData.map((entry, index) => (
                  <Cell key={`income-cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value, name, props) => [`${Number(value).toFixed(2)} (${(props.payload.percent * 100).toFixed(0)}%)`, formatCategoryName(name)]} />
              <Legend formatter={(value) => formatCategoryName(value)} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

function Reports() {
  const { t } = useTranslation(["dashboard", "translation"]);

  return (
    <div style={{ padding: "20px", color: "white" }}>
      <h1 style={{ fontSize: "1.5rem", marginBottom: "20px" }}>
        {t("reports.title", { ns: "translation" })}
      </h1>
      <Tabs
        tabs={[
          { label: t("reports.analytics_tab", { ns: "translation" }), content: <AnalyticsTab /> },
          { label: t("reports.budgets_tab", { ns: "translation" }), content: <BudgetsSection /> },
        ]}
      />
    </div>
  );
}

export default Reports;