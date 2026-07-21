import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";

const BASE_URL = "https://finance-backend-tj8e.onrender.com";

export const AppDataContext = createContext(null);

export function AppDataProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem("token"));

  const [wallets, setWallets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [debts, setDebts] = useState([]);
  const [people, setPeople] = useState([]);
  const [report, setReport] = useState(null);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [allTransactions, setAllTransactions] = useState([]);
  const [loading, setLoading] = useState(false);

  const [period, setPeriod] = useState("month");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [toast, setToast] = useState({
    show: false,
    message: "",
    type: "success",
  });
  const toastTimeoutRef = useRef(null);

  const getAuthHeaders = useCallback(() => {
    return {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
  }, [token]);

  const updateToken = useCallback((newToken = null) => {
    const activeToken = newToken || localStorage.getItem("token");
    setToken(activeToken);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    setToken(null);
    setWallets([]);
    setCategories([]);
    setDebts([]);
    setPeople([]);
    setReport(null);
    setRecentTransactions([]);
    setAllTransactions([]);
  }, []);

  // Универсальный обработчик ошибок авторизации (401)
  const handleApiError = useCallback(
    (response) => {
      if (response.status === 401) {
        console.warn("Токен устарел или недействителен. Разлогин.");
        logout();
      }
    },
    [logout]
  );

  const showNotification = useCallback((message, type = "success") => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToast({ show: true, message, type });
    toastTimeoutRef.current = setTimeout(() => {
      setToast({ show: false, message: "", type: "success" });
    }, 4000);
  }, []);

  // 1. Загрузка ВСЕХ транзакций
  const getAllTransactions = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${BASE_URL}/transactions`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        handleApiError(res);
        return;
      }
      const data = await res.json();
      if (Array.isArray(data)) {
        const sorted = data.sort(
          (a, b) => new Date(b.date) - new Date(a.date)
        );
        setAllTransactions(sorted);
        setRecentTransactions(sorted.slice(0, 3));
      }
    } catch (error) {
      console.error("Ошибка при загрузке всех транзакций:", error);
    }
  }, [token, getAuthHeaders, handleApiError]);

  const getRecentTransactions = useCallback(async () => {
    await getAllTransactions();
  }, [getAllTransactions]);

  const getWallets = useCallback(async () => {
    if (!token) return;
    try {
      const response = await fetch(`${BASE_URL}/wallets`, {
        headers: getAuthHeaders(),
      });
      if (response.ok) {
        setWallets(await response.json());
      } else {
        handleApiError(response);
      }
    } catch (error) {
      console.error("Ошибка при получении кошельков:", error);
    }
  }, [token, getAuthHeaders, handleApiError]);

  const getCategories = useCallback(async () => {
    if (!token) return;
    try {
      const response = await fetch(`${BASE_URL}/categories`, {
        headers: getAuthHeaders(),
      });
      if (response.ok) {
        setCategories(await response.json());
      } else {
        handleApiError(response);
      }
    } catch (error) {
      console.error("Ошибка при получении категорий:", error);
    }
  }, [token, getAuthHeaders, handleApiError]);

  const fetchDebtsData = useCallback(async () => {
    if (!token) return;
    try {
      const debtsRes = await fetch(`${BASE_URL}/debts`, {
        headers: getAuthHeaders(),
      });
      const peopleRes = await fetch(`${BASE_URL}/debts/people`, {
        headers: getAuthHeaders(),
      });

      if (debtsRes.ok) {
        setDebts(await debtsRes.json());
      } else {
        handleApiError(debtsRes);
      }

      if (peopleRes.ok) {
        setPeople(await peopleRes.json());
      } else {
        handleApiError(peopleRes);
      }
    } catch (err) {
      console.error("Ошибка при загрузке долгов:", err);
    }
  }, [token, getAuthHeaders, handleApiError]);

  const getReport = useCallback(async () => {
    if (!token) return;
    try {
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

      const response = await fetch(url, { headers: getAuthHeaders() });
      if (response.ok) {
        setReport(await response.json());
      } else {
        handleApiError(response);
      }
    } catch (error) {
      console.error("Ошибка при получении отчета:", error);
    }
  }, [token, period, startDate, endDate, getAuthHeaders, handleApiError]);

  // ВАЖНО: Объявление функции ОБНОВЛЕНИЯ ДАННЫХ перенесено НАВЕРХ
  const refreshAfterTransactionChange = useCallback(() => {
    getWallets();
    getReport();
    getAllTransactions();
    fetchDebtsData();
  }, [getWallets, getReport, getAllTransactions, fetchDebtsData]);

  // 2. Добавление транзакции
  const addTransaction = useCallback(
    async (txData) => {
      if (!token) return;
      try {
        const response = await fetch(`${BASE_URL}/transactions`, {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify(txData),
        });

        if (response.ok) {
          showNotification("Транзакция успешно добавлена", "success");
          refreshAfterTransactionChange();
        } else {
          handleApiError(response);
          const errData = await response.json().catch(() => ({}));
          showNotification(errData.detail || "Ошибка добавления", "error");
        }
      } catch (err) {
        console.error("Ошибка сети при создании транзакции:", err);
        showNotification("Сетевая ошибка при создании", "error");
      }
    },
    [token, getAuthHeaders, handleApiError, showNotification, refreshAfterTransactionChange]
  );

  // 3. Редактирование / обновление транзакции
  const updateTransaction = useCallback(
    async (id, txData) => {
      if (!token) return;
      try {
        const response = await fetch(`${BASE_URL}/transactions/${id}`, {
          method: "PUT",
          headers: getAuthHeaders(),
          body: JSON.stringify(txData),
        });

        if (response.ok) {
          showNotification("Транзакция обновлена", "success");
          refreshAfterTransactionChange();
        } else {
          handleApiError(response);
          const errData = await response.json().catch(() => ({}));
          showNotification(errData.detail || "Ошибка обновления", "error");
        }
      } catch (err) {
        console.error("Ошибка при обновлении транзакции:", err);
        showNotification("Ошибка сети при обновлении", "error");
      }
    },
    [token, getAuthHeaders, handleApiError, showNotification, refreshAfterTransactionChange]
  );

  // 4. Удаление транзакции
  const deleteTransaction = useCallback(
    async (id) => {
      if (!token) return;
      try {
        const response = await fetch(`${BASE_URL}/transactions/${id}`, {
          method: "DELETE",
          headers: getAuthHeaders(),
        });

        if (response.ok) {
          showNotification("Транзакция удалена", "success");
          refreshAfterTransactionChange();
        } else {
          handleApiError(response);
          showNotification("Не удалось удалить транзакцию", "error");
        }
      } catch (err) {
        console.error("Ошибка при удалении транзакции:", err);
        showNotification("Ошибка сети при удалении", "error");
      }
    },
    [token, getAuthHeaders, handleApiError, showNotification, refreshAfterTransactionChange]
  );

  // Первоначальная загрузка всех данных
  useEffect(() => {
    if (token) {
      setLoading(true);
      Promise.all([
        getWallets(),
        getCategories(),
        fetchDebtsData(),
        getAllTransactions(),
      ]).finally(() => setLoading(false));
    } else {
      setWallets([]);
      setCategories([]);
      setDebts([]);
      setPeople([]);
      setReport(null);
      setRecentTransactions([]);
      setAllTransactions([]);
    }
  }, [token, getWallets, getCategories, fetchDebtsData, getAllTransactions]);

  useEffect(() => {
    if (token) {
      getReport();
    }
  }, [token, getReport]);

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, []);

  const value = {
    wallets,
    categories,
    debts,
    people: people || [],
    persons: people || [],
    report,
    recentTransactions,
    getRecentTransactions,
    allTransactions,
    transactions: allTransactions,
    getAllTransactions,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    refreshAfterTransactionChange,
    period,
    setPeriod,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    toast,
    showNotification,
    loading,
    getWallets,
    getCategories,
    fetchDebtsData,
    getReport,
    BASE_URL,
    token,
    updateToken,
    logout,
  };

  return (
    <AppDataContext.Provider value={value}>
      {children}
    </AppDataContext.Provider>
  );
}

export function useAppData() {
  const context = useContext(AppDataContext);
  if (!context) {
    throw new Error("useAppData должен использоваться внутри <AppDataProvider>");
  }
  return context;
}