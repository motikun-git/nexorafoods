import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import RequireAdmin from './components/auth/RequireAdmin.jsx'
import Toast from './components/ui/Toast.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { NotifyProvider } from './context/NotifyContext.jsx'
import { SettingsProvider } from './context/SettingsContext.jsx'
import AdminLayout from './layouts/AdminLayout.jsx'
import AdminCategories from './pages/AdminCategories.jsx'
import AdminDashboard from './pages/AdminDashboard.jsx'
import AdminMessages from './pages/AdminMessages.jsx'
import AdminOrderDetail from './pages/AdminOrderDetail.jsx'
import AdminOrders from './pages/AdminOrders.jsx'
import AdminProductForm from './pages/AdminProductForm.jsx'
import AdminProducts from './pages/AdminProducts.jsx'
import AdminSettings from './pages/AdminSettings.jsx'
import LoginPage from './pages/LoginPage.jsx'
import NotFoundPage from './pages/NotFoundPage.jsx'

/*
 * The admin panel: a separate app from the store, served at /admin.
 * Page addresses are the same as before (/admin, /admin/orders ...).
 */
export default function App() {
  return (
    <BrowserRouter>
      <SettingsProvider>
        <AuthProvider>
          <NotifyProvider>
            <Routes>
              <Route path="admin/login" element={<LoginPage />} />
              <Route
                path="admin"
                element={
                  <RequireAdmin>
                    <AdminLayout />
                  </RequireAdmin>
                }
              >
                <Route index element={<AdminDashboard />} />
                <Route path="orders" element={<AdminOrders />} />
                <Route path="orders/:orderNumber" element={<AdminOrderDetail />} />
                <Route path="products" element={<AdminProducts />} />
                <Route path="products/new" element={<AdminProductForm />} />
                <Route path="products/:id" element={<AdminProductForm key="edit" />} />
                <Route path="categories" element={<AdminCategories />} />
                <Route path="settings" element={<AdminSettings />} />
                <Route path="messages" element={<AdminMessages />} />
                <Route path="*" element={<NotFoundPage />} />
              </Route>
              {/* Anything outside /admin (e.g. "/") goes to the dashboard. */}
              <Route path="*" element={<Navigate to="/admin" replace />} />
            </Routes>
            <Toast />
          </NotifyProvider>
        </AuthProvider>
      </SettingsProvider>
    </BrowserRouter>
  )
}
