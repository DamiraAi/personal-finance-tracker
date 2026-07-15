import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAppData } from "../context/AppDataContext";

function Transactions() {
  const { t, i18n } = useTranslation(["dashboard", "translation"]);
  const {
    allTransactions, categories, wallets,
    showNotification, refreshAfterTransactionChange, BASE_URL
  } = useAppData();

  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Храним исходный объект транзакции целиком, чтобы не потерять скрытые свойства (to_wallet_id, person_id и т.д.)
  const [editingTx, setEditingTx] = useState(null); 
  const [editingTxId, setEditingTxId] = useState(null);
  const [editTxAmount, setEditTxAmount] = useState("");
  const [editTxDescription, setEditTxDescription] = useState("");
  const [editTxType, setEditTxType] = useState("income");
  const [editTxCategoryId, setEditTxCategoryId] = useState("");
  const [editTxWalletId, setEditTxWalletId] = useState("");

  const currentLocale = i18n.language?.startsWith("tr")
    ? "tr-TR" : i18n.language?.startsWith("en") ? "en-US" : "ru-RU";

  const getTypeColor = (txType) =>
    ["income", "loan_taken", "loan_repaid_to_us"].includes(txType) ? "#22c55e" : "#ef4444";

  const startEditingTransaction = (tx) => {
    setEditingTx(tx);
    setEditingTxId(tx.id || tx.transaction_id);
    setEditTxAmount(tx.amount);
    setEditTxDescription(tx.description || "");
    setEditTxType(tx.type);
    setEditTxCategoryId(tx.category_id || "");
    setEditTxWalletId(tx.wallet_id);
  };

  const updateTransaction = async (id) => {
    const token = localStorage.getItem("token");
    const currentWalletId = Number(editTxWalletId);

    const parsedAmount = Number(editTxAmount);
    if (!editTxAmount || isNaN(parsedAmount) || parsedAmount <= 0) {
      showNotification(t("notifications.amount_must_be_positive"), "error");
      return;
    }

    try {
      const response = await fetch(`${BASE_URL}/transactions/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ...editingTx, // Сохраняем остальные свойства транзакции (например, для переводов или долгов)
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
        setEditingTx(null);
        refreshAfterTransactionChange();
      } else {
        const errData = await response.json();
        showNotification(errData.detail || t("notifications.transaction_update_error"), "error");
      }
    } catch (error) {
      console.error("Error saving transaction:", error);
    }
  };

  const deleteTransaction = async (transactionId) => {
    if (!window.confirm(t("transactions.confirm_delete", "Вы уверены?"))) return; // Базовая защита от случайного удаления
    const token = localStorage.getItem("token");
    const response = await fetch(`${BASE_URL}/transactions/${transactionId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` }
    });

    if (response.ok) {
      showNotification(t("notifications.transaction_deleted"));
      refreshAfterTransactionChange();
    }
  };

  const filteredTransactions = allTransactions.filter((tx) => {
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
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);

  return (
    <div style={{ padding: "20px", color: "white" }}>
      <h1 style={{ fontSize: "1.5rem", marginBottom: "20px" }}>{t("transactions.title")}</h1>

      {/* Поиск и фильтры */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "20px", flexWrap: "wrap" }}>
        <input
          type="text" placeholder={t("transactions.search")}
          value={searchTerm}
          onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
          style={{ flex: 1, minWidth: "150px", padding: "10px 14px", borderRadius: "8px", backgroundColor: "#334155", color: "white", border: "1px solid #475569" }}
        />
        <select
          value={filterType}
          onChange={(e) => { setFilterType(e.target.value); setCurrentPage(1); }}
          style={{ padding: "10px 14px", borderRadius: "8px", backgroundColor: "#334155", color: "white", border: "1px solid #475569" }}
        >
          <option value="all">{t("transactions.all_types")}</option>
          <option value="income">{t("transaction.income")}</option>
          <option value="expense">{t("transaction.expense")}</option>
          <option value="transfer">{t("transaction.transfer")}</option>
          <option value="loan_given">{t("transaction.loan_given")}</option>
          <option value="loan_taken">{t("transaction.loan_taken")}</option>
          <option value="loan_repaid_to_us">{t("transaction.loan_repaid_to_us")}</option>
          <option value="loan_repaid_by_us">{t("transaction.loan_repaid_by_us")}</option>
        </select>
        <select
          value={filterCategory}
          onChange={(e) => { setFilterCategory(e.target.value); setCurrentPage(1); }} // Исправлен сброс страницы на 1
          style={{ padding: "10px 14px", borderRadius: "8px", backgroundColor: "#334155", color: "white", border: "1px solid #475569" }}
        >
          <option value="all">{t("transactions.all_categories")}</option>
          {categories.map(c => {
            const name = c.name.startsWith("categories.") ? t(c.name, { ns: "translation" }) : c.name;
            return <option key={c.id} value={c.id}>{name}</option>;
          })}
        </select>
      </div>

      {/* Список */}
      {currentTransactions.length === 0 ? (
        <p style={{ color: "#94a3b8", textAlign: "center", padding: "20px" }}>{t("transactions.not_found")}</p>
      ) : (
        currentTransactions.map((transaction) => {
          const txId = transaction.id || transaction.transaction_id;
          const matchedCategory = categories.find(c => String(c.id) === String(transaction.category_id));
          const categoryName = matchedCategory
            ? (matchedCategory.name.startsWith("categories.") ? t(matchedCategory.name, { ns: "translation" }) : matchedCategory.name)
            : t("transactions.no_category");

          return (
            <div key={txId} style={{ backgroundColor: "#1e293b", padding: "15px", borderRadius: "12px", marginBottom: "12px" }}>
              {editingTxId === txId ? (
                <div>
                  <input type="number" value={editTxAmount} onChange={(e) => setEditTxAmount(e.target.value)}
                    style={{ width: "100%", padding: "10px", borderRadius: "8px", backgroundColor: "#334155", color: "white", border: "1px solid #475569", marginBottom: "10px", boxSizing: "border-box" }} />
                  <input type="text" value={editTxDescription} onChange={(e) => setEditTxDescription(e.target.value)}
                    style={{ width: "100%", padding: "10px", borderRadius: "8px", backgroundColor: "#334155", color: "white", border: "1px solid #475569", marginBottom: "10px", boxSizing: "border-box" }} />
                  
                  {/* Селект задизейблен для предотвращения поломки структуры данных транзакции */}
                  <select value={editTxType} disabled
                    style={{ width: "100%", padding: "10px", borderRadius: "8px", backgroundColor: "#1e293b", color: "#94a3b8", border: "1px solid #475569", marginBottom: "10px" }}>
                    <option value="income">{t("transaction.income")}</option>
                    <option value="expense">{t("transaction.expense")}</option>
                    <option value="transfer">{t("transaction.transfer")}</option>
                    <option value="loan_given">{t("transaction.loan_given")}</option>
                    <option value="loan_taken">{t("transaction.loan_taken")}</option>
                    <option value="loan_repaid_to_us">{t("transaction.loan_repaid_to_us")}</option>
                    <option value="loan_repaid_by_us">{t("transaction.loan_repaid_by_us")}</option>
                  </select>
                  
                  <select value={editTxCategoryId} onChange={(e) => setEditTxCategoryId(e.target.value)}
                    style={{ width: "100%", padding: "10px", borderRadius: "8px", backgroundColor: "#334155", color: "white", border: "1px solid #475569", marginBottom: "10px" }}>
                    <option value="">{t("transactions.no_category")}</option>
                    {categories.map(c => {
                      const name = c.name.startsWith("categories.") ? t(c.name, { ns: "translation" }) : c.name;
                      return <option key={c.id} value={c.id}>{name}</option>;
                    })}
                  </select>
                  <select value={editTxWalletId} onChange={(e) => setEditTxWalletId(e.target.value)}
                    style={{ width: "100%", padding: "10px", borderRadius: "8px", backgroundColor: "#334155", color: "white", border: "1px solid #475569", marginBottom: "10px" }}>
                    {wallets.map(w => <option key={w.id} value={w.id}>{w.name} ({w.currency})</option>)}
                  </select>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button onClick={() => updateTransaction(txId)} style={{ flex: 1, padding: "10px", backgroundColor: "#22c55e", color: "white", border: "none", borderRadius: "8px", fontWeight: "bold" }}>{t("transactions.save")}</button>
                    <button onClick={() => { setEditingTxId(null); setEditingTx(null); }} style={{ flex: 1, padding: "10px", backgroundColor: "#64748b", color: "white", border: "none", borderRadius: "8px" }}>{t("transactions.cancel")}</button>
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <span style={{ fontWeight: "bold", color: getTypeColor(transaction.type), marginRight: "10px" }}>
                      {["income", "loan_taken", "loan_repaid_to_us"].includes(transaction.type) ? "+" : "-"} {transaction.amount}
                    </span>
                    <span style={{ backgroundColor: "#475569", padding: "3px 8px", borderRadius: "6px", fontSize: "11px" }}>{t(`transaction.${transaction.type}`)}</span>
                    <p style={{ margin: "6px 0 0 0", color: "#e2e8f0" }}>{transaction.description || t("transaction.without_description")}</p>
                    <p style={{ margin: "4px 0 0 0", color: "#64748b", fontSize: "12px" }}>
                      {categoryName} · {transaction.date ? new Date(transaction.date).toLocaleString(currentLocale, { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : ""}
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
                    <button onClick={() => startEditingTransaction(transaction)} style={{ padding: "6px 10px", backgroundColor: "#3b82f6", color: "white", border: "none", borderRadius: "6px" }}>{t("transactions.edit")}</button>
                    <button onClick={() => deleteTransaction(transaction.id || transaction.transaction_id)} style={{ padding: "6px 10px", backgroundColor: "#ef4444", color: "white", border: "none", borderRadius: "6px" }}>{t("transactions.delete")}</button>
                  </div>
                </div>
              )}
            </div>
          );
        })
      )}

      {/* Пагинация */}
      {totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", gap: "8px", marginTop: "15px" }}>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <button key={page} onClick={() => setCurrentPage(page)}
              style={{ padding: "8px 14px", borderRadius: "8px", border: "none", backgroundColor: currentPage === page ? "#3b82f6" : "#334155", color: "white", cursor: "pointer" }}>
              {page}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default Transactions;