import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";

const BASE_URL = "https://finance-backend-tj8e.onrender.com";

export const AppDataContext = createContext(null);

export function AppDataProvider({ children }) {
  // Локальный стейт для токена, чтобы React мгновенно реагировал на вход/выход пользователя
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

  // Вспомогательная функция для получения актуального заголовка авторизации
  const getAuthHeaders = useCallback(() => {
    return { Authorization: `Bearer ${token}` };
  }, [token]);

  // Функция для обновления токена в контексте (вызывать при успешном логине/регистрации)
  const updateToken = useCallback(() => {
    setToken(localStorage.getItem("token"));
  }, []);

  // Функция разлогина — полностью стирает токен и очищает все стейты от старого пользователя
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

  // 1. Функция последних транзакций
  const getRecentTransactions = useCallback(async () => {
    if (!token) return;
    try {
      const walletsResponse = await fetch(`${BASE_URL}/wallets`, { headers: getAuthHeaders() });
      if (!walletsResponse.ok) return;
      
      const walletsData = await walletsResponse.json();
      if (walletsData.length === 0) {
        setRecentTransactions([]);
        return;
      }
      
      const requests = walletsData.map((wallet) =>
        fetch(`${BASE_URL}/transactions?wallet_id=${wallet.id}`, { headers: getAuthHeaders() })
          .then((res) => (res.ok ? res.json() : []))
      );
      const results = await Promise.all(requests);
      const allTransactionsData = results.flat();

      // Фильтр дубликатов
      const uniqueTransactions = allTransactionsData.filter(
        (tx, index, self) =>
          self.findIndex((t) => (t.id || t.transaction_id || t.debt_id) === (tx.id || tx.transaction_id || tx.debt_id)) === index
      );
      
      const sorted = uniqueTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));
      setRecentTransactions(sorted.slice(0, 3));
    } catch (error) {
      console.error("Ошибка при загрузке последних транзакций:", error);
    }
  }, [token, getAuthHeaders]);

  // 2. Функция ВСЕХ транзакций
  const getAllTransactions = useCallback(async () => {
    if (!token) return;
    try {
      const walletsResponse = await fetch(`${BASE_URL}/wallets`, { headers: getAuthHeaders() });
      if (!walletsResponse.ok) return;
      const walletsData = await walletsResponse.json();
      if (walletsData.length === 0) {
        setAllTransactions([]);
        return;
      }
      const requests = walletsData.map((wallet) =>
        fetch(`${BASE_URL}/transactions?wallet_id=${wallet.id}`, { headers: getAuthHeaders() })
          .then((res) => (res.ok ? res.json() : []))
      );
      const results = await Promise.all(requests);
      const combined = results.flat();

      // Фильтр дубликатов
      const uniqueTransactions = combined.filter(
        (tx, index, self) =>
          self.findIndex((t) => (t.id || t.transaction_id || t.debt_id) === (tx.id || tx.transaction_id || tx.debt_id)) === index
      );

      const sorted = uniqueTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));
      setAllTransactions(sorted);
    } catch (error) {
      console.error("Ошибка при загрузке всех транзакций:", error);
    }
  }, [token, getAuthHeaders]);

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
      if (response.ok) setWallets(await response.json());
    } catch (error) {
      console.error("Ошибка при получении кошельков:", error);
    }
  }, [token, getAuthHeaders]);

  const getCategories = useCallback(async () => {
    if (!token) return;
    try {
      const response = await fetch(`${BASE_URL}/categories`, { headers: getAuthHeaders() });
      if (response.ok) setCategories(await response.json());
    } catch (error) {
      console.error("Ошибка при получении категорий:", error);
    }
  }, [token, getAuthHeaders]);

  const fetchDebtsData = useCallback(async () => {
    if (!token) return;
    try {
      const debtsRes = await fetch(`${BASE_URL}/debts`, { headers: getAuthHeaders() });
      const peopleRes = await fetch(`${BASE_URL}/debts/people`, { headers: getAuthHeaders() });
      if (debtsRes.ok) setDebts(await debtsRes.json());
      if (peopleRes.ok) setPeople(await peopleRes.json());
    } catch (err) {
      console.error("Ошибка при загрузке долгов:", err);
    }
  }, [token, getAuthHeaders]);

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
      if (response.ok) setReport(await response.json());
    } catch (error) {
      console.error("Ошибка при получении отчета:", error);
    }
  }, [token, period, startDate, endDate, getAuthHeaders]);

  // Единая функция обновления
  const refreshAfterTransactionChange = useCallback(() => {
    getWallets();
    getReport();
    getRecentTransactions();
    getAllTransactions();
    fetchDebtsData();
  }, [getWallets, getReport, getRecentTransactions, getAllTransactions, fetchDebtsData]);

  // Эффект первичной инициализации и обновления данных при смене пользователя (токена)
  useEffect(() => {
    if (token) {
      getWallets();
      getCategories();
      fetchDebtsData();
      getRecentTransactions();
      getAllTransactions();
    } else {
      // Если токена нет, гарантированно очищаем память контекста
      setWallets([]);
      setCategories([]);
      setDebts([]);
      setPeople([]);
      setReport(null);
      setRecentTransactions([]);
      setAllTransactions([]);
    }
  }, [token, getWallets, getCategories, fetchDebtsData, getRecentTransactions, getAllTransactions]);

  // Обновление отчетов при изменении токена или параметров фильтрации периода
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
    token, updateToken, logout // Экспортируем методы управления сессией
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