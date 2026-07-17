import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";

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

  const [period, setPeriod] = useState("month");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [toast, setToast] = useState({ show: false, message: "", type: "success" });
  const toastTimeoutRef = useRef(null);

  const getAuthHeaders = useCallback(() => {
    return { Authorization: `Bearer ${token}` };
  }, [token]);

  const updateToken = useCallback(() => {
    setToken(localStorage.getItem("token"));
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

  // Универсальный обработчик ошибок авторизации (если токен протух)
  const handleApiError = useCallback((response) => {
    if (response.status === 401) {
      console.warn("Токен устарел или недействителен. Разлогин.");
      logout();
    }
  }, [logout]);

  // 1. Функция последних транзакций (БЕЗОПАСНАЯ)
  const getRecentTransactions = useCallback(async () => {
    if (!token) return;
    try {
      const walletsResponse = await fetch(`${BASE_URL}/wallets`, { headers: getAuthHeaders() });
      if (!walletsResponse.ok) {
        handleApiError(walletsResponse);
        return;
      }
      
      const walletsData = await walletsResponse.json();
      if (!Array.isArray(walletsData) || walletsData.length === 0) {
        setRecentTransactions([]);
        return;
      }
      
      // Добавили .catch() к каждому индивидуальному промису
      const requests = walletsData.map((wallet) =>
        fetch(`${BASE_URL}/transactions?wallet_id=${wallet.id}`, { headers: getAuthHeaders() })
          .then((res) => {
            if (!res.ok) {
              handleApiError(res);
              return [];
            }
            return res.json();
          })
          .catch(() => []) 
      );
      
      const results = await Promise.all(requests);
      const allTransactionsData = results.flat();

      const uniqueTransactions = allTransactionsData.filter(
        (tx, index, self) =>
          self.findIndex((t) => (t.id || t.transaction_id || t.debt_id) === (tx.id || tx.transaction_id || tx.debt_id)) === index
      );
      
      const sorted = uniqueTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));
      setRecentTransactions(sorted.slice(0, 3));
    } catch (error) {
      console.error("Ошибка при загрузке последних транзакций:", error);
    }
  }, [token, getAuthHeaders, handleApiError]);

  // 2. Функция ВСЕХ транзакций (БЕЗОПАСНАЯ)
  const getAllTransactions = useCallback(async () => {
    if (!token) return;
    try {
      const walletsResponse = await fetch(`${BASE_URL}/wallets`, { headers: getAuthHeaders() });
      if (!walletsResponse.ok) {
        handleApiError(walletsResponse);
        return;
      }
      
      const walletsData = await walletsResponse.json();
      if (!Array.isArray(walletsData) || walletsData.length === 0) {
        setAllTransactions([]);
        return;
      }
      
      // Добавили .catch() к каждому индивидуальному промису
      const requests = walletsData.map((wallet) =>
        fetch(`${BASE_URL}/transactions?wallet_id=${wallet.id}`, { headers: getAuthHeaders() })
          .then((res) => {
            if (!res.ok) {
              handleApiError(res);
              return [];
            }
            return res.json();
          })
          .catch(() => [])
      );
      
      const results = await Promise.all(requests);
      const combined = results.flat();

      const uniqueTransactions = combined.filter(
        (tx, index, self) =>
          self.findIndex((t) => (t.id || t.transaction_id || t.debt_id) === (tx.id || tx.transaction_id || tx.debt_id)) === index
      );

      const sorted = uniqueTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));
      setAllTransactions(sorted);
    } catch (error) {
      console.error("Ошибка при загрузке всех транзакций:", error);
    }
  }, [token, getAuthHeaders, handleApiError]);

  const showNotification = useCallback((message, type = "success") => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToast({ show: true, message, type });
    toastTimeoutRef.current = setTimeout(() => {
      setToast({ show: false, message: "", type: "success" });
    }, 4000);
  }, []);

  const getWallets = useCallback(async () => {
    if (!token) return;
    try {
      const response = await fetch(`${BASE_URL}/wallets`, { headers: getAuthHeaders() });
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
      const response = await fetch(`${BASE_URL}/categories`, { headers: getAuthHeaders() });
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
      const debtsRes = await fetch(`${BASE_URL}/debts`, { headers: getAuthHeaders() });
      const peopleRes = await fetch(`${BASE_URL}/debts/people`, { headers: getAuthHeaders() });
      
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

  const refreshAfterTransactionChange = useCallback(() => {
    getWallets();
    getReport();
    getRecentTransactions();
    getAllTransactions();
    fetchDebtsData();
  }, [getWallets, getReport, getRecentTransactions, getAllTransactions, fetchDebtsData]);

  useEffect(() => {
    if (token) {
      getWallets();
      getCategories();
      fetchDebtsData();
      getRecentTransactions();
      getAllTransactions();
    } else {
      setWallets([]);
      setCategories([]);
      setDebts([]);
      setPeople([]);
      setReport(null);
      setRecentTransactions([]);
      setAllTransactions([]);
    }
  }, [token, getWallets, getCategories, fetchDebtsData, getRecentTransactions, getAllTransactions]);

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
    wallets, categories, debts, people, report, 
    recentTransactions, getRecentTransactions,
    allTransactions, getAllTransactions, refreshAfterTransactionChange,
    period, setPeriod, startDate, setStartDate, endDate, setEndDate,
    toast, showNotification,
    getWallets, getCategories, fetchDebtsData, getReport,
    BASE_URL,
    token, updateToken, logout
  };

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const context = useContext(AppDataContext);
  if (!context) {
    throw new Error("useAppData должен использоваться внутри <AppDataProvider>");
  }
  return context;
}