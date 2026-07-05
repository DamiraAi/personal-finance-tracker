import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
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
} from "recharts"

// Базовый URL твоего живого сервера в интернете
const BASE_URL = "https://finance-backend-tj8e.onrender.com"

function Dashboard() {
  const navigate = useNavigate()

  // Основные стейты данных
  const [wallets, setWallets] = useState([])
  const [transactions, setTransactions] = useState([])
  const [report, setReport] = useState(null)
  const [categories, setCategories] = useState([])

  // Стейты форм кошельков (теперь используются и для создания, и для редактирования)
  const [walletName, setWalletName] = useState("")
  const [walletCurrency, setWalletCurrency] = useState("")
  const [editingWalletId, setEditingWalletId] = useState(null) // null = создание, id = редактирование
  const [toWalletId, setToWalletId] = useState("");
  // Стейты форм создания транзакций
  const [amount, setAmount] = useState("")
  const [description, setDescription] = useState("")
  const [type, setType] = useState("income")
  const [walletId, setWalletId] = useState("")
  const [categoryId, setCategoryId] = useState("")
  
  // Категории: имя и тип (расход/доход)
  const [newCategoryName, setNewCategoryName] = useState("")
  const [newCategoryType, setNewCategoryType] = useState("expense") 

  // Стейты редактирования транзакции
  const [editingTxId, setEditingTxId] = useState(null)
  const [editTxAmount, setEditTxAmount] = useState("")
  const [editTxDescription, setEditTxDescription] = useState("")
  const [editTxType, setEditTxType] = useState("income")
  const [editTxCategoryId, setEditTxCategoryId] = useState("")
  const [editTxWalletId, setEditTxWalletId] = useState("")

  // Стейты фильтрации
  const [searchTerm, setSearchTerm] = useState("")
  const [filterType, setFilterType] = useState("all")
  const [filterCategory, setFilterCategory] = useState("all")

  // Стейты пагинации
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 5

  // Стейты периодов для графиков и отчетов
  const [period, setPeriod] = useState("month") // week, month, year, custom
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")

  // Стейт красивого уведомления (Toast)
  const [toast, setToast] = useState({ show: false, message: "", type: "success" })

  const showNotification = (message, type = "success") => {
    setToast({ show: true, message, type })
    setTimeout(() => setToast({ show: false, message: "", type: "success" }), 4000)
  }

  

  const logout = () => {
    localStorage.removeItem("token")
    navigate("/")
  }

  // Получение кошельков
  const getWallets = async () => {
    const token = localStorage.getItem("token")
    const response = await fetch(`${BASE_URL}/wallets`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    if (response.ok) {
      const data = await response.json()
      setWallets(data)
    }
  }

  // Получение транзакций конкретного кошелька
  const getTransactions = async (id) => {
    const currentId = id || walletId
    if (!currentId) return

    const token = localStorage.getItem("token")
    const response = await fetch(`${BASE_URL}/transactions?wallet_id=${currentId}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    if (response.ok) {
      const data = await response.json()
      setTransactions(data)
    }
  }

  // Создание транзакции
  const createTransaction = async () => {
    const token = localStorage.getItem("token")
    const currentWalletId = Number(walletId)

    if (!walletId) {
      showNotification("Пожалуйста, выберите кошелек!", "error")
      return
    }

    const parsedAmount = Number(amount)
    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      showNotification("Введите корректную сумму больше 0!", "error")
      return
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
        description: description.trim() || "Без описания",
        wallet_id: Number(currentWalletId),
        
        // НОВОЕ: Отправляем точную дату в формате ISO, который требует FastAPI
        date: new Date().toISOString(),
        
        // Передаем ID категории (если не выбрана — передаем null или 0)
        category_id: categoryId ? Number(categoryId) : null,
        
        // НОВОЕ: Добавляем person_id и debt_id из схемы бэкенда
        person_id: null, 
        debt_id: null,
        // Внутри тела запроса при создании транзакции убедись, что передается:
        to_wallet_id: type === "transfer" ? parseInt(toWalletId) : null,
        category_id: type === "transfer" ? null : parseInt(categoryId),
      })
    })

    if (response.ok) {
      showNotification("Транзакция успешно добавлена!")
      setAmount("")
      setDescription("")
      setCategoryId("")
      getWallets()
      getReport()
      if (currentWalletId) getTransactions(currentWalletId)
    } else {
      showNotification("Ошибка создания транзакции", "error")
    }
  }

  // Удаление транзакции
  const deleteTransaction = async (transactionId) => {
    const token = localStorage.getItem("token")
    const currentWalletId = Number(walletId)

    const response = await fetch(`${BASE_URL}/transactions/${transactionId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` }
    })

    if (response.ok) {
      showNotification("Транзакция удалена")
      getWallets()
      getReport()
      if (currentWalletId) getTransactions(currentWalletId)
    }
  }

  // Единая функция для обработки кнопки кошелька (Создание или Обновление)
  const handleWalletSubmit = async () => {
    if (!walletName.trim() || !walletCurrency.trim()) {
      showNotification("Заполните все поля кошелька!", "error")
      return
    }

    const token = localStorage.getItem("token")
    
    if (editingWalletId) {
      // --- РЕЖИМ РЕДАКТИРОВАНИЯ (PUT) ---
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
      })

      if (response.ok) {
        showNotification("Кошелек успешно обновлен")
        cancelWalletEditing()
        getWallets()
        getReport()
      } else {
        showNotification("Ошибка при обновлении кошелька", "error")
      }
    } else {
      // --- РЕЖИМ СОЗДАНИЯ (POST) ---
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
      })

      if (response.ok) {
        showNotification("Кошелек успешно создан")
        setWalletName("")
        setWalletCurrency("")
        getWallets()
        getReport()
      } else {
        showNotification("Ошибка при создании кошелька", "error")
      }
    }
  }

  // Вход в режим редактирования кошелька (перенос данных в главную форму)
  const startEditingWallet = (wallet) => {
    setEditingWalletId(wallet.id)
    setWalletName(wallet.name)
    setWalletCurrency(wallet.currency)
  }

  // Выход из режима редактирования кошелька
  const cancelWalletEditing = () => {
    setEditingWalletId(null)
    setWalletName("")
    setWalletCurrency("")
  }

  // Создание категории
  const createCategory = async () => {
    if (!newCategoryName.trim()) return
    
    const token = localStorage.getItem("token")
    const response = await fetch(`${BASE_URL}/categories`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        name: newCategoryName.trim()
      })
    })

    if (response.ok) {
      showNotification("Категория добавлена")
      setNewCategoryName("")
      getCategories()
    } else {
      const errorData = await response.json()
      showNotification(errorData.detail || "Ошибка создания категории", "error")
    }
  }

  const startEditingTransaction = (tx) => {
    setEditingTxId(tx.id || tx.transaction_id)
    setEditTxAmount(tx.amount)
    setEditTxDescription(tx.description)
    setEditTxType(tx.type)
    setEditTxCategoryId(tx.category_id || "")
    setEditTxWalletId(tx.wallet_id || walletId)
  }

  // Изменение транзакции
  const updateTransaction = async (id) => {
    const token = localStorage.getItem("token")
    const currentWalletId = Number(editTxWalletId) || Number(walletId)

    if (!currentWalletId) {
      showNotification("Ошибка: ID кошелька потерян.", "error")
      return
    }

    const parsedAmount = Number(editTxAmount)
    if (!editTxAmount || isNaN(parsedAmount) || parsedAmount <= 0) {
      showNotification("Сумма должна быть числом больше 0!", "error")
      return
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
      })

      if (response.ok) {
        showNotification("Транзакция сохранена")
        setEditingTxId(null)
        getWallets()
        getReport()
        getTransactions(currentWalletId)
      } else {
        const errData = await response.json()
        showNotification(errData.detail || "Ошибка обновления", "error")
      }
    } catch (error) {
      console.error("Error saving transaction:", error)
    }
  }

  // Получение аналитических отчетов по датам
  const getReport = async () => {
    const token = localStorage.getItem("token")
    let url = `${BASE_URL}/report`
    
    const params = new URLSearchParams()
    if (period !== "custom") {
      params.append("period", period)
    } else {
      if (startDate) params.append("start_date", startDate)
      if (endDate) params.append("end_date", endDate)
    }

    const queryString = params.toString()
    if (queryString) url += `?${queryString}`

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    })
    if (response.ok) {
      const data = await response.json()
      setReport(data)
    }
  }

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

  // 2. Создание категории
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
          name: newCategoryName,
          type: newCategoryType
        })
      });

      if (response.ok) {
        setNewCategoryName("");
        showNotification("Категория успешно создана!", "success");
        getCategories();
      } else {
        const errorData = await response.json();
        showNotification(`Ошибка: ${errorData.detail || "Не удалось создать"}`, "error");
      }
    } catch (error) {
      console.error("Ошибка при создании категории:", error);
      showNotification("Произошла ошибка сети", "error");
    }
  };

  useEffect(() => {
    getReport()
  }, [period, startDate, endDate])

  useEffect(() => {
    getWallets()
    getCategories()
  }, [])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, filterType, filterCategory])

  const chartData = report?.daily_data || [
    { date: "Mon", Income: 0, Expense: 0 },
    { date: "Tue", Income: 0, Expense: 0 },
    { date: "Wed", Income: 0, Expense: 0 },
  ]

  const pieData = report?.categories_data && report.categories_data.length > 0 
  ? report.categories_data.map(item => ({
      name: item.name || "Без названия", 
      value: Number(item.value) || 0
    }))
  : [{ name: "Нет расходов", value: 0 }]

  // Фильтрация транзакций "на лету"
  const filteredTransactions = transactions.filter((tx) => {
    const matchesSearch = tx.description
      ? tx.description.toLowerCase().includes(searchTerm.toLowerCase())
      : true
    const matchesType = filterType === "all" || tx.type === filterType
    const matchesCategory = filterCategory === "all" || String(tx.category_id) === filterCategory
    return matchesSearch && matchesType && matchesCategory
  })

  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentTransactions = filteredTransactions.slice(indexOfFirstItem, indexOfLastItem)
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage)

  const COLORS = ["#ef4444", "#3b82f6", "#eab308", "#a855f7", "#ec4899", "#22c55e", "#64748b"]

  const getTypeColor = (txType) => {
    if (["income", "loan_taken", "loan_repaid_to_us"].includes(txType)) return "#22c55e"
    return "#ef4444"
  }

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
          <h1 style={{ fontSize: "2.5rem", fontWeight: "800", margin: 0, background: "linear-gradient(to right, #3b82f6, #a855f7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Finance Dashboard</h1>
          <p style={{ color: "#64748b", margin: "5px 0 0 0" }}>Управляйте своими бюджетами и счетами в одном месте</p>
        </div>
        <button onClick={logout} style={{ padding: "12px 24px", backgroundColor: "#ef4444", color: "white", border: "none", borderRadius: "12px", cursor: "pointer", fontWeight: "bold", boxShadow: "0 4px 14px rgba(239, 68, 68, 0.4)" }}>
          Logout
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
              {p === "week" ? "Неделя" : p === "month" ? "Месяц" : p === "year" ? "Год" : "Кастомно"}
            </button>
          ))}
        </div>

        {period === "custom" && (
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={{ padding: "8px 12px", borderRadius: "8px", backgroundColor: "#334155", color: "white", border: "1px solid #475569" }} />
            <span style={{ color: "#94a3b8" }}>по</span>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={{ padding: "8px 12px", borderRadius: "8px", backgroundColor: "#334155", color: "white", border: "1px solid #475569" }} />
          </div>
        )}
      </div>

      {/* CARDS */}
      {report && (
        <div style={{ display: "flex", gap: "20px", marginBottom: "30px", flexWrap: "wrap" }}>
          <div style={{ backgroundColor: "#1e293b", padding: "25px", borderRadius: "15px", flex: 1, borderLeft: "5px solid #22c55e" }}>
            <h3 style={{ color: "#94a3b8", margin: 0, fontSize: "0.9rem", textTransform: "uppercase" }}>Total Income</h3>
            <h1 style={{ color: "#22c55e", margin: "10px 0 0 0", fontSize: "2rem" }}>{report.total_income}</h1>
          </div>
          <div style={{ backgroundColor: "#1e293b", padding: "25px", borderRadius: "15px", flex: 1, borderLeft: "5px solid #ef4444" }}>
            <h3 style={{ color: "#94a3b8", margin: 0, fontSize: "0.9rem", textTransform: "uppercase" }}>Total Expense</h3>
            <h1 style={{ color: "#ef4444", margin: "10px 0 0 0", fontSize: "2rem" }}>{report.total_expense}</h1>
          </div>
          <div style={{ backgroundColor: "#1e293b", padding: "25px", borderRadius: "15px", flex: 1, borderLeft: "5px solid #3b82f6" }}>
            <h3 style={{ color: "#94a3b8", margin: 0, fontSize: "0.9rem", textTransform: "uppercase" }}>Net Balance</h3>
            <h1 style={{ color: "#3b82f6", margin: "10px 0 0 0", fontSize: "2rem" }}>{report.net}</h1>
          </div>
        </div>
      )}

      {/* CHARTS */}
      <div style={{ display: "flex", gap: "20px", marginBottom: "30px", flexWrap: "wrap" }}>
        <div style={{ backgroundColor: "#1e293b", padding: "20px", borderRadius: "15px", flex: 2, minWidth: "300px", height: "320px" }}>
          <h3 style={{ marginBottom: "15px", marginTop: 0, color: "#cbd5e1" }}>Daily Trends ({period === "custom" ? "Кастомно" : period})</h3>
          <ResponsiveContainer width="100%" height="80%">
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="date" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip contentStyle={{ backgroundColor: "#1e293b", borderColor: "#475569", color: "#fff", borderRadius: "8px" }} />
              <Legend />
              <Area type="monotone" dataKey="Income" stroke="#22c55e" fill="#22c55e" fillOpacity={0.1} strokeWidth={2} name="Income" />
              <Area type="monotone" dataKey="Expense" stroke="#ef4444" fill="#ef4444" fillOpacity={0.1} strokeWidth={2} name="Expense" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div style={{ backgroundColor: "#1e293b", padding: "20px", borderRadius: "15px", flex: 1, minWidth: "280px", height: "320px", display: "flex", flexDirection: "column", alignItems: "center" }}>
          <h3 style={{ marginTop: 0, color: "#cbd5e1" }}>Expenses by Category</h3>
          <ResponsiveContainer width="100%" height="80%">
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={5} dataKey="value" style={{ outline: "none" }}>
                {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: "#1e293b", borderColor: "#475569", color: "#fff", borderRadius: "8px" }} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* FORMS */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "20px", marginBottom: "30px" }}>
        
        {/* CREATE / UPDATE WALLET FORM */}
        <div style={{ backgroundColor: "#1e293b", padding: "20px", borderRadius: "15px", border: editingWalletId ? "2px solid #3b82f6" : "none" }}>
          <h2 style={{ fontSize: "1.2rem", marginBottom: "15px", borderBottom: "1px solid #334155", paddingBottom: "10px", color: editingWalletId ? "#3b82f6" : "white" }}>
            {editingWalletId ? "Update Wallet" : "Create Wallet"}
          </h2>
          <input type="text" placeholder="Wallet name" value={walletName} onChange={(e) => setWalletName(e.target.value)} style={{ width: "90%", padding: "10px", borderRadius: "8px", backgroundColor: "#334155", color: "white", border: "1px solid #475569", marginBottom: "15px" }} /><br />
          <input type="text" placeholder="Currency (USD, EUR, TRY)" value={walletCurrency} onChange={(e) => setWalletCurrency(e.target.value)} style={{ width: "90%", padding: "10px", borderRadius: "8px", backgroundColor: "#334155", color: "white", border: "1px solid #475569", marginBottom: "15px" }} /><br />
          
          <div style={{ display: "flex", gap: "10px" }}>
            <button onClick={handleWalletSubmit} style={{ flex: 1, padding: "12px", backgroundColor: editingWalletId ? "#22c55e" : "#3b82f6", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" }}>
              {editingWalletId ? "Update Wallet" : "Create Wallet"}
            </button>
            {editingWalletId && (
              <button onClick={cancelWalletEditing} style={{ padding: "12px", backgroundColor: "#64748b", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" }}>
                Cancel
              </button>
            )}
          </div>
        </div>

        {/* CREATE CATEGORY */}
        <div style={{ backgroundColor: "#1e293b", padding: "20px", borderRadius: "15px" }}>
          <h2 style={{ fontSize: "1.2rem", marginBottom: "15px", borderBottom: "1px solid #334155", paddingBottom: "10px" }}>Create Category</h2>
          <input type="text" placeholder="Category name" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} style={{ width: "90%", padding: "10px", borderRadius: "8px", backgroundColor: "#334155", color: "white", border: "1px solid #475569", marginBottom: "15px" }} /><br />
          <button onClick={createCategory} style={{ width: "100%", padding: "12px", backgroundColor: "#a855f7", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" }}>Create Category</button>
        </div>

        {/* CREATE TRANSACTION */}
        <div style={{ backgroundColor: "#1e293b", padding: "20px", borderRadius: "15px" }}>
          <h2 style={{ fontSize: "1.2rem", marginBottom: "15px", borderBottom: "1px solid #334155", paddingBottom: "10px" }}>Create Transaction</h2>
          <input type="number" min="0.01" step="any" placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} style={{ width: "90%", padding: "10px", borderRadius: "8px", backgroundColor: "#334155", color: "white", border: "1px solid #475569", marginBottom: "15px" }} />
          <input type="text" placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} style={{ width: "90%", padding: "10px", borderRadius: "8px", backgroundColor: "#334155", color: "white", border: "1px solid #475569", marginBottom: "15px" }} /><br />
          
          <select value={type} onChange={(e) => setType(e.target.value)} style={{ padding: "10px", borderRadius: "8px", backgroundColor: "#334155", color: "white", border: "1px solid #475569", marginBottom: "15px", width: "95%" }}>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
            <option value="loan_given">Loan Given (Дал в долг)</option>
            <option value="loan_taken">Loan Taken (Взял в долг)</option>
            <option value="loan_repaid_to_us">Loan Repaid To Us (Мне вернули долг)</option>
            <option value="loan_repaid_by_us">Loan Repaid By Us (Я вернул долг)</option>
          </select>

          {/* ЕСЛИ ЭТО ПЕРЕВОД - ПОКАЗЫВАЕМ ДВА КОШЕЛЬКА */}
          {type === "transfer" ? (
            <>
              {/* Кошелек Откуда */}
              <label style={{ color: "#94a3b8", fontSize: "0.85rem", display: "block", marginBottom: "5px" }}>From Wallet (Откуда):</label>
              <select value={walletId} onChange={(e) => setWalletId(e.target.value)} style={{ padding: "10px", borderRadius: "8px", backgroundColor: "#334155", color: "white", border: "1px solid #475569", marginBottom: "15px", width: "95%" }}>
                <option value="">Select Source Wallet</option>
                {wallets.map(w => <option key={w.id} value={w.id}>{w.name} ({w.currency})</option>)}
              </select>

              {/* Кошелек Куда */}
              <label style={{ color: "#94a3b8", fontSize: "0.85rem", display: "block", marginBottom: "5px" }}>To Wallet (Куда):</label>
              <select value={toWalletId} onChange={(e) => setToWalletId(e.target.value)} style={{ padding: "10px", borderRadius: "8px", backgroundColor: "#334155", color: "white", border: "1px solid #475569", marginBottom: "15px", width: "95%" }}>
                <option value="">Select Destination Wallet</option>
                {/* Исключаем из списка тот кошелек, который выбран в качестве источника */}
                {wallets.filter(w => w.id.toString() !== walletId.toString()).map(w => (
                  <option key={w.id} value={w.id}>{w.name} ({w.currency})</option>
                ))}
              </select>
            </>
          ) : (
            <>
              {/* ОБЫЧНЫЙ ВЫБОР КОШЕЛЬКА ДЛЯ INCOME/EXPENSE */}
              <select value={walletId} onChange={(e) => { setWalletId(e.target.value); if(typeof getTransactions === 'function') getTransactions(e.target.value); }} style={{ padding: "10px", borderRadius: "8px", backgroundColor: "#334155", color: "white", border: "1px solid #475569", marginBottom: "15px", width: "95%" }}>
                <option value="">Select Wallet</option>
                {wallets.map(w => <option key={w.id} value={w.id}>{w.name} ({w.currency})</option>)}
              </select>
              <br />
            </>
          )}

          
          
          {/* Умный селектор категорий: подстраивается под тип операции */}
          {(type === "income" || type === "expense") && (
            <>
              <select 
                value={categoryId} 
                onChange={(e) => setCategoryId(e.target.value)} 
                style={{ padding: "10px", borderRadius: "8px", backgroundColor: "#334155", color: "white", border: "1px solid #475569", width: "95%", marginBottom: "15px" }}
              >
                <option value="">Select Category (Optional)</option>
                {categories
                  .filter(cat => cat.type === type)
                  .map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))
                }
              </select>
              <br />
            </>
          )}
          
          <button onClick={createTransaction} style={{ width: "100%", padding: "12px", backgroundColor: "#22c55e", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" }}>Create Transaction</button>
        </div>
      </div>
           
      {/* FOOTER TABLES */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "20px" }}>
        
        {/* WALLETS LIST */}
        <div style={{ backgroundColor: "#1e293b", padding: "20px", borderRadius: "15px" }}>
          <h2 style={{ fontSize: "1.3rem", marginBottom: "20px" }}>Wallets ({wallets.length})</h2>
          {wallets.map((wallet) => (
            <div key={wallet.id} style={{ backgroundColor: "#334155", padding: "15px", borderRadius: "12px", marginBottom: "15px", border: editingWalletId === wallet.id ? "1px dashed #3b82f6" : "none" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h3 style={{ margin: "0 0 5px 0", color: "#f8fafc" }}>{wallet.name}</h3>
                  <p style={{ margin: "5px 0", fontSize: "1.1rem" }}>Balance: <strong>{wallet.balance} {wallet.currency}</strong></p>
                  <p style={{ margin: "5px 0", fontSize: "12px", color: "#94a3b8" }}>ID: {wallet.id}</p>
                </div>
                <button 
                  onClick={() => startEditingWallet(wallet)} 
                  style={{ 
                    padding: "8px 14px", 
                    backgroundColor: editingWalletId === wallet.id ? "#64748b" : "#3b82f6", 
                    color: "white", 
                    border: "none", 
                    borderRadius: "8px", 
                    fontWeight: "bold",
                    cursor: "pointer"
                  }}
                  disabled={editingWalletId === wallet.id}
                >
                  {editingWalletId === wallet.id ? "Editing..." : "Edit"}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* TRANSACTIONS LIST */}
        <div style={{ backgroundColor: "#1e293b", padding: "20px", borderRadius: "15px" }}>
          <h2 style={{ fontSize: "1.3rem", marginBottom: "20px" }}>Transactions</h2>

          <div style={{ display: "flex", gap: "10px", marginBottom: "20px", flexWrap: "wrap" }}>
            <input 
              type="text" 
              placeholder="🔍 Поиск по описанию..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ flex: 1, minWidth: "150px", padding: "10px 14px", borderRadius: "8px", backgroundColor: "#334155", color: "white", border: "1px solid #475569" }}
            />
            
            <select 
              value={filterType} 
              onChange={(e) => setFilterType(e.target.value)}
              style={{ padding: "10px 14px", borderRadius: "8px", backgroundColor: "#334155", color: "white", border: "1px solid #475569" }}
            >
              <option value="all">Все типы</option>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
              <option value="transfer">Transfer (Перевод между счетами)</option>
              <option value="loan_given">Loan Given</option>
              <option value="loan_taken">Loan Taken</option>
              <option value="loan_repaid_to_us">Loan Repaid To Us</option>
              <option value="loan_repaid_by_us">Loan Repaid By Us</option>
            </select>

            <select 
              value={filterCategory} 
              onChange={(e) => setFilterCategory(e.target.value)}
              style={{ padding: "10px 14px", borderRadius: "8px", backgroundColor: "#334155", color: "white", border: "1px solid #475569" }}
            >
              <option value="all">Все категории</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {currentTransactions.length === 0 ? (
            <p style={{ color: "#94a3b8", textAlign: "center", padding: "20px" }}>Транзакции не найдены или кошелек не выбран.</p>
          ) : (
            currentTransactions.map((transaction) => {
              const txId = transaction.id || transaction.transaction_id;
              const matchedCategory = categories.find(c => c.id === transaction.category_id);
              const categoryName = matchedCategory ? matchedCategory.name : "No Category";
              
              return (
                <div key={txId} style={{ backgroundColor: "#334155", padding: "15px", borderRadius: "12px", marginBottom: "15px" }}>
                  {editingTxId === txId ? (
                    <div>
                      <input type="number" value={editTxAmount} onChange={(e) => setEditTxAmount(e.target.value)} style={{ padding: "8px", borderRadius: "6px", backgroundColor: "#1e293b", color: "white", border: "1px solid #475569", marginBottom: "10px", marginRight: "10px" }} />
                      <input type="text" value={editTxDescription} onChange={(e) => setEditTxDescription(e.target.value)} style={{ padding: "8px", borderRadius: "6px", backgroundColor: "#1e293b", color: "white", border: "1px solid #475569", marginBottom: "10px", width: "50%" }} /><br />
                      
                      <select value={editTxType} onChange={(e) => setEditTxType(e.target.value)} style={{ padding: "8px", borderRadius: "6px", backgroundColor: "#1e293b", color: "white", border: "1px solid #475569", marginRight: "10px", marginBottom: "10px" }}>
                        <option value="income">Income</option>
                        <option value="expense">Expense</option>
                        <option value="loan_given">Loan Given</option>
                        <option value="loan_taken">Loan Taken</option>
                        <option value="loan_repaid_to_us">Loan Repaid To Us</option>
                        <option value="loan_repaid_by_us">Loan Repaid By Us</option>
                      </select>

                      <select value={editTxCategoryId} onChange={(e) => setEditTxCategoryId(e.target.value)} style={{ padding: "8px", borderRadius: "6px", backgroundColor: "#1e293b", color: "white", border: "1px solid #475569", marginRight: "10px", marginBottom: "10px" }}>
                        <option value="">No Category</option>
                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                      <br />

                      <button onClick={() => updateTransaction(txId)} style={{ padding: "8px 16px", backgroundColor: "#22c55e", color: "white", border: "none", borderRadius: "6px", marginRight: "5px", fontWeight: "bold" }}>Save</button>
                      <button onClick={() => setEditingTxId(null)} style={{ padding: "8px 16px", backgroundColor: "#64748b", color: "white", border: "none", borderRadius: "6px" }}>Cancel</button>
                    </div>
                  ) : (
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <span style={{ fontSize: "1.2rem", fontWeight: "bold", color: getTypeColor(transaction.type), marginRight: "15px" }}>
                          {["income", "loan_taken", "loan_repaid_to_us"].includes(transaction.type) ? "+" : "-"} {transaction.amount}
                        </span>
                        <span style={{ backgroundColor: "#475569", padding: "4px 8px", borderRadius: "6px", fontSize: "12px", marginRight: "10px" }}>{transaction.type}</span>
                        <span style={{ color: "#94a3b8", fontSize: "14px" }}>{categoryName}</span>
                        <p style={{ margin: "5px 0 0 0", color: "#e2e8f0" }}>{transaction.description || "Без описания"}</p>
                      </div>
                      <div style={{ display: "flex", gap: "5px" }}>
                        <button onClick={() => startEditingTransaction(transaction)} style={{ padding: "6px 12px", backgroundColor: "#3b82f6", color: "white", border: "none", borderRadius: "6px" }}>Edit</button>
                        <button onClick={() => deleteTransaction(txId)} style={{ padding: "6px 12px", backgroundColor: "#ef4444", color: "white", border: "none", borderRadius: "6px" }}>Delete</button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}

export default Dashboard