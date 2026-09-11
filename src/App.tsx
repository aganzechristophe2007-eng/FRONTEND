import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import { SocketProvider } from './context/SocketContext';
import { IncomingCallModal } from './components/IncomingCallModal';

import Home from './pages/Home';
import Products from './pages/Products';
import ProductDetails from './pages/ProductDetail'; 
import Login from './pages/Login';
import Register from './pages/register';
import CreateProduct from './pages/CreateProduct';
import Orders from './pages/Orders';
import MessagingPage from "./pages/Messages";
import Notifications from './pages/Notifications';
import FullUserWallet from './pages/UserWallet';
import UpdateProfile from './pages/UpdateProfile';
import AdminDashboard from './pages/AdminDashboard';
import AdminSellerDashboard from './pages/AdminSellerDashboard';
import AdminFinancesDashboard from './pages/AdminFinancesDashboard';
import LegalPage from './pages/LegalPage';
import ProtectedRoute from './components/ProtectedRoute';

export default function App() {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <SocketProvider>
        <Routes>
          {/* Authentification */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          {/* Pages principales & Catalogue */}
          <Route path="/" element={<Home />} />
          <Route path="/accueil" element={<Home />} />
          <Route path="/update-profile" element={<UpdateProfile />} />
          <Route path="/products" element={<Products />} />
          <Route path="/products/:id" element={<ProductDetails />} />
          <Route path="/create-product" element={<CreateProduct />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/messages" element={<MessagingPage />} />
          <Route path="/notifications" element={<Notifications isLightMode={false} />} />
          <Route path="/wallet" element={<FullUserWallet />} />

          {/* Pages légales (CGU, Confidentialité, Cookies, Mentions légales, Règles communauté) */}
          <Route path="/legal/:slug" element={<LegalPage />} />

          {/* Routes Administration & Finances protégées */}
          <Route 
            path="/admin/dashboard" 
            element={
              <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
                <AdminDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/seller-dashboard" 
            element={
              <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'ADMIN_SELLER']}>
                <AdminSellerDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/finances-dashboard" 
            element={
              <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN_FINANCE']}>
                <AdminFinancesDashboard />
              </ProtectedRoute>
            } 
          />

          {/* Redirection globale par défaut */}
          <Route path="*" element={<Home />} />
        </Routes>

        {/* Monté en permanence, visible sur toutes les pages */}
        <IncomingCallModal />
      </SocketProvider>
    </Router>
  );
}