import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import Home from './pages/Home';
import Products from './pages/Products';
import Login from './pages/Login';
import Register from './pages/register';
import CreateProduct from './pages/CreateProduct';
import Orders from './pages/Orders';
import Messages from './pages/Messages';
import Notifications from './pages/Notifications';
import FullUserWallet from './pages/UserWallet';
import UpdateProfile from './pages/UpdateProfile'; // Import du nouveau composant
import AdminDashboard from './pages/AdminDashboard';
import AdminSellerDashboard from './pages/AdminSellerDashboard';    
import AdminFinancesDashboard from './pages/AdminFinancesDashboard'; 
import ProtectedRoute from './components/ProtectedRoute';

export default function App() {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        {/* Authentification */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        {/* Pages principales */}
        <Route path="/" element={<Home />} />
        <Route path="/update-profile" element={<UpdateProfile />} />
        <Route path="/products" element={<Products />} />
        <Route path="/create-product" element={<CreateProduct />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/messages" element={<Messages />} />
        <Route path="/accueil" element={<Home />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/wallet" element={<FullUserWallet />} />

        {/* Routes Administration / Finances protégées */}
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
    </Router>
  );
}