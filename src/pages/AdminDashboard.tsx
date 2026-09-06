import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldAlert, Users, Package, Trash2, CheckCircle, ArrowLeft, Sun, Moon, LogOut, ShieldCheck } from 'lucide-react';
import { apiFetch } from '../api/client';

interface UserItem {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface ProductItem {
  id: string;
  title: string;
  category?: { name: string } | string;
  priceUSD: number;
  type?: string;
  isSold?: boolean;
}

export default function Admin() {
  const navigate = useNavigate();
  const [darkMode, setDarkMode] = useState(true);
  const [activeTab, setActiveTab] = useState<'users' | 'products'>('users');
  
  const [users, setUsers] = useState<UserItem[]>([]);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');

    if (!token || !userStr) {
      navigate('/login?redirect=/admin');
      return;
    }

    try {
      const user = JSON.parse(userStr);
      const role = user.role ? user.role.toUpperCase() : '';
      const isAdminEmail = user.email?.toLowerCase().trim() === 'aganzechristophe2007@gmail.com';
      
      if (role !== 'ADMIN' && role !== 'SUPER_ADMIN' && !isAdminEmail) {
        navigate('/');
        return;
      }
    } catch {
      navigate('/login?redirect=/admin');
      return;
    }

    fetchAdminData(token);
  }, [navigate]);

  const fetchAdminData = async (token: string) => {
    setLoading(true);
    setError('');
    
    try {
      // Utilisation de apiFetch ou fetch direct avec token
      const [usersRes, productsRes] = await Promise.allSettled([
        fetch('https://cbfsoko-backend.onrender.com/api/admin/users', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('https://cbfsoko-backend.onrender.com/api/products', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      // Traitement des utilisateurs
      if (usersRes.status === 'fulfilled' && usersRes.value.ok) {
        const usersData = await usersRes.value.json();
        // S'adapte si l'API renvoie { data: [...] [...] } ou directement un tableau [...]
        setUsers(Array.isArray(usersData) ? usersData : (usersData.data || usersData.users || []));
      } else {
        console.warn("Impossible de charger les utilisateurs depuis l'API admin.");
      }

      // Traitement des produits
      if (productsRes.status === 'fulfilled' && productsRes.value.ok) {
        const productsData = await productsRes.value.json();
        const list = Array.isArray(productsData) ? productsData : (productsData.data || productsData.products || []);
        
        // Normalisation de la catégorie pour l'affichage tableau
        const formattedProducts = list.map((p: any) => ({
          ...p,
          category: typeof p.category === 'object' && p.category !== null ? p.category.name : (p.category || 'Général')
        }));
        
        setProducts(formattedProducts);
      } else {
        console.warn("Impossible de charger les produits depuis l'API.");
      }

    } catch (err: any) {
      setError("Impossible de joindre le serveur. Vérifiez que votre backend tourne sur le port 5000.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!window.confirm("Voulez-vous vraiment supprimer définitivement cet article de la base de données ?")) return;
    const token = localStorage.getItem('token');

    try {
      const response = await fetch(`https://cbfsoko-backend.onrender.com/api/products/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Erreur lors de la suppression');
      }

      setProducts(products.filter(p => p.id !== id));
    } catch (err: any) {
      alert(`Échec de la suppression : ${err.message}`);
    }
  };

  const handleDeleteUser = async (id: string, email: string) => {
    if (email.toLowerCase() === 'aganzechristophe2007@gmail.com') {
      alert("Impossible de supprimer le Super Administrateur principal !");
      return;
    }

    if (!window.confirm("Voulez-vous vraiment supprimer cet utilisateur de la plateforme ?")) return;
    const token = localStorage.getItem('token');

    try {
      await fetch(`https://cbfsoko-backend.onrender.com//api/admin/users/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      setUsers(users.filter(u => u.id !== id));
    } catch (err: any) {
      alert(`Erreur suppression utilisateur : ${err.message}`);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${darkMode ? 'bg-neutral-950 text-white' : 'bg-neutral-50 text-neutral-900'}`}>
      
      {/* HEADER ADMIN */}
      <header className={`sticky top-0 z-50 border-b px-4 lg:px-8 py-3 transition-colors ${
        darkMode ? 'bg-neutral-900/90 border-neutral-800 backdrop-blur-md' : 'bg-white/90 border-neutral-200 backdrop-blur-md'
      }`}>
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-10 h-10 bg-orange-600 rounded-xl flex items-center justify-center text-white font-black text-base shadow-lg shadow-orange-600/30">
              CBF
            </div>
            <div>
              <span className="font-extrabold text-base tracking-tight block leading-none">CBFSOKO</span>
              <span className="text-[10px] text-orange-500 font-bold tracking-widest uppercase">Admin Panel Bukavu</span>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`p-2.5 rounded-xl border transition flex items-center justify-center cursor-pointer ${
                darkMode ? 'bg-neutral-950 border-neutral-800 text-yellow-400' : 'bg-white border-neutral-300 text-neutral-800'
              }`}
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4 text-orange-600" />}
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 bg-red-600/10 text-red-400 hover:bg-red-600 hover:text-white px-3.5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer border border-red-500/20"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Déconnexion</span>
            </button>
          </div>
        </div>
      </header>

      {/* CONTENU PRINCIPAL */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ShieldAlert className="w-5 h-5 text-orange-500" />
              <h1 className="text-2xl font-black tracking-tight">Panneau d'Administration</h1>
            </div>
            <p className="text-xs text-neutral-400">Contrôlez l'ensemble des utilisateurs, modérez les articles et supervisez les boutiques à Bukavu.</p>
          </div>

          <Link to="/" className="text-xs font-semibold text-neutral-400 hover:text-white flex items-center gap-1.5 transition">
            <ArrowLeft className="w-4 h-4" /> Retour au site public
          </Link>
        </div>

        {/* ONGLETS */}
        <div className="flex gap-3 mb-8 border-b border-neutral-800 pb-4">
          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'users'
                ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/20'
                : darkMode ? 'bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800' : 'bg-white text-neutral-600 hover:text-black border border-neutral-300'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Gestion des Utilisateurs ({users.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('products')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'products'
                ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/20'
                : darkMode ? 'bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800' : 'bg-white text-neutral-600 hover:text-black border border-neutral-300'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Gestion des Produits ({products.length})</span>
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-orange-500/10 border border-orange-500/20 text-orange-400 rounded-xl text-xs">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-20 text-neutral-500 text-xs flex flex-col items-center justify-center gap-3">
            <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
            Chargement des données de la plateforme...
          </div>
        ) : (
          <>
            {/* SECTION UTILISATEURS */}
            {activeTab === 'users' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                <div className={`border rounded-2xl overflow-hidden ${darkMode ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-neutral-200'}`}>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className={`border-b text-[11px] uppercase tracking-wider ${darkMode ? 'border-neutral-800 text-neutral-400 bg-neutral-950/50' : 'border-neutral-200 text-neutral-500 bg-neutral-50'}`}>
                          <th className="p-4">Nom complet</th>
                          <th className="p-4">Email</th>
                          <th className="p-4">Rôle</th>
                          <th className="p-4">Statut</th>
                          <th className="p-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-800/50 text-xs">
                        {users.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="p-8 text-center text-neutral-500">Aucun utilisateur trouvé.</td>
                          </tr>
                        ) : (
                          users.map(u => (
                            <tr key={u.id} className="hover:bg-neutral-800/10 transition">
                              <td className="p-4 font-bold flex items-center gap-2">
                                {u.name}
                                {(u.role === 'ADMIN' || u.role === 'SUPER_ADMIN') && (
                                  <span title="Administrateur">
                                    <ShieldCheck className="w-3.5 h-3.5 text-orange-500" />
                                  </span>
                                )}
                              </td>
                              <td className="p-4 text-neutral-400">{u.email}</td>
                              <td className="p-4">
                                <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold ${
                                  u.role === 'SUPER_ADMIN' 
                                    ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' 
                                    : u.role === 'ADMIN' 
                                    ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' 
                                    : 'bg-neutral-800 text-neutral-300'
                                }`}>
                                  {u.role}
                                </span>
                              </td>
                              <td className="p-4 text-emerald-400 font-semibold flex items-center gap-1 pt-5">
                                <CheckCircle className="w-4 h-4" /> Actif
                              </td>
                              <td className="p-4 text-right">
                                {u.email.toLowerCase() !== 'aganzechristophe2007@gmail.com' && (
                                  <button
                                    onClick={() => handleDeleteUser(u.id, u.email)}
                                    className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition cursor-pointer"
                                    title="Supprimer l'utilisateur"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}

            {/* SECTION PRODUITS */}
            {activeTab === 'products' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                <div className={`border rounded-2xl overflow-hidden ${darkMode ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-neutral-200'}`}>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className={`border-b text-[11px] uppercase tracking-wider ${darkMode ? 'border-neutral-800 text-neutral-400 bg-neutral-950/50' : 'border-neutral-200 text-neutral-500 bg-neutral-50'}`}>
                          <th className="p-4">Titre de l'article</th>
                          <th className="p-4">Catégorie</th>
                          <th className="p-4">Prix</th>
                          <th className="p-4">Type</th>
                          <th className="p-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-800/50 text-xs">
                        {products.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="p-8 text-center text-neutral-500">Aucun produit trouvé en base de données.</td>
                          </tr>
                        ) : (
                          products.map(product => (
                            <tr key={product.id} className="hover:bg-neutral-800/10 transition">
                              <td className="p-4 font-bold">{product.title}</td>
                              <td className="p-4 text-neutral-400">{typeof product.category === 'string' ? product.category : 'Général'}</td>
                              <td className="p-4 font-black text-orange-500">{product.priceUSD || 0} $</td>
                              <td className="p-4">
                                <span className={`px-2 py-1 rounded-md text-[10px] font-bold ${product.type === 'SALE' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'}`}>
                                  {product.type || 'SALE'}
                                </span>
                              </td>
                              <td className="p-4 text-right">
                                <button
                                  onClick={() => handleDeleteProduct(product.id)}
                                  className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition cursor-pointer"
                                  title="Supprimer l'article"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}
          </>
        )}

      </div>
    </div>
  );
}