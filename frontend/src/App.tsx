import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import AppFrame from "@/components/layout/AppFrame";
import AuthPage from "@/pages/AuthPage";
import DashboardPage from "@/pages/DashboardPage";
import InventoryPage from "@/pages/InventoryPage";
import VerifyEmailPage from "@/pages/VerifyEmailPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/auth/verify-email" element={<VerifyEmailPage />} />
        <Route
          path="/inventory"
          element={
            <AppFrame>
              <InventoryPage />
            </AppFrame>
          }
        />
        <Route
          path="/"
          element={
            <AppFrame>
              <DashboardPage />
            </AppFrame>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
