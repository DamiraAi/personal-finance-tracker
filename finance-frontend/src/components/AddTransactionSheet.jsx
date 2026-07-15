import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAppData } from "../context/AppDataContext";

function AddTransactionSheet({ isOpen, onClose }) {
  const { t } = useTranslation(["dashboard", "translation"]);
  
  // Добавили refreshAfterTransactionChange в деструктуризацию контекста!
  const { 
    wallets, 
    categories, 
    showNotification, 
    refreshAfterTransactionChange, 
    BASE_URL 
  } = useAppData();

  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("expense");
  const [walletId, setWalletId] = useState("");
  const [categoryId, setCategoryId] = useState("");

  // Стейт для предотвращения повторных нажатий
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setAmount("");
    setDescription("");
    setType("expense");
    setWalletId("");
    setCategoryId("");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const createTransaction = async () => {
    // 1. Защита от дублей: если запрос уже идет, ничего не делаем
    if (isSubmitting) return;

    const token = localStorage.getItem("token");

    // 2. Валидация на наличие кошельков
    if (wallets.length === 0) {
      showNotification(t("notifications.create_wallet_first", "Сначала создайте хотя бы один кошелек!"), "error");
      return;
    }

    if (!walletId) {
      showNotification(t("notifications.wallet_required"), "error");
      return;
    }

    const parsedAmount = Number(amount);
    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      showNotification(t("notifications.invalid_amount"), "error");
      return;
    }

    // Включаем блокировку кнопки
    setIsSubmitting(true);

    try {
      const response = await fetch(`${BASE_URL}/transactions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          type,
          amount: parsedAmount,
          description: description.trim() || t("transaction.without_description"),
          wallet_id: Number(walletId),
          date: new Date().toISOString(),
          category_id: categoryId ? Number(categoryId) : null,
          person_id: null,
          debt_id: null,
          to_wallet_id: null,
        })
      });

      if (response.ok) {
        showNotification(t("notifications.transaction_created"));
        
        // Теперь функция существует и мгновенно обновит кошельки в фоне!
        if (typeof refreshAfterTransactionChange === "function") {
          refreshAfterTransactionChange();
        }
        
        // Закрываем и сбрасываем шторку
        handleClose();
      } else {
        const errData = await response.json();
        showNotification(errData.detail || t("notifications.transaction_error"), "error");
      }
    } catch (error) {
      console.error("Ошибка при отправке транзакции:", error);
      showNotification(t("notifications.network_error", "Ошибка сети"), "error");
    } finally {
      // Всегда выключаем блокировку кнопки в самом конце
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Затемнение фона */}
      {isOpen && (
        <div
          onClick={isSubmitting ? null : handleClose} // Запрещаем закрывать во время отправки
          style={{
            position: "fixed", inset: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            zIndex: 1998,
            transition: "opacity 0.3s ease"
          }}
        />
      )}

      {/* Сама шторка */}
      <div style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "#1e293b",
        borderTopLeftRadius: "20px",
        borderTopRightRadius: "20px",
        padding: "20px 20px calc(20px + env(safe-area-inset-bottom, 0px)) 20px",
        zIndex: 1999,
        transform: isOpen ? "translateY(0)" : "translateY(100%)",
        transition: "transform 0.3s ease-out",
        boxShadow: "0 -10px 30px rgba(0,0,0,0.3)",
        maxHeight: "85vh",
        overflowY: "auto"
      }}>
        {/* Полоска-индикатор сверху шторки */}
        <div style={{
          width: "40px", height: "4px", backgroundColor: "#475569",
          borderRadius: "2px", margin: "0 auto 20px auto"
        }} />

        <h2 style={{ color: "white", marginBottom: "20px", fontSize: "1.3rem" }}>
          {t("transaction.title")}
        </h2>

        {/* Тип: доход / расход */}
        <div style={{ display: "flex", gap: "10px", marginBottom: "15px" }}>
          <button
            disabled={isSubmitting}
            onClick={() => setType("expense")}
            style={{
              flex: 1, padding: "12px", borderRadius: "8px", border: "none",
              backgroundColor: type === "expense" ? "#ef4444" : "#334155",
              color: "white", fontWeight: "bold", cursor: isSubmitting ? "not-allowed" : "pointer",
              opacity: isSubmitting ? 0.6 : 1
            }}
          >
            {t("transaction.expense")}
          </button>
          <button
            disabled={isSubmitting}
            onClick={() => setType("income")}
            style={{
              flex: 1, padding: "12px", borderRadius: "8px", border: "none",
              backgroundColor: type === "income" ? "#22c55e" : "#334155",
              color: "white", fontWeight: "bold", cursor: isSubmitting ? "not-allowed" : "pointer",
              opacity: isSubmitting ? 0.6 : 1
            }}
          >
            {t("transaction.income")}
          </button>
        </div>

        <input
          type="number" min="0.01" step="any"
          disabled={isSubmitting}
          placeholder={t("transaction.amount")}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          style={{ width: "100%", padding: "12px", borderRadius: "8px", backgroundColor: "#334155", color: "white", border: "1px solid #475569", marginBottom: "15px", fontSize: "1.1rem", boxSizing: "border-box", opacity: isSubmitting ? 0.6 : 1 }}
        />

        <select
          value={walletId}
          disabled={isSubmitting || wallets.length === 0}
          onChange={(e) => setWalletId(e.target.value)}
          style={{ width: "100%", padding: "12px", borderRadius: "8px", backgroundColor: "#334155", color: "white", border: "1px solid #475569", marginBottom: "15px", boxSizing: "border-box", opacity: (isSubmitting || wallets.length === 0) ? 0.6 : 1 }}
        >
          {wallets.length === 0 ? (
            <option value="">{t("wallet.no_wallets", "Нет доступных кошельков")}</option>
          ) : (
            <>
              <option value="">{t("wallet.select")}</option>
              {wallets.map(w => <option key={w.id} value={w.id}>{w.name} ({w.currency})</option>)}
            </>
          )}
        </select>

        <select
          value={categoryId}
          disabled={isSubmitting}
          onChange={(e) => setCategoryId(e.target.value)}
          style={{ width: "100%", padding: "12px", borderRadius: "8px", backgroundColor: "#334155", color: "white", border: "1px solid #475569", marginBottom: "15px", boxSizing: "border-box", opacity: isSubmitting ? 0.6 : 1 }}
        >
          <option value="">{t("category.select")} ({t("category.optional")})</option>
          {categories.filter(cat => !cat.type || cat.type === type).map(cat => {
            const displayName = cat.name.startsWith("categories.") ? t(cat.name, { ns: "translation" }) : cat.name;
            return <option key={cat.id} value={cat.id}>{displayName}</option>;
          })}
        </select>

        <input
          type="text"
          disabled={isSubmitting}
          placeholder={t("transaction.description")}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          style={{ width: "100%", padding: "12px", borderRadius: "8px", backgroundColor: "#334155", color: "white", border: "1px solid #475569", marginBottom: "20px", boxSizing: "border-box", opacity: isSubmitting ? 0.6 : 1 }}
        />

        <button
          onClick={createTransaction}
          disabled={isSubmitting || wallets.length === 0}
          style={{ 
            width: "100%", 
            padding: "14px", 
            backgroundColor: "#3b82f6", 
            color: "white", 
            border: "none", 
            borderRadius: "10px", 
            cursor: (isSubmitting || wallets.length === 0) ? "not-allowed" : "pointer", 
            fontWeight: "bold", 
            fontSize: "1rem",
            opacity: (isSubmitting || wallets.length === 0) ? 0.5 : 1
          }}
        >
          {isSubmitting ? t("transaction.creating", "Создание...") : t("transaction.create")}
        </button>
      </div>
    </>
  );
}

export default AddTransactionSheet;