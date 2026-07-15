import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAppData } from "../context/AppDataContext";
import Tabs from "../components/Tabs";

function WalletsTab() {
  const { t } = useTranslation(["dashboard", "translation"]);
  const { wallets, showNotification, refreshAfterTransactionChange, BASE_URL } = useAppData();

  const [walletName, setWalletName] = useState("");
  const [walletCurrency, setWalletCurrency] = useState("");
  const [editingWalletId, setEditingWalletId] = useState(null);

  // Состояния для перевода между кошельками
  const [transferFrom, setTransferFrom] = useState("");
  const [transferTo, setTransferTo] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [transferDescription, setTransferDescription] = useState("");

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

  const handleWalletSubmit = async () => {
    if (!walletName.trim() || !walletCurrency.trim()) {
      showNotification(t("notifications.fill_wallet_fields"), "error");
      return;
    }
    const token = localStorage.getItem("token");
    const url = editingWalletId ? `${BASE_URL}/wallets/${editingWalletId}` : `${BASE_URL}/wallets`;
    const method = editingWalletId ? "PUT" : "POST";

    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: walletName.trim(), currency: walletCurrency.trim().toUpperCase() })
    });

    if (response.ok) {
      showNotification(editingWalletId ? t("notifications.wallet_updated") : t("notifications.wallet_created"));
      cancelWalletEditing();
      refreshAfterTransactionChange();
    } else {
      showNotification(t("notifications.wallet_error"), "error");
    }
  };

  const handleDeleteWallet = async (wallet) => {
    if (Number(wallet.balance) !== 0) {
      showNotification(t("notifications.wallet_delete_balance_error"), "error");
      return;
    }

    const confirmed = window.confirm(t("notifications.wallet_delete_confirm"));
    if (!confirmed) return;

    const token = localStorage.getItem("token");
    const response = await fetch(`${BASE_URL}/wallets/${wallet.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` }
    });

    if (response.ok) {
      showNotification(t("notifications.wallet_deleted"));
      refreshAfterTransactionChange();
    } else {
      const errData = await response.json().catch(() => ({}));
      showNotification(errData.detail || t("notifications.wallet_delete_error"), "error");
    }
  };

  // Функция создания перевода между кошельками
  const createTransfer = async () => {
    if (!transferFrom || !transferTo) {
      showNotification(t("notifications.wallet_required"), "error");
      return;
    }
    if (transferFrom === transferTo) {
      showNotification(t("notifications.wallet_error"), "error");
      return;
    }
    const parsedAmount = Number(transferAmount);
    if (!transferAmount || isNaN(parsedAmount) || parsedAmount <= 0) {
      showNotification(t("notifications.invalid_amount"), "error");
      return;
    }
    const token = localStorage.getItem("token");
    const response = await fetch(`${BASE_URL}/transactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        type: "transfer",
        amount: parsedAmount,
        description: transferDescription.trim() || t("transaction.without_description"),
        wallet_id: Number(transferFrom),
        to_wallet_id: Number(transferTo),
        date: new Date().toISOString(),
        category_id: null,
        person_id: null,
        debt_id: null,
      })
    });
    if (response.ok) {
      showNotification(t("notifications.transaction_created"));
      setTransferFrom(""); setTransferTo(""); setTransferAmount(""); setTransferDescription("");
      refreshAfterTransactionChange();
    } else {
      showNotification(t("notifications.transaction_error"), "error");
    }
  };

  return (
    <div>
      {/* Список кошельков */}
      {wallets.map((wallet) => (
        <div key={wallet.id} style={{
          backgroundColor: "#1e293b", padding: "16px", borderRadius: "14px", marginBottom: "12px",
          border: editingWalletId === wallet.id ? "1px dashed #3b82f6" : "none"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h3 style={{ margin: "0 0 5px 0" }}>{wallet.name}</h3>
              <p style={{ margin: "5px 0", fontSize: "1.1rem" }}>
                {t("wallet.balance")}: <strong>{wallet.balance} {wallet.currency}</strong>
              </p>
            </div>
            
            {/* Обернули кнопки управления в Flexbox контейнер */}
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={() => startEditingWallet(wallet)}
                disabled={editingWalletId === wallet.id}
                style={{ 
                  padding: "8px 14px", 
                  backgroundColor: editingWalletId === wallet.id ? "#64748b" : "#3b82f6", 
                  color: "white", 
                  border: "none", 
                  borderRadius: "8px", 
                  fontWeight: "bold" 
                }}
              >
                {editingWalletId === wallet.id ? t("wallet.editing") : t("wallet.edit")}
              </button>
              
              <button
                onClick={() => handleDeleteWallet(wallet)}
                style={{ 
                  padding: "8px 14px", 
                  backgroundColor: "#ef4444", 
                  color: "white", 
                  border: "none", 
                  borderRadius: "8px", 
                  fontWeight: "bold" 
                }}
              >
                {t("wallet.delete", "Удалить")}
              </button>
            </div>
          </div>
        </div>
      ))}

      {/* Форма создания/редактирования */}
      <div style={{ backgroundColor: "#1e293b", padding: "18px", borderRadius: "14px", marginTop: "20px", border: editingWalletId ? "2px solid #3b82f6" : "none" }}>
        <h3 style={{ marginTop: 0, marginBottom: "15px", color: editingWalletId ? "#3b82f6" : "white" }}>
          {editingWalletId ? t("wallet.update") : t("wallet.create")}
        </h3>
        <input type="text" placeholder={t("wallet.name")} value={walletName} onChange={(e) => setWalletName(e.target.value)}
          style={{ width: "100%", padding: "10px", borderRadius: "8px", backgroundColor: "#334155", color: "white", border: "1px solid #475569", marginBottom: "12px", boxSizing: "border-box" }} />
        <input type="text" placeholder={t("wallet.currency")} value={walletCurrency} onChange={(e) => setWalletCurrency(e.target.value)}
          style={{ width: "100%", padding: "10px", borderRadius: "8px", backgroundColor: "#334155", color: "white", border: "1px solid #475569", marginBottom: "12px", boxSizing: "border-box" }} />
        <div style={{ display: "flex", gap: "10px" }}>
          <button onClick={handleWalletSubmit} style={{ flex: 1, padding: "12px", backgroundColor: editingWalletId ? "#22c55e" : "#3b82f6", color: "white", border: "none", borderRadius: "8px", fontWeight: "bold" }}>
            {editingWalletId ? t("common.update") : t("common.create")}
          </button>
          {editingWalletId && (
            <button onClick={cancelWalletEditing} style={{ padding: "12px 16px", backgroundColor: "#64748b", color: "white", border: "none", borderRadius: "8px" }}>
              {t("wallet.cancel")}
            </button>
          )}
        </div>
      </div>

      {/* Перевод между кошельками */}
      <div style={{ backgroundColor: "#1e293b", padding: "18px", borderRadius: "14px", marginTop: "15px" }}>
        <h3 style={{ marginTop: 0, marginBottom: "12px" }}>{t("transaction.transfer")}</h3>
        <label style={{ color: "#94a3b8", fontSize: "0.85rem", display: "block", marginBottom: "5px" }}>{t("wallet.source")}:</label>
        <select value={transferFrom} onChange={(e) => setTransferFrom(e.target.value)}
          style={{ width: "100%", padding: "10px", borderRadius: "8px", backgroundColor: "#334155", color: "white", border: "1px solid #475569", marginBottom: "12px", boxSizing: "border-box" }}>
          <option value="">{t("wallet.select_source")}</option>
          {wallets.map(w => <option key={w.id} value={w.id}>{w.name} ({w.currency})</option>)}
        </select>
        <label style={{ color: "#94a3b8", fontSize: "0.85rem", display: "block", marginBottom: "5px" }}>{t("wallet.destination")}:</label>
        <select value={transferTo} onChange={(e) => setTransferTo(e.target.value)}
          style={{ width: "100%", padding: "10px", borderRadius: "8px", backgroundColor: "#334155", color: "white", border: "1px solid #475569", marginBottom: "12px", boxSizing: "border-box" }}>
          <option value="">{t("wallet.select_destination")}</option>
          {wallets.filter(w => String(w.id) !== String(transferFrom)).map(w => (
            <option key={w.id} value={w.id}>{w.name} ({w.currency})</option>
          ))}
        </select>
        <input type="number" min="0.01" step="any" placeholder={t("transaction.amount")} value={transferAmount} onChange={(e) => setTransferAmount(e.target.value)}
          style={{ width: "100%", padding: "10px", borderRadius: "8px", backgroundColor: "#334155", color: "white", border: "1px solid #475569", marginBottom: "12px", boxSizing: "border-box" }} />
        <input type="text" placeholder={t("transaction.description")} value={transferDescription} onChange={(e) => setTransferDescription(e.target.value)}
          style={{ width: "100%", padding: "10px", borderRadius: "8px", backgroundColor: "#334155", color: "white", border: "1px solid #475569", marginBottom: "12px", boxSizing: "border-box" }} />
        <button onClick={createTransfer} style={{ width: "100%", padding: "12px", backgroundColor: "#3b82f6", color: "white", border: "none", borderRadius: "8px", fontWeight: "bold" }}>
          {t("transaction.transfer")}
        </button>
      </div>
    </div>
  );
}

function DebtsTab() {
  const { t } = useTranslation(["dashboard", "translation"]);
  const { wallets, debts, people, showNotification, refreshAfterTransactionChange, BASE_URL } = useAppData();

  const [newPersonName, setNewPersonName] = useState("");

  // Мини-форма "Дать/Взять в долг"
  const [debtAction, setDebtAction] = useState("loan_given"); // loan_given = я дал в долг, loan_taken = я взял в долг
  const [debtAmount, setDebtAmount] = useState("");
  const [debtWalletId, setDebtWalletId] = useState("");
  const [debtPersonId, setDebtPersonId] = useState("");

  // Мини-форма "Погасить долг"
  const [repayType, setRepayType] = useState("loan_repaid_to_us"); // нам вернули / мы вернули
  const [repayDebtId, setRepayDebtId] = useState("");
  const [repayAmount, setRepayAmount] = useState("");
  const [repayWalletId, setRepayWalletId] = useState("");

  const handleCreatePerson = async (e) => {
    e.preventDefault();
    if (!newPersonName.trim()) return;
    const token = localStorage.getItem("token");
    const response = await fetch(`${BASE_URL}/debts/people?name=${encodeURIComponent(newPersonName.trim())}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` }
    });
    if (response.ok) {
      setNewPersonName("");
      showNotification(t("notifications.contact_created"));
      refreshAfterTransactionChange();
    } else {
      showNotification(t("notifications.contact_error"), "error");
    }
  };

  const createDebtTransaction = async () => {
    if (!debtWalletId) { showNotification(t("notifications.wallet_required"), "error"); return; }
    if (!debtPersonId) { showNotification(t("notifications.select_contact"), "error"); return; }
    const parsedAmount = Number(debtAmount);
    if (!debtAmount || isNaN(parsedAmount) || parsedAmount <= 0) {
      showNotification(t("notifications.invalid_amount"), "error");
      return;
    }

    const token = localStorage.getItem("token");
    const response = await fetch(`${BASE_URL}/transactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        type: debtAction,
        amount: parsedAmount,
        description: debtAction === "loan_given" ? t("transaction.loan_given") : t("transaction.loan_taken"),
        wallet_id: Number(debtWalletId),
        date: new Date().toISOString(),
        person_id: Number(debtPersonId),
        debt_id: null,
        to_wallet_id: null,
        category_id: null,
      })
    });

    if (response.ok) {
      showNotification(t("notifications.transaction_created"));
      setDebtAmount(""); setDebtPersonId(""); setDebtWalletId("");
      refreshAfterTransactionChange();
    } else {
      showNotification(t("notifications.transaction_error"), "error");
    }
  };

  const createRepayTransaction = async () => {
    if (!repayWalletId) { showNotification(t("notifications.wallet_required"), "error"); return; }
    if (!repayDebtId) { showNotification(t("notifications.select_debt"), "error"); return; }
    const parsedAmount = Number(repayAmount);
    if (!repayAmount || isNaN(parsedAmount) || parsedAmount <= 0) {
      showNotification(t("notifications.invalid_amount"), "error");
      return;
    }

    const token = localStorage.getItem("token");
    const response = await fetch(`${BASE_URL}/transactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        type: repayType,
        amount: parsedAmount,
        description: repayType === "loan_repaid_to_us" ? t("transaction.loan_repaid_to_us") : t("transaction.loan_repaid_by_us"),
        wallet_id: Number(repayWalletId),
        date: new Date().toISOString(),
        person_id: null,
        debt_id: Number(repayDebtId),
        to_wallet_id: null,
        category_id: null,
      })
    });

    if (response.ok) {
      showNotification(t("notifications.transaction_created"));
      setRepayAmount(""); setRepayDebtId(""); setRepayWalletId("");
      refreshAfterTransactionChange();
    } else {
      showNotification(t("notifications.transaction_error"), "error");
    }
  };

  return (
    <div>
      {/* Добавить контакт */}
      <form onSubmit={handleCreatePerson} style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
        <input type="text" placeholder={t("debts.contact_placeholder")} value={newPersonName} onChange={(e) => setNewPersonName(e.target.value)}
          style={{ flex: 1, padding: "10px", borderRadius: "8px", backgroundColor: "#334155", color: "white", border: "1px solid #475569" }} />
        <button type="submit" style={{ padding: "10px 16px", backgroundColor: "#3b82f6", color: "white", border: "none", borderRadius: "8px", fontWeight: "bold" }}>
          + {t("debts.add_contact")}
        </button>
      </form>

      {/* Списки долгов */}
      <div style={{ display: "flex", flexDirection: "column", gap: "15px", marginBottom: "20px" }}>
        <div style={{ backgroundColor: "#1e293b", padding: "15px", borderRadius: "12px" }}>
          <h4 style={{ color: "#10b981", marginBottom: "10px" }}>🟢 {t("debts.they_owe")}</h4>
          {debts.filter(d => d.type === "they_owe").length === 0 ? (
            <p style={{ color: "#64748b", fontSize: "0.9rem" }}>{t("debts.all_paid")}</p>
          ) : (
            debts.filter(d => d.type === "they_owe").map(d => (
              <div key={d.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px dashed #334155" }}>
                <span>{people.find(p => String(p.id) === String(d.person_id))?.name || t("debts.unknown_person")}</span>
                <span style={{ fontWeight: "bold", color: "#10b981" }}>
                  {d.remaining !== undefined ? d.remaining : d.amount}
                </span>
              </div>
            ))
          )}
        </div>

        <div style={{ backgroundColor: "#1e293b", padding: "15px", borderRadius: "12px" }}>
          <h4 style={{ color: "#ef4444", marginBottom: "10px" }}>🔴 {t("debts.we_owe")}</h4>
          {debts.filter(d => d.type === "we_owe").length === 0 ? (
            <p style={{ color: "#64748b", fontSize: "0.9rem" }}>{t("debts.nothing_owed")}</p>
          ) : (
            debts.filter(d => d.type === "we_owe").map(d => (
              <div key={d.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px dashed #334155" }}>
                <span>{people.find(p => String(p.id) === String(d.person_id))?.name || t("debts.creditor")}</span>
                <span style={{ fontWeight: "bold", color: "#ef4444" }}>
                  {d.remaining !== undefined ? d.remaining : d.amount}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Записать новый долг */}
      <div style={{ backgroundColor: "#1e293b", padding: "18px", borderRadius: "14px", marginBottom: "15px" }}>
        <h3 style={{ marginTop: 0, marginBottom: "12px" }}>{t("debts.title")}</h3>
        <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
          <button onClick={() => setDebtAction("loan_given")} style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "none", backgroundColor: debtAction === "loan_given" ? "#10b981" : "#334155", color: "white", fontWeight: "bold" }}>
            {t("transaction.loan_given")}
          </button>
          <button onClick={() => setDebtAction("loan_taken")} style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "none", backgroundColor: debtAction === "loan_taken" ? "#ef4444" : "#334155", color: "white", fontWeight: "bold" }}>
            {t("transaction.loan_taken")}
          </button>
        </div>
        <select value={debtPersonId} onChange={(e) => setDebtPersonId(e.target.value)}
          style={{ width: "100%", padding: "10px", borderRadius: "8px", backgroundColor: "#334155", color: "white", border: "1px solid #475569", marginBottom: "10px", boxSizing: "border-box" }}>
          <option value="">{t("debts.select_contact")}</option>
          {people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select value={debtWalletId} onChange={(e) => setDebtWalletId(e.target.value)}
          style={{ width: "100%", padding: "10px", borderRadius: "8px", backgroundColor: "#334155", color: "white", border: "1px solid #475569", marginBottom: "10px", boxSizing: "border-box" }}>
          <option value="">{t("wallet.select")}</option>
          {wallets.map(w => <option key={w.id} value={w.id}>{w.name} ({w.currency})</option>)}
        </select>
        <input type="number" min="0.01" step="any" placeholder={t("transaction.amount")} value={debtAmount} onChange={(e) => setDebtAmount(e.target.value)}
          style={{ width: "100%", padding: "10px", borderRadius: "8px", backgroundColor: "#334155", color: "white", border: "1px solid #475569", marginBottom: "12px", boxSizing: "border-box" }} />
        <button onClick={createDebtTransaction} style={{ width: "100%", padding: "12px", backgroundColor: "#3b82f6", color: "white", border: "none", borderRadius: "8px", fontWeight: "bold" }}>
          {t("common.create")}
        </button>
      </div>

      {/* Погасить долг */}
      <div style={{ backgroundColor: "#1e293b", padding: "18px", borderRadius: "14px" }}>
        <h3 style={{ marginTop: 0, marginBottom: "12px" }}>{t("debts.repay_debt")}</h3>
        <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
          <button onClick={() => { setRepayType("loan_repaid_to_us"); setRepayDebtId(""); }} style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "none", backgroundColor: repayType === "loan_repaid_to_us" ? "#10b981" : "#334155", color: "white", fontWeight: "bold", fontSize: "0.85rem" }}>
            {t("transaction.loan_repaid_to_us")}
          </button>
          <button onClick={() => { setRepayType("loan_repaid_by_us"); setRepayDebtId(""); }} style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "none", backgroundColor: repayType === "loan_repaid_by_us" ? "#ef4444" : "#334155", color: "white", fontWeight: "bold", fontSize: "0.85rem" }}>
            {t("transaction.loan_repaid_by_us")}
          </button>
        </div>
        <select value={repayDebtId} onChange={(e) => setRepayDebtId(e.target.value)}
          style={{ width: "100%", padding: "10px", borderRadius: "8px", backgroundColor: "#334155", color: "white", border: "1px solid #475569", marginBottom: "10px", boxSizing: "border-box" }}>
          <option value="">{t("debts.select_debt")}</option>
          {debts.filter(d => repayType === "loan_repaid_to_us" ? d.type === "they_owe" : d.type === "we_owe").map(d => {
            const personName = people.find(p => String(p.id) === String(d.person_id))?.name || t("debts.unknown_person");
            const amountToShow = d.remaining !== undefined ? d.remaining : d.amount;
            return <option key={d.id} value={d.id}>{personName} — {amountToShow}</option>;
          })}
        </select>
        <select value={repayWalletId} onChange={(e) => setRepayWalletId(e.target.value)}
          style={{ width: "100%", padding: "10px", borderRadius: "8px", backgroundColor: "#334155", color: "white", border: "1px solid #475569", marginBottom: "10px", boxSizing: "border-box" }}>
          <option value="">{t("wallet.select")}</option>
          {wallets.map(w => <option key={w.id} value={w.id}>{w.name} ({w.currency})</option>)}
        </select>
        <input type="number" min="0.01" step="any" placeholder={t("transaction.amount")} value={repayAmount} onChange={(e) => setRepayAmount(e.target.value)}
          style={{ width: "100%", padding: "10px", borderRadius: "8px", backgroundColor: "#334155", color: "white", border: "1px solid #475569", marginBottom: "12px", boxSizing: "border-box" }} />
        <button onClick={createRepayTransaction} style={{ width: "100%", padding: "12px", backgroundColor: "#22c55e", color: "white", border: "none", borderRadius: "8px", fontWeight: "bold" }}>
          {t("common.create")}
        </button>
      </div>
    </div>
  );
}

function Wallets() {
  const { t } = useTranslation(["dashboard", "translation"]);

  return (
    <div style={{ padding: "20px", color: "white" }}>
      <h1 style={{ fontSize: "1.5rem", marginBottom: "20px" }}>{t("wallet.title")}</h1>
      <Tabs
        tabs={[
          { label: `💳 ${t("wallet.title")}`, content: <WalletsTab /> },
          { label: `🤝 ${t("debts.title")}`, content: <DebtsTab /> },
        ]}
      />
    </div>
  );
}

export default Wallets;