import type { ReactNode } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import AppFrame from "@/components/layout/AppFrame";
import AuthPage from "@/pages/AuthPage";
import DashboardPage from "@/pages/DashboardPage";
import InventoryPage from "@/pages/InventoryPage";
import LocationsPage from "@/pages/LocationsPage";
import ReportsPage from "@/pages/ReportsPage";
import SettingsPage from "@/pages/SettingsPage";
import TransactionsPage from "@/pages/TransactionsPage";
import VerifyEmailPage from "@/pages/VerifyEmailPage";
import WarehousesPage from "@/pages/WarehousesPage";

const framed = (page: ReactNode) => <AppFrame>{page}</AppFrame>;

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/auth/verify-email" element={<VerifyEmailPage />} />
        <Route path="/inventory" element={framed(<InventoryPage />)} />
        <Route path="/transactions" element={framed(<TransactionsPage />)} />
        <Route path="/inbound" element={framed(<TransactionsPage type="inbound" />)} />
        <Route path="/outbound" element={framed(<TransactionsPage type="outbound" />)} />
        <Route path="/transfers" element={framed(<TransactionsPage type="transfer" />)} />
        <Route path="/adjustments" element={framed(<TransactionsPage type="adjustment" />)} />
        <Route path="/warehouses" element={framed(<WarehousesPage />)} />
        <Route path="/locations" element={framed(<LocationsPage />)} />
        <Route path="/reports" element={framed(<ReportsPage />)} />
        <Route path="/settings" element={framed(<SettingsPage />)} />
        <Route path="/" element={framed(<DashboardPage />)} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
