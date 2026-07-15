import { useTranslation } from "react-i18next";
import { useAppData } from "../context/AppDataContext";
import { Link } from "react-router-dom";
function Home() {
  const { t, i18n } = useTranslation(["dashboard", "translation"]);
  const { wallets, report, recentTransactions } = useAppData();

  const totalBalance = wallets.reduce((sum, w) => sum + Number(w.balance || 0), 0);

  const currentLocale = i18n.language?.startsWith("tr")
    ? "tr-TR"
    : i18n.language?.startsWith("en")
    ? "en-US"
    : "ru-RU";

  const getTypeColor = (txType) => {
    if (["income", "loan_taken", "loan_repaid_to_us"].includes(txType)) return "#22c55e";
    return "#ef4444";
  };

  return (
    <div style={{ padding: "20px", color: "white" }}>
      <h1 style={{
        fontSize: "1.8rem", fontWeight: "800", margin: "0 0 20px 0",
        background: "linear-gradient(to right, #3b82f6, #a855f7)",
        WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent"
      }}>
        {t("title")}
      </h1>

      {/* Общая сумма всех денег */}
      <div style={{
        backgroundColor: "#1e293b", padding: "25px", borderRadius: "16px",
        marginBottom: "20px", textAlign: "center"
      }}>
        <p style={{ color: "#94a3b8", margin: 0, fontSize: "0.9rem", textTransform: "uppercase" }}>
          {t("summary.balance")}
        </p>
        <h1 style={{ color: "#3b82f6", margin: "10px 0 0 0", fontSize: "2.4rem" }}>
          {totalBalance.toFixed(2)}
        </h1>
      </div>

      {/* Доход / расход за период (быстрый баланс) */}
      {report && (
        <div style={{ display: "flex", gap: "12px", marginBottom: "25px" }}>
          <div style={{ flex: 1, backgroundColor: "#1e293b", padding: "18px", borderRadius: "14px", borderLeft: "4px solid #22c55e" }}>
            <p style={{ color: "#94a3b8", margin: 0, fontSize: "0.8rem" }}>{t("summary.income")}</p>
            <h2 style={{ color: "#22c55e", margin: "6px 0 0 0", fontSize: "1.4rem" }}>{report.total_income}</h2>
          </div>
          <div style={{ flex: 1, backgroundColor: "#1e293b", padding: "18px", borderRadius: "14px", borderLeft: "4px solid #ef4444" }}>
            <p style={{ color: "#94a3b8", margin: 0, fontSize: "0.8rem" }}>{t("summary.expense")}</p>
            <h2 style={{ color: "#ef4444", margin: "6px 0 0 0", fontSize: "1.4rem" }}>{report.total_expense}</h2>
          </div>
        </div>
      )}

      {/* Последние 3 транзакции */}
     
      <div style={{ backgroundColor: "#1e293b", padding: "18px", borderRadius: "16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
          <h2 style={{ fontSize: "1.1rem", margin: 0 }}>{t("transactions.title")}</h2>
          <Link to="/transactions" style={{ color: "#3b82f6", fontSize: "0.85rem", textDecoration: "none" }}>
            {t("transactions.see_all", "Показать все")} →
          </Link>
        </div>

        {recentTransactions.length === 0 ? (
          <p style={{ color: "#94a3b8", textAlign: "center", padding: "15px 0" }}>
            {t("transactions.not_found")}
          </p>
        ) : (
          recentTransactions.map((tx) => {
            const txId = tx.id || tx.transaction_id;
            return (
              <div key={txId} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "12px 0", borderBottom: "1px solid #334155"
              }}>
                <div>
                  <p style={{ margin: 0, color: "#e2e8f0" }}>
                    {tx.description || t("transaction.without_description")}
                  </p>
                  <p style={{ margin: "4px 0 0 0", color: "#64748b", fontSize: "12px" }}>
                    {tx.date ? new Date(tx.date).toLocaleDateString(currentLocale, {
                      day: "2-digit", month: "2-digit", year: "numeric"
                    }) : ""}
                  </p>
                </div>
                <span style={{ fontWeight: "bold", color: getTypeColor(tx.type) }}>
                  {["income", "loan_taken", "loan_repaid_to_us"].includes(tx.type) ? "+" : "-"} {tx.amount}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default Home;