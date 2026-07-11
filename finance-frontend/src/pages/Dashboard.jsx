import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  PieChart,
  Pie,
  Cell
} from "recharts";
import BudgetsSection from "../components/BudgetsSection";

const BASE_URL = "https://finance-backend-tj8e.onrender.com";

function Dashboard() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation(["dashboard", "translation"]);

  const [wallets, setWallets] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [report, setReport] = useState(null);
  const [categories, setCategories] = useState([]);

  const [debts, setDebts] = useState([]);
  const [people, setPeople] = useState([]);
  const [newPersonName, setNewPersonName] = useState("");

  const [walletName, setWalletName] = useState("");
  const [walletCurrency, setWalletCurrency] = useState("");
  const [editingWalletId, setEditingWalletId] = useState(null); 
  const [toWalletId, setToWalletId] = useState("");

  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("income");
  const [walletId, setWalletId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [personId, setPersonId] = useState("");
  const [debtId, setDebtId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const [newCategoryName, setNewCategoryName] = useState("");
  const [showNewCategoryForm, setShowNewCategoryForm] = useState(false);

  const [editingTxId, setEditingTxId] = useState(null);
  const [editTxAmount, setEditTxAmount] = useState("");
  const [editTxDescription, setEditTxDescription] = useState("");
  const [editTxType, setEditTxType] = useState("income");
  const [editTxCategoryId, setEditTxCategoryId] = useState("");
  const [editTxWalletId, setEditTxWalletId] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const [period, setPeriod] = useState("month"); 
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [toast, setToast] = useState({ show: false, message: "", type: "success" });

  const showNotification = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type: "success" }), 4000);
  };

  const logout = () => {
    localStorage.removeItem("token");
    navigate("/");
  };

  const getWallets = async () => {
    const token = localStorage.getItem("token");
    const response = await fetch(`${BASE_URL}/wallets`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (response.ok) {
      const data = await response.json();
      setWallets(data);
    }
  };

  const getTransactions = async (id) => {
    const currentId = id || walletId;
    if (!currentId) return;

    const token = localStorage.getItem("token");
    const response = await fetch(`${BASE_URL}/transactions?wallet_id=${currentId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (response.ok) {
      const data = await response.json();
      setTransactions(data);
    }
  };

  const createTransaction = async () => {
    const token = localStorage.getItem("token");
    const currentWalletId = Number(walletId);

    if (!walletId) {
      showNotification(t("notifications.wallet_required"), "error");
      return;
    }

    const parsedAmount = Number(amount);
    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      showNotification(t("notifications.invalid_amount"), "error");
      return;
    }

    if (["loan_given", "loan_taken", "loan_repaid_to_us", "loan_repaid_by_us"].includes(type) && !personId) {
      showNotification(t("notifications.select_contact"), "error");
      return;
    }

    if (["loan_repaid_to_us", "loan_repaid_by_us"].includes(type) && !debtId) {
      showNotification(t("notifications.select_debt"), "error");
      return;
    }

    const response = await fetch(`${BASE_URL}/transactions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        type: type,
        amount: parsedAmount,
        description: description.trim() || t("transaction.without_description"),
        wallet_id: Number(currentWalletId),
        date: new Date(date).toISOString(),
        person_id: ["loan_given", "loan_taken", "loan_repaid_to_us", "loan_repaid_by_us"].includes(type)
          ? (personId ? parseInt(personId) : null)
          : null,
        debt_id: ["loan_repaid_to_us", "loan_repaid_by_us"].includes(type)
          ? (debtId ? parseInt(debtId) : null)
          : null,
        to_wallet_id: type === "transfer" ? parseInt(toWalletId) : null,
        category_id: type === "transfer" ? null : parseInt(categoryId),
      })
    });

    if (response.ok) {
      showNotification(t("notifications.transaction_created"));
      setAmount("");
      setDescription("");
      setCategoryId("");
      setPersonId("");
      setDebtId("");
      getWallets();
      getReport();
      fetchDebtsData();
      setDate(new Date().toISOString().split("T")[0]);
      if (currentWalletId) getTransactions(currentWalletId);
    } else {
      showNotification(t("notifications.transaction_error"), "error");
    }
  };

  const deleteTransaction = async (transactionId) => {
    const token = localStorage.getItem("token");
    const currentWalletId = Number(walletId);

    const response = await fetch(`${BASE_URL}/transactions/${transactionId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` }
    });

    if (response.ok) {
      showNotification(t("notifications.transaction_deleted"));
      getWallets();
      getReport();
      if (currentWalletId) getTransactions(currentWalletId);
    }
  };

  const handleWalletSubmit = async () => {
    if (!walletName.trim() || !walletCurrency.trim()) {
      showNotification(t("notifications.fill_wallet_fields"), "error");
      return;
    }

    const token = localStorage.getItem("token");
    
    if (editingWalletId) {
      const response = await fetch(`${BASE_URL}/wallets/${editingWalletId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: walletName.trim(),
          currency: walletCurrency.trim().toUpperCase()
        })
      });

      if (response.ok) {
        showNotification(t("notifications.wallet_updated"));
        cancelWalletEditing();
        getWallets();
        getReport();
      } else {
        showNotification(t("notifications.wallet_error"), "error");
      }
    } else {
      const response = await fetch(`${BASE_URL}/wallets`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: walletName.trim(),
          currency: walletCurrency.trim().toUpperCase()
        })
      });

      if (response.ok) {
        showNotification(t("notifications.wallet_created"));
        setWalletName("");
        setWalletCurrency("");
        getWallets();
        getReport();
      } else {
        showNotification(t("notifications.wallet_error"), "error");
      }
    }
  };

  const startEditingWallet = (wallet) => {
    setEditingWalletId(wallet.id);
    setWalletName(wallet.name);
    setWalletCurrency(wallet.currency);
  };

  const cancelWalletEditing = () => {
    setEditingWalletId(null);
    setWalletName("");
    setWalletCurrency("");
  };

  const startEditingTransaction = (tx) => {
    setEditingTxId(tx.id || tx.transaction_id);
    setEditTxAmount(tx.amount);
    setEditTxDescription(tx.description);
    setEditTxType(tx.type);
    setEditTxCategoryId(tx.category_id || "");
    setEditTxWalletId(tx.wallet_id || walletId);
  };

  const updateTransaction = async (id) => {
    const token = localStorage.getItem("token");
    const currentWalletId = Number(editTxWalletId) || Number(walletId);

    if (!currentWalletId) {
      showNotification(t("notifications.wallet_not_found"), "error");
      return;
    }

    const parsedAmount = Number(editTxAmount);
    if (!editTxAmount || isNaN(parsedAmount) || parsedAmount <= 0) {
      showNotification(t("notifications.amount_must_be_positive"), "error");
      return;
    }

    try {
      const response = await fetch(`${BASE_URL}/transactions/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          amount: parsedAmount,
          description: editTxDescription.trim(),
          type: editTxType,
          wallet_id: currentWalletId,
          category_id: editTxCategoryId ? Number(editTxCategoryId) : null
        })
      });

      if (response.ok) {
        showNotification(t("notifications.transaction_updated"));
        setEditingTxId(null);
        getWallets();
        getReport();
        getTransactions(currentWalletId);
      } else {
        const errData = await response.json();
        showNotification(errData.detail || t("notifications.transaction_update_error"), "error");
      }
    } catch (error) {
      console.error("Error saving transaction:", error);
    }
  };

  const getReport = async () => {
    const token = localStorage.getItem("token");
    let url = `${BASE_URL}/report`;
    
    const params = new URLSearchParams();
    if (period !== "custom") {
      params.append("period", period);
    } else {
      if (startDate) params.append("start_date", startDate);
      if (endDate) params.append("end_date", endDate);
    }

    const queryString = params.toString();
    if (queryString) url += `?${queryString}`;

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (response.ok) {
      const data = await response.json();
      setReport(data);
    }
  };

  const getCategories = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${BASE_URL}/categories`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
      }
    } catch (error) {
      console.error("Ошибка при получении категорий:", error);
    }
  };

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${BASE_URL}/categories`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ 
          name: newCategoryName.trim(),
          type: type === "income" ? "income" : "expense"
        })
      });

      if (response.ok) {
        const createdCategory = await response.json();
        setCategories([...categories, { ...createdCategory, type: createdCategory.type || type }]); 
        setCategoryId(createdCategory.id);
        setNewCategoryName("");
        setShowNewCategoryForm(false); 
        showNotification(t("notifications.category_created"), "success");
        getCategories();
      } else {
        showNotification(t("notifications.category_error"), "error");
      }
    } catch (error) {
      console.error("Ошибка при создании категории:", error);
      showNotification(t("notifications.network_error"), "error");
    }
  };

  const fetchDebtsData = async () => {
    try {
      const token = localStorage.getItem("token");
      const debtsRes = await fetch(`${BASE_URL}/debts`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const peopleRes = await fetch(`${BASE_URL}/debts/people`, {
        headers: { "Authorization": `Bearer ${token}` }
      });

      if (debtsRes.ok) setDebts(await debtsRes.json());
      if (peopleRes.ok) setPeople(await peopleRes.json());
    } catch (err) {
      console.error("Ошибка при загрузке долгов:", err);
    }
  };

  const handleCreatePerson = async (e) => {
    e.preventDefault();
    if (!newPersonName.trim()) return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${BASE_URL}/debts/people?name=${encodeURIComponent(newPersonName.trim())}`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });

      if (response.ok) {
        setNewPersonName("");
        showNotification(t("notifications.contact_created"), "success");
        fetchDebtsData();
      } else {
        showNotification(t("notifications.contact_error"), "error");
      }
    } catch (error) {
      console.error("Ошибка при создании контакта:", error);
      showNotification(t("notifications.network_error"), "error");
    }
  };

  useEffect(() => {
    getReport();
  }, [period, startDate, endDate]);

  useEffect(() => {
    getWallets();
    getCategories();
    fetchDebtsData();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterType, filterCategory]);

  const chartData = report?.daily_data || [
    { date: "Mon", Income: 0, Expense: 0 },
    { date: "Tue", Income: 0, Expense: 0 },
    { date: "Wed", Income: 0, Expense: 0 },
  ];

  const filteredTransactions = transactions.filter((tx) => {
    const matchesSearch = tx.description
      ? tx.description.toLowerCase().includes(searchTerm.toLowerCase())
      : true;
    const matchesType = filterType === "all" || tx.type === filterType;
    const matchesCategory = filterCategory === "all" || String(tx.category_id) === filterCategory;
    return matchesSearch && matchesType && matchesCategory;
  });

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentTransactions = filteredTransactions.slice(indexOfFirstItem, indexOfLastItem);

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d"];

  const monthlyExpenseData = Array.isArray(report?.expense) ? report.expense : [];
  const monthlyIncomeData = Array.isArray(report?.income) ? report.income : [];

  const formatCategoryName = (name) => {
    if (!name) return t("transactions.no_category");
    return name.startsWith("categories.") ? t(name, { ns: "translation" }) : name;
  };

  const getTypeColor = (txType) => {
    if (["income", "loan_taken", "loan_repaid_to_us"].includes(txType)) return "#22c55e";
    return "#ef4444";
  };

  // Определение системной локали для форматирования дат
  const currentLocale = i18n.language?.startsWith("tr")
    ? "tr-TR"
    : i18n.language?.startsWith("en")
    ? "en-US"
    : "ru-RU";

  return (
    <div style={{ backgroundColor: "#0f172a", minHeight: "100vh", color: "white", padding: "40px", fontFamily: "'Inter', sans-serif, Arial" }}>
      
      {toast.show && (
        <div style={{
          position: "fixed", top: "20px", right: "20px",
          backgroundColor: toast.type === "success" ? "rgba(34, 197, 94, 0.9)" : "rgba(239, 68, 68, 0.9)",
          color: "white", padding: "15px 25px", borderRadius: "12px",
          boxShadow: "0 10px 25px -5px rgba(0,0,0,0.5)", backdropFilter: "blur(10px)",
          zIndex: 1000, fontWeight: "bold", border: "1px solid rgba(255,255,255,0.1)"
        }}>
          {toast.type === "success" ? "✅ " : "❌ "} {toast.message}
        </div>
      )}

      {/* HEADER */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px" }}>
        <div>
          <h1 style={{ fontSize: "2.5rem", fontWeight: "800", margin: 0, background: "linear-gradient(to right, #3b82f6, #a855f7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            {t("title")}
          </h1>
          <p style={{ color: "#64748b", margin: "5px 0 0 0" }}>{t("subtitle")}</p>
          <button 
            onClick={() => window.print()} 
            style={{ padding: "10px 20px", backgroundColor: "#3b82f6", color: "white", borderRadius: "8px", border: "none", cursor: "pointer", marginTop: "10px" }}
          >
            📄 {t("save_pdf")}
          </button>
        </div>
        <button onClick={logout} style={{ padding: "12px 24px", backgroundColor: "#ef4444", color: "white", border: "none", borderRadius: "12px", cursor: "pointer", fontWeight: "bold", boxShadow: "0 4px 14px rgba(239, 68, 68, 0.4)" }}>
          {t("logout")}
        </button>
      </div>

      {/* ТАБЛИЦА ПЕРИОДОВ ВРЕМЕНИ */}
      <div style={{ backgroundColor: "#1e293b", padding: "15px 20px", borderRadius: "15px", marginBottom: "30px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "15px" }}>
        <div style={{ display: "flex", gap: "10px" }}>
          {["week", "month", "year", "custom"].map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              style={{
                padding: "8px 16px", backgroundColor: period === p ? "#3b82f6" : "#334155",
                color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold"
              }}
            >
              {t(`period.${p}`)}
            </button>
          ))}
        </div>

        {period === "custom" && (
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ color: "#94a3b8" }}>{t("period.from")}</span>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={{ padding: "8px 12px", borderRadius: "8px", backgroundColor: "#334155", color: "white", border: "1px solid #475569" }} />
            <span style={{ color: "#94a3b8" }}>{t("period.to")}</span>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={{ padding: "8px 12px", borderRadius: "8px", backgroundColor: "#334155", color: "white", border: "1px solid #475569" }} />
          </div>
        )}
      </div>

      {/* CARDS */}
      {report && (
        <div style={{ display: "flex", gap: "20px", marginBottom: "30px", flexWrap: "wrap" }}>
          <div style={{ backgroundColor: "#1e293b", padding: "25px", borderRadius: "15px", flex: 1, borderLeft: "5px solid #22c55e" }}>
            <h3 style={{ color: "#94a3b8", margin: 0, fontSize: "0.9rem", textTransform: "uppercase" }}>{t("summary.income")}</h3>
            <h1 style={{ color: "#22c55e", margin: "10px 0 0 0", fontSize: "2rem" }}>{report.total_income}</h1>
          </div>
          <div style={{ backgroundColor: "#1e293b", padding: "25px", borderRadius: "15px", flex: 1, borderLeft: "5px solid #ef4444" }}>
            <h3 style={{ color: "#94a3b8", margin: 0, fontSize: "0.9rem", textTransform: "uppercase" }}>{t("summary.expense")}</h3>
            <h1 style={{ color: "#ef4444", margin: "10px 0 0 0", fontSize: "2rem" }}>{report.total_expense}</h1>
          </div>
          <div style={{ backgroundColor: "#1e293b", padding: "25px", borderRadius: "15px", flex: 1, borderLeft: "5px solid #3b82f6" }}>
            <h3 style={{ color: "#94a3b8", margin: 0, fontSize: "0.9rem", textTransform: "uppercase" }}>{t("summary.balance")}</h3>
            <h1 style={{ color: "#3b82f6", margin: "10px 0 0 0", fontSize: "2rem" }}>{report.current_balance}</h1>
          </div>
        </div>
      )}

      {/* CHARTS */}
      <div style={{ display: "flex", gap: "20px", marginBottom: "30px", flexWrap: "wrap" }}>
        <div style={{ backgroundColor: "#1e293b", padding: "20px", borderRadius: "15px", flex: 1, minWidth: "300px", height: "320px" }}>
          <h3 style={{ marginBottom: "15px", marginTop: 0, color: "#cbd5e1" }}>
            {t("charts.daily_trends")} ({period === "custom" ? t("period.custom") : t(`period.${period}`)})
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="date" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip contentStyle={{ backgroundColor: "#1e293b", borderColor: "#475569", color: "#fff", borderRadius: "8px" }} />
              <Legend />
              <Area type="monotone" dataKey="Income" stroke="#22c55e" fill="#22c55e" fillOpacity={0.1} strokeWidth={2} name={t("transaction.income")} />
              <Area type="monotone" dataKey="Expense" stroke="#ef4444" fill="#ef4444" fillOpacity={0.1} strokeWidth={2} name={t("transaction.expense")} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{ display: "flex", gap: "20px", flexWrap: "wrap", marginTop: "30px", marginBottom: "30px", justifyContent: "space-around" }}>
        <div style={{ backgroundColor: "#1e293b", padding: "20px", borderRadius: "12px", width: "45%", minWidth: "300px", textAlign: "center" }}>
          <h3 style={{ color: "white", marginBottom: "15px" }}>{t("charts.expense_analytics")}</h3>
          {monthlyExpenseData.length === 0 ? (
            <p style={{ color: "#64748b", padding: "40px 0" }}>{t("charts.no_expense_data")}</p>
          ) : (
            <div style={{ width: "100%", height: 250 }}>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie 
                    data={monthlyExpenseData} 
                    cx="50%" 
                    cy="50%" 
                    innerRadius={60} 
                    outerRadius={80} 
                    paddingAngle={5} 
                    dataKey="total_amount" 
                    nameKey="category_name"
                    label={(entry) => `${formatCategoryName(entry.category_name)}: ${(entry.percent * 100).toFixed(0)}%`}
                  >
                    {monthlyExpenseData.map((entry, index) => (
                      <Cell key={`expense-cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value, name, props) => [`${Number(value).toFixed(2)} ₺ (${(props.payload.percent * 100).toFixed(0)}%)`, formatCategoryName(name)]} />
                  <Legend formatter={(value) => formatCategoryName(value)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div style={{ backgroundColor: "#1e293b", padding: "20px", borderRadius: "12px", width: "45%", minWidth: "300px", textAlign: "center" }}>
          <h3 style={{ color: "white", marginBottom: "15px" }}>{t("charts.income_analytics")}</h3>
          {monthlyIncomeData.length === 0 ? (
            <p style={{ color: "#64748b", padding: "40px 0" }}>{t("charts.no_income_data")}</p>
          ) : (
            <div style={{ width: "100%", height: 250 }}>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie 
                    data={monthlyIncomeData} 
                    cx="50%" 
                    cy="50%" 
                    innerRadius={60} 
                    outerRadius={80} 
                    paddingAngle={5} 
                    dataKey="total_amount" 
                    nameKey="category_name"
                    label={(entry) => `${formatCategoryName(entry.category_name)}: ${(entry.percent * 100).toFixed(0)}%`}
                  >
                    {monthlyIncomeData.map((entry, index) => (
                      <Cell key={`income-cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value, name, props) => [`${Number(value).toFixed(2)} ₺ (${(props.payload.percent * 100).toFixed(0)}%)`, formatCategoryName(name)]} />
                  <Legend formatter={(value) => formatCategoryName(value)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* ДОЛГИ */}
      <div style={{ backgroundColor: "#1e293b", padding: "20px", borderRadius: "12px", marginBottom: "30px", color: "white" }}>
        <h3 style={{ marginBottom: "20px", borderBottom: "1px solid #334155", paddingBottom: "10px" }}>👥 {t("debts.title")}</h3>

        <form onSubmit={handleCreatePerson} style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
          <input
            type="text"
            placeholder={t("debts.contact_placeholder")}
            value={newPersonName}
            onChange={(e) => setNewPersonName(e.target.value)}
            style={{ flex: 1, padding: "10px", borderRadius: "8px", backgroundColor: "#334155", color: "white", border: "1px solid #475569" }}
          />
          <button type="submit" style={{ padding: "10px 20px", backgroundColor: "#3b82f6", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" }}>
            + {t("debts.add_contact")}
          </button>
        </form>
        
        <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: "280px", backgroundColor: "#0f172a", padding: "15px", borderRadius: "8px" }}>
            <h4 style={{ color: "#10b981", marginBottom: "10px" }}>🟢 {t("debts.they_owe")}</h4>
            {debts.filter(d => d.type === "they_owe").length === 0 ? (
              <p style={{ color: "#64748b", fontSize: "0.9rem" }}>{t("debts.all_paid")}</p>
            ) : (
              debts.filter(d => d.type === "they_owe").map(d => (
                <div key={d.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px dashed #334155" }}>
                  <span>{people.find(p => p.id == d.person_id)?.name || t("debts.unknown_person")}</span>
                  <span style={{ fontWeight: "bold", color: "#10b981" }}>
                    {d.remaining !== undefined ? d.remaining : d.amount} ₺
                    {d.already_paid > 0 && (
                      <span style={{ color: "#64748b", fontWeight: "normal", fontSize: "0.75rem", marginLeft: "6px" }}>
                        ({t("debts.remaining")} {d.amount} ₺)
                      </span>
                    )}
                  </span>
                </div>
              ))
            )}
          </div>

          <div style={{ flex: 1, minWidth: "280px", backgroundColor: "#0f172a", padding: "15px", borderRadius: "8px" }}>
            <h4 style={{ color: "#ef4444", marginBottom: "10px" }}>🔴 {t("debts.we_owe")}</h4>
            {debts.filter(d => d.type === "we_owe").length === 0 ? (
              <p style={{ color: "#64748b", fontSize: "0.9rem" }}>{t("debts.nothing_owed")}</p>
            ) : (
              debts.filter(d => d.type === "we_owe").map(d => (
                <div key={d.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px dashed #334155" }}>
                  <span>{people.find(p => p.id == d.person_id)?.name || t("debts.creditor")}</span>
                  <span style={{ fontWeight: "bold", color: "#ef4444" }}>
                    {d.remaining !== undefined ? d.remaining : d.amount} ₺
                    {d.already_paid > 0 && (
                      <span style={{ color: "#64748b", fontWeight: "normal", fontSize: "0.75rem", marginLeft: "6px" }}>
                        ({t("debts.remaining")} {d.amount} ₺)
                      </span>
                    )}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ФОРМЫ */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "30px" }}>
        
        {/* КОШЕЛЕК */}
        <div style={{ backgroundColor: "#1e293b", padding: "20px", borderRadius: "15px", border: editingWalletId ? "2px solid #3b82f6" : "none" }}>
          <h2 style={{ fontSize: "1.2rem", marginBottom: "15px", borderBottom: "1px solid #334155", paddingBottom: "10px", color: editingWalletId ? "#3b82f6" : "white" }}>
            {editingWalletId ? t("wallet.update") : t("wallet.create")}
          </h2>
          <input type="text" placeholder={t("wallet.name")} value={walletName} onChange={(e) => setWalletName(e.target.value)} style={{ width: "90%", padding: "10px", borderRadius: "8px", backgroundColor: "#334155", color: "white", border: "1px solid #475569", marginBottom: "15px" }} /><br />
          <input type="text" placeholder={t("wallet.currency")} value={walletCurrency} onChange={(e) => setWalletCurrency(e.target.value)} style={{ width: "90%", padding: "10px", borderRadius: "8px", backgroundColor: "#334155", color: "white", border: "1px solid #475569", marginBottom: "15px" }} /><br />
          
          <div style={{ display: "flex", gap: "10px" }}>
            <button onClick={handleWalletSubmit} style={{ flex: 1, padding: "12px", backgroundColor: editingWalletId ? "#22c55e" : "#3b82f6", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" }}>
              {editingWalletId ? t("common.update") : t("common.create")}
            </button>
            {editingWalletId && (
              <button onClick={cancelWalletEditing} style={{ padding: "12px", backgroundColor: "#64748b", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" }}>
                {t("wallet.cancel")}
              </button>
            )}
          </div>
        </div>
        
        {/* СОЗДАНИЕ ТРАНЗАКЦИИ */}
        <div style={{ backgroundColor: "#1e293b", padding: "20px", borderRadius: "15px" }}>
          <h2 style={{ fontSize: "1.2rem", marginBottom: "15px", borderBottom: "1px solid #334155", paddingBottom: "10px" }}>{t("transaction.title")}</h2>
          <input type="number" min="0.01" step="any" placeholder={t("transaction.amount")} value={amount} onChange={(e) => setAmount(e.target.value)} style={{ width: "90%", padding: "10px", borderRadius: "8px", backgroundColor: "#334155", color: "white", border: "1px solid #475569", marginBottom: "15px" }} />
          <input type="text" placeholder={t("transaction.description")} value={description} onChange={(e) => setDescription(e.target.value)} style={{ width: "90%", padding: "10px", borderRadius: "8px", backgroundColor: "#334155", color: "white", border: "1px solid #475569", marginBottom: "15px" }} /><br />
          
          <select value={type} onChange={(e) => setType(e.target.value)} style={{ padding: "10px", borderRadius: "8px", backgroundColor: "#334155", color: "white", border: "1px solid #475569", marginBottom: "15px", width: "95%" }}>
            <option value="income">{t("transaction.income")}</option>
            <option value="expense">{t("transaction.expense")}</option>
            <option value="transfer">{t("transaction.transfer")}</option>
            <option value="loan_given">{t("transaction.loan_given")}</option>
            <option value="loan_taken">{t("transaction.loan_taken")}</option>
            <option value="loan_repaid_to_us">{t("transaction.loan_repaid_to_us")}</option>
            <option value="loan_repaid_by_us">{t("transaction.loan_repaid_by_us")}</option>
          </select>

          {type === "transfer" ? (
            <>
              <label style={{ color: "#94a3b8", fontSize: "0.85rem", display: "block", marginBottom: "5px" }}>{t("wallet.source")}:</label>
              <select value={walletId} onChange={(e) => setWalletId(e.target.value)} style={{ padding: "10px", borderRadius: "8px", backgroundColor: "#334155", color: "white", border: "1px solid #475569", marginBottom: "15px", width: "95%" }}>
                <option value="">{t("wallet.select_source")}</option>
                {wallets.map(w => <option key={w.id} value={w.id}>{w.name} ({w.currency})</option>)}
              </select>

              <label style={{ color: "#94a3b8", fontSize: "0.85rem", display: "block", marginBottom: "5px" }}>{t("wallet.destination")}:</label>
              <select value={toWalletId} onChange={(e) => setToWalletId(e.target.value)} style={{ padding: "10px", borderRadius: "8px", backgroundColor: "#334155", color: "white", border: "1px solid #475569", marginBottom: "15px", width: "95%" }}>
                <option value="">{t("wallet.select_destination")}</option>
                {wallets.filter(w => w.id.toString() !== walletId.toString()).map(w => (
                  <option key={w.id} value={w.id}>{w.name} ({w.currency})</option>
                ))}
              </select>
            </>
          ) : (
            <>
              <select value={walletId} onChange={(e) => { setWalletId(e.target.value); if(typeof getTransactions === 'function') getTransactions(e.target.value); }} style={{ padding: "10px", borderRadius: "8px", backgroundColor: "#334155", color: "white", border: "1px solid #475569", marginBottom: "15px", width: "95%" }}>
                <option value="">{t("wallet.select")}</option>
                {wallets.map(w => <option key={w.id} value={w.id}>{w.name} ({w.currency})</option>)}
              </select>
              <br />
            </>
          )}

          {["loan_given", "loan_taken", "loan_repaid_to_us", "loan_repaid_by_us"].includes(type) && (
            <div style={{ marginBottom: "15px", width: "95%" }}>
              <label style={{ color: "#94a3b8", fontSize: "0.85rem", display: "block", marginBottom: "5px" }}>{t("debts.contact")}:</label>
              <select value={personId} onChange={(e) => setPersonId(e.target.value)} style={{ width: "100%", padding: "10px", borderRadius: "8px", backgroundColor: "#334155", color: "white", border: "1px solid #475569" }}>
                <option value="">{t("debts.select_contact")}</option>
                {people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              {people.length === 0 && <p style={{ color: "#94a3b8", fontSize: "0.8rem", marginTop: "5px" }}>{t("debts.no_contacts")}</p>}
            </div>
          )}

          {["loan_repaid_to_us", "loan_repaid_by_us"].includes(type) && (
            <div style={{ marginBottom: "15px", width: "95%" }}>
              <label style={{ color: "#94a3b8", fontSize: "0.85rem", display: "block", marginBottom: "5px" }}>{t("debts.repay_debt")}:</label>
              <select value={debtId} onChange={(e) => setDebtId(e.target.value)} style={{ width: "100%", padding: "10px", borderRadius: "8px", backgroundColor: "#334155", color: "white", border: "1px solid #475569" }}>
                <option value="">{t("debts.select_debt")}</option>
                {debts
                  .filter(d => type === "loan_repaid_to_us" ? d.type === "they_owe" : d.type === "we_owe")
                  .map(d => {
                    const personName = people.find(p => p.id == d.person_id)?.name || t("debts.unknown_person");
                    const amountToShow = d.remaining !== undefined ? d.remaining : d.amount;
                    return <option key={d.id} value={d.id}>{personName} — {t("wallet.balance")}: {amountToShow} ₺</option>;
                  })}
              </select>
              {debts.filter(d => type === "loan_repaid_to_us" ? d.type === "they_owe" : d.type === "we_owe").length === 0 && (
                <p style={{ color: "#94a3b8", fontSize: "0.8rem", marginTop: "5px" }}>{t("debts.no_active_debts")}</p>
              )}
            </div>
          )}

          {(type === "income" || type === "expense") && (
            <div style={{ marginBottom: "15px", width: "95%" }}>
              <label style={{ color: "#94a3b8", fontSize: "0.85rem", display: "block", marginBottom: "5px" }}>{t("category.title")}:</label>
              <div style={{ display: "flex", gap: "10px" }}>
                <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} style={{ flex: 1, padding: "10px", borderRadius: "8px", backgroundColor: "#334155", color: "white", border: "1px solid #475569" }}>
                  <option value="">{t("category.select")} ({t("category.optional")})</option>
                  {categories
                    .filter(cat => !cat.type || cat.type === type)
                    .map(cat => {
                      const displayName = cat.name.startsWith("categories.") 
                        ? t(cat.name, { ns: "translation" }) 
                        : cat.name;

                      return (
                        <option key={cat.id} value={cat.id}>
                          {displayName}
                        </option>
                      );
                  })}
                </select>
                <button type="button" onClick={() => setShowNewCategoryForm(!showNewCategoryForm)} style={{ padding: "0 15px", borderRadius: "8px", backgroundColor: "#10b981", color: "white", border: "none", cursor: "pointer", fontSize: "1.2rem", fontWeight: "bold" }}>+</button>
              </div>

              {showNewCategoryForm && (
                <form onSubmit={handleCreateCategory} style={{ marginTop: "10px", padding: "10px", borderRadius: "8px", backgroundColor: "#1e293b", border: "1px dashed #475569" }}>
                  <input type="text" placeholder={t("category.placeholder")} value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} style={{ width: "90%", padding: "8px", borderRadius: "6px", backgroundColor: "#334155", color: "white", border: "1px solid #475569", marginBottom: "8px" }} />
                  <div style={{ display: "flex", gap: "10px" }}>
                    <button type="submit" style={{ padding: "5px 10px", borderRadius: "6px", backgroundColor: "#3b82f6", color: "white", border: "none", cursor: "pointer", fontSize: "0.85rem" }}>{t("category.save")}</button>
                    <button type="button" onClick={() => { setShowNewCategoryForm(false); setNewCategoryName(""); }} style={{ padding: "5px 10px", borderRadius: "6px", backgroundColor: "#64748b", color: "white", border: "none", cursor: "pointer", fontSize: "0.85rem" }}>{t("category.cancel")}</button>
                  </div>
                </form>
              )}
            </div>
          )}         
          <div style={{ marginBottom: "15px", width: "95%" }}>
            <label style={{ color: "#94a3b8", fontSize: "0.85rem", display: "block", marginBottom: "5px" }}>{t("transaction.date")}:</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} max={new Date().toISOString().split('T')[0]} style={{ width: "100%", padding: "10px", borderRadius: "8px", backgroundColor: "#334155", color: "white", border: "1px solid #475569" }} />
          </div>       
          <button onClick={createTransaction} style={{ width: "100%", padding: "12px", backgroundColor: "#22c55e", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" }}>
            {t("transaction.create")}
          </button>
        </div>
      </div>
           
      {/* ТАБЛИЦЫ СПИСКОВ */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "20px" }}>
        
        {/* ЛЕВАЯ КОЛОНКА */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* КОШЕЛЬКИ */}
          <div style={{ backgroundColor: "#1e293b", padding: "20px", borderRadius: "15px" }}>
            <h2 style={{ fontSize: "1.3rem", marginBottom: "20px" }}>{t("wallet.title")} ({wallets.length})</h2>
            {wallets.map((wallet) => (
              <div key={wallet.id} style={{ backgroundColor: "#334155", padding: "15px", borderRadius: "12px", marginBottom: "15px", border: editingWalletId === wallet.id ? "1px dashed #3b82f6" : "none" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <h3 style={{ margin: "0 0 5px 0", color: "#f8fafc" }}>{wallet.name}</h3>
                    <p style={{ margin: "5px 0", fontSize: "1.1rem" }}>{t("wallet.balance")}: <strong>{wallet.balance} {wallet.currency}</strong></p>
                    <p style={{ margin: "5px 0", fontSize: "12px", color: "#94a3b8" }}>ID: {wallet.id}</p>
                  </div>
                  <button onClick={() => startEditingWallet(wallet)} style={{ padding: "8px 14px", backgroundColor: editingWalletId === wallet.id ? "#64748b" : "#3b82f6", color: "white", border: "none", borderRadius: "8px", fontWeight: "bold", cursor: "pointer" }} disabled={editingWalletId === wallet.id}>
                    {editingWalletId === wallet.id ? t("wallet.editing") : t("wallet.edit")}
                  </button>
                </div>
              </div>
            ))}
          </div>
          
          <BudgetsSection />
        </div>

        {/* ПРАВАЯ КОЛОНКА (ИСТОРИЯ ТРАНЗАКЦИЙ) */}
        <div style={{ backgroundColor: "#1e293b", padding: "20px", borderRadius: "15px" }}>
          <h2 style={{ fontSize: "1.3rem", marginBottom: "20px" }}>{t("transactions.title")}</h2>

          <div style={{ display: "flex", gap: "10px", marginBottom: "20px", flexWrap: "wrap" }}>
            <input type="text" placeholder={t("transactions.search")} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ flex: 1, minWidth: "150px", padding: "10px 14px", borderRadius: "8px", backgroundColor: "#334155", color: "white", border: "1px solid #475569" }} />
            
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)} style={{ padding: "10px 14px", borderRadius: "8px", backgroundColor: "#334155", color: "white", border: "1px solid #475569" }}>
              <option value="all">{t("transactions.all_types")}</option>
              <option value="income">{t("transaction.income")}</option>
              <option value="expense">{t("transaction.expense")}</option>
              <option value="transfer">{t("transaction.transfer")}</option>
              <option value="loan_given">{t("transaction.loan_given")}</option>
              <option value="loan_taken">{t("transaction.loan_taken")}</option>
              <option value="loan_repaid_to_us">{t("transaction.loan_repaid_to_us")}</option>
              <option value="loan_repaid_by_us">{t("transaction.loan_repaid_by_us")}</option>
            </select>

            <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} style={{ padding: "10px 14px", borderRadius: "8px", backgroundColor: "#334155", color: "white", border: "1px solid #475569" }}>
              <option value="all">{t("transactions.all_categories")}</option>
              {categories.map(c => {
                const categoryFilterName = c.name.startsWith("categories.") ? t(c.name, { ns: "translation" }) : c.name;
                return <option key={c.id} value={c.id}>{categoryFilterName}</option>;
              })}
            </select>
          </div>

          {currentTransactions.length === 0 ? (
            <p style={{ color: "#94a3b8", textAlign: "center", padding: "20px" }}>{t("transactions.not_found")}</p>
          ) : (
            currentTransactions.map((transaction) => {
              const txId = transaction.id || transaction.transaction_id;
              
              const matchedCategory = categories.find(c => String(c.id) === String(transaction.category_id));
              
              const categoryName = matchedCategory 
                ? (matchedCategory.name.startsWith("categories.") 
                  ? t(matchedCategory.name, { ns: "translation" }) 
                  : matchedCategory.name)
                : t("transactions.no_category");
              
              return (
                <div key={txId} style={{ backgroundColor: "#334155", padding: "15px", borderRadius: "12px", marginBottom: "15px" }}>
                  {editingTxId === txId ? (
                    <div>
                      <input type="number" value={editTxAmount} onChange={(e) => setEditTxAmount(e.target.value)} style={{ padding: "8px", borderRadius: "6px", backgroundColor: "#1e293b", color: "white", border: "1px solid #475569", marginBottom: "10px", marginRight: "10px" }} />
                      <input type="text" value={editTxDescription} onChange={(e) => setEditTxDescription(e.target.value)} style={{ padding: "8px", borderRadius: "6px", backgroundColor: "#1e293b", color: "white", border: "1px solid #475569", marginBottom: "10px", width: "50%" }} /><br />
                      
                      <select value={editTxType} onChange={(e) => setEditTxType(e.target.value)} style={{ padding: "8px", borderRadius: "6px", backgroundColor: "#1e293b", color: "white", border: "1px solid #475569", marginRight: "10px", marginBottom: "10px" }}>
                        <option value="income">{t("transaction.income")}</option>
                        <option value="expense">{t("transaction.expense")}</option>
                        <option value="transfer">{t("transaction.transfer")}</option>
                        <option value="loan_given">{t("transaction.loan_given")}</option>
                        <option value="loan_taken">{t("transaction.loan_taken")}</option>
                        <option value="loan_repaid_to_us">{t("transaction.loan_repaid_to_us")}</option>
                        <option value="loan_repaid_by_us">{t("transaction.loan_repaid_by_us")}</option>
                      </select>

                      <select value={editTxCategoryId} onChange={(e) => setEditTxCategoryId(e.target.value)} style={{ padding: "8px", borderRadius: "6px", backgroundColor: "#1e293b", color: "white", border: "1px solid #475569", marginRight: "10px", marginBottom: "10px" }}>
                        <option value="">{t("transactions.no_category")}</option>
                        {categories.map(c => {
                          const editCategoryName = c.name.startsWith("categories.") ? t(c.name, { ns: "translation" }) : c.name;
                          return <option key={c.id} value={c.id}>{editCategoryName}</option>;
                        })}
                      </select>
                      <br />

                      <button onClick={() => updateTransaction(txId)} style={{ padding: "8px 16px", backgroundColor: "#22c55e", color: "white", border: "none", borderRadius: "6px", marginRight: "5px", fontWeight: "bold" }}>{t("transactions.save")}</button>
                      <button onClick={() => setEditingTxId(null)} style={{ padding: "8px 16px", backgroundColor: "#64748b", color: "white", border: "none", borderRadius: "6px" }}>{t("transactions.cancel")}</button>
                    </div>
                  ) : (
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <span style={{ fontSize: "1.2rem", fontWeight: "bold", color: getTypeColor(transaction.type), marginRight: "15px" }}>
                          {["income", "loan_taken", "loan_repaid_to_us"].includes(transaction.type) ? "+" : "-"} {transaction.amount}
                        </span>
                        <span style={{ backgroundColor: "#475569", padding: "4px 8px", borderRadius: "6px", fontSize: "12px", marginRight: "10px" }}>{t(`transaction.${transaction.type}`)}</span>
                        <span style={{ color: "#94a3b8", fontSize: "14px" }}>{categoryName}</span>
                        <p style={{ margin: "5px 0 0 0", color: "#e2e8f0" }}>{transaction.description || t("transaction.without_description")}</p>
                        <p style={{ margin: "4px 0 0 0", color: "#64748b", fontSize: "12px" }}>
                          {transaction.date
                            ? new Date(transaction.date).toLocaleString(currentLocale, {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                          })
                          : ""}
                        </p>
                      </div>
                      <div style={{ display: "flex", gap: "5px" }}>
                        <button onClick={() => startEditingTransaction(transaction)} style={{ padding: "6px 12px", backgroundColor: "#3b82f6", color: "white", border: "none", borderRadius: "6px" }}>{t("transactions.edit")}</button>
                        <button onClick={() => deleteTransaction(txId)} style={{ padding: "6px 12px", backgroundColor: "#ef4444", color: "white", border: "none", borderRadius: "6px" }}>{t("transactions.delete")}</button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;