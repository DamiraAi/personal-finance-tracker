import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import Login from "./pages/Login"
import Dashboard from "./pages/Dashboard"

function App() {
  // Защита роутов: если токена нет, перенаправляем на логин
  const ProtectedRoute = ({ children }) => {
    const token = localStorage.getItem("token")
    return token ? children : <Navigate to="/" />
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Публичный роут: Авторизация */}
        <Route path="/" element={<Login />} />
        
        {/* Защищенный роут: Дашборд с графиками */}
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } 
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App