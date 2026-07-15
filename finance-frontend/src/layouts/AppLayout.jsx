import { useState } from "react";
import { Outlet } from "react-router-dom";
import BottomNav from "../components/BottomNav";
import AddTransactionSheet from "../components/AddTransactionSheet";

function AppLayout() {
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <div style={{ backgroundColor: "#0f172a", minHeight: "100vh" }}>
      <div style={{ paddingBottom: "90px" }}>
        <Outlet />
      </div>

      <AddTransactionSheet isOpen={sheetOpen} onClose={() => setSheetOpen(false)} />
      <BottomNav onAddClick={() => setSheetOpen(true)} />
    </div>
  );
}

export default AppLayout;