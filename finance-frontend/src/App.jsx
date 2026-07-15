import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import Login from "./pages/Login"
import ForgotPassword from "./pages/ForgotPassword"
import ResetPassword from "./pages/ResetPassword"
import Home from "./pages/Home"
import Wallets from "./pages/Wallets"
import Reports from "./pages/Reports"
import Profile from "./pages/Profile"
import Transactions from "./pages/Transactions"
import AppLayout from "./layouts/AppLayout"


function App() {
  const ProtectedRoute = ({ children }) => {
    const token = localStorage.getItem("token")
    return token ? children : <Navigate to="/" />
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Публичные роуты */}
        <Route path="/" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Защищённые роуты — все внутри AppLayout с нижней навигацией */}
        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/home" element={<Home />} />
          <Route path="/wallets" element={<Wallets />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/transactions" element={<Transactions />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App