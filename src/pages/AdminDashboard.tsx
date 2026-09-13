import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldAlert, Users, Package, Store, Trash2, CheckCircle, XCircle, ArrowLeft,
  Sun, Moon, LogOut, ShieldCheck, MapPin, Phone, Clock, Loader2
} from 'lucide-react';

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

interface BoutiqueApplication {
  id: string;
  name: string;
  category?: string;
  city?: string;
  neighborhood?: string;
  address?: string;
  phone?: string;
  description?: string;
  photos?: string[];
  status: 'pending' | 'approved' | 'rejected';
  applicantName?: string;
  applicantEmail?: string;
  rejectionReason?: string;
  createdAt?: string;
}

const BACKEND = 'https://cbfsoko-backend.onrender.com';

export default function Admin() {
  const navigate = useNavigate();
  const [darkMode, setDarkMode] = useState<boolean>(() => localStorage.getItem('cbfsoko-theme-mode') === 'light' ? false : true);
  const [activeTab, setActiveTab] = useState<'users' | 'products' | 'boutiques'>('boutiques');

  const [users, setUsers] = useState<UserItem[]>([]);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [boutiques, setBoutiques] = useState<BoutiqueApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Écran de bienvenue personnalisé, affiché brièvement à l'ouverture
  const [showWelcome, setShowWelcome] = useState(true);
  const adminFirstName = (() => {
    try {
      const u = JSON.parse(localStorage.getItem('user') || '{}');
      return u.name ? String(u.name).split(' ')[0] : 'Christophe';
    } catch { return 'Christophe'; }
  })();
  const greeting = new Date().getHours() < 18 ? 'Bonjour' : 'Bonsoir';

  const pendingCount = boutiques.filter(b => b.status === 'pending').length;

  const toggleTheme = () => {
    setDarkMode(prev => {
      localStorage.setItem('cbfsoko-theme-mode', prev ? 'light' : 'dark');
      return !prev;
    });
  };

  const getPhotoUrl = (path?: string) => {
    if (!path) return '';
    if (path.startsWith('http') || path.startsWith('blob:') || path.startsWith('data:')) return path;
    const clean = path.replace(/\\/g, '/').replace(/^\/+/, '');
    return `${BACKEND}/${clean.startsWith('uploads/') ? clean : 'uploads/' + clean}`;
  };

  useEffect(() => {
    const t = setTimeout(() => setShowWelcome(false), 1600);
    return () => clearTimeout(t);
  }, []);

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
      const [usersRes, productsRes, boutiquesRes] = await Promise.allSettled([
        fetch(`${BACKEND}/api/admin/users`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${BACKEND}/api/products`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${BACKEND}/api/admin/boutiques`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (usersRes.status === 'fulfilled' && usersRes.value.ok) {
        const usersData = await usersRes.value.json();
        setUsers(Array.isArray(usersData) ? usersData : (usersData.data || usersData.users || []));
      } else {
        console.warn("Impossible de charger les utilisateurs depuis l'API admin.");
      }

      if (productsRes.status === 'fulfilled' && productsRes.value.ok) {
        const productsData = await productsRes.value.json();
        const list = Array.isArray(productsData) ? productsData : (productsData.data || productsData.products || []);
        const formattedProducts = list.map((p: any) => ({
          ...p,
          category: typeof p.category === 'object' && p.category !== null ? p.category.name : (p.category || 'Général')
        }));
        setProducts(formattedProducts);
      } else {
        console.warn("Impossible de charger les produits depuis l'API.");
      }

      if (boutiquesRes.status === 'fulfilled' && boutiquesRes.value.ok) {
        const boutiquesData = await boutiquesRes.value.json();
        const list = Array.isArray(boutiquesData) ? boutiquesData : (boutiquesData.data || []);
        setBoutiques(list.sort((a: BoutiqueApplication, b: BoutiqueApplication) => (a.status === 'pending' ? -1 : 1) - (b.status === 'pending' ? -1 : 1)));
      } else {
        console.warn("Impossible de charger les candidatures boutique depuis l'API.");
      }
    } catch (err: any) {
      setError('Impossible de joindre le serveur. Vérifiez que votre backend tourne.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!window.confirm('Voulez-vous vraiment supprimer définitivement cet article de la base de données ?')) return;
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${BACKEND}/api/products/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
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
      alert('Impossible de supprimer le Super Administrateur principal !');
      return;
    }
    if (!window.confirm('Voulez-vous vraiment supprimer cet utilisateur de la plateforme ?')) return;
    const token = localStorage.getItem('token');
    try {
      await fetch(`${BACKEND}/api/admin/users/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(users.filter(u => u.id !== id));
    } catch (err: any) {
      alert(`Erreur suppression utilisateur : ${err.message}`);
    }
  };

  const handleValidateBoutique = async (id: string) => {
    const token = localStorage.getItem('token');
    setProcessingId(id);
    try {
      const res = await fetch(`${BACKEND}/api/admin/boutiques/${id}/validate`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Échec de la validation');
      setBoutiques(prev => prev.map(b => (b.id === id ? { ...b, status: 'approved' } : b)));
    } catch (err: any) {
      alert(`Erreur : ${err.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectBoutique = async (id: string) => {
    const reason = window.prompt('Motif du refus (visible par le candidat) :');
    if (reason === null) return;
    const token = localStorage.getItem('token');
    setProcessingId(id);
    try {
      const res = await fetch(`${BACKEND}/api/admin/boutiques/${id}/reject`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason })
      });
      if (!res.ok) throw new Error('Échec du refus');
      setBoutiques(prev => prev.map(b => (b.id === id ? { ...b, status: 'rejected', rejectionReason: reason } : b)));
    } catch (err: any) {
      alert(`Erreur : ${err.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const cardBase = darkMode ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-neutral-200';

  return (
    <div className={`min-h-screen transition-colors duration-300 ${darkMode ? 'bg-neutral-950 text-white' : 'bg-neutral-50 text-neutral-900'}`}>

      {/* ÉCRAN DE BIENVENUE */}
      <AnimatePresence>
        {showWelcome && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-gradient-to-br from-orange-700 via-orange-800 to-neutral-950 text-white px-4"
          >
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.15, duration: 0.4 }} className="text-center">
              <div className="w-16 h-16 bg-white/10 border border-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-md">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <h1 className="text-xl sm:text-2xl font-black mb-1">{greeting} {adminFirstName} 👋</h1>
              <p className="text-xs sm:text-sm text-orange-100">Ouverture du panneau d'administration CBF SOKO...</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HEADER ADMIN */}
      <header className={`sticky top-0 z-40 border-b px-3 sm:px-8 py-3 transition-colors ${darkMode ? 'bg-neutral-900/90 border-neutral-800 backdrop-blur-md' : 'bg-white/90 border-neutral-200 backdrop-blur-md'}`}>
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-2 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-orange-600 rounded-xl flex items-center justify-center text-white font-black text-sm sm:text-base shadow-lg shadow-orange-600/30 flex-shrink-0">
              CBF
            </div>
            <div className="min-w-0">
              <span className="font-extrabold text-sm sm:text-base tracking-tight block leading-none truncate">CBFSOKO</span>
              <span className="text-[9px] sm:text-[10px] text-orange-500 font-bold tracking-widest uppercase">Admin Panel Bukavu</span>
            </div>
          </Link>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button onClick={toggleTheme} className={`p-2 sm:p-2.5 rounded-xl border transition flex items-center justify-center ${darkMode ? 'bg-neutral-950 border-neutral-800 text-yellow-400' : 'bg-white border-neutral-300 text-neutral-800'}`}>
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4 text-orange-600" />}
            </button>
            <button onClick={handleLogout} className="flex items-center gap-1.5 bg-red-600/10 text-red-400 hover:bg-red-600 hover:text-white px-2.5 sm:px-3.5 py-2 sm:py-2.5 rounded-xl text-xs font-bold transition border border-red-500/20">
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Déconnexion</span>
            </button>
          </div>
        </div>
      </header>

      {/* CONTENU PRINCIPAL */}
      <div className="max-w-7xl mx-auto px-3 sm:px-8 py-6 sm:py-8">

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ShieldAlert className="w-5 h-5 text-orange-500" />
              <h1 className="text-lg sm:text-2xl font-black tracking-tight">Panneau d'Administration</h1>
            </div>
            <p className="text-[11px] sm:text-xs text-neutral-400">{greeting} {adminFirstName}, voici l'activité de la plateforme aujourd'hui.</p>
          </div>
          <Link to="/" className="text-xs font-semibold text-neutral-400 hover:text-white flex items-center gap-1.5 transition">
            <ArrowLeft className="w-4 h-4" /> Retour au site public
          </Link>
        </div>

        {/* ONGLETS — scrollables sur mobile */}
        <div className="flex gap-2 sm:gap-3 mb-6 overflow-x-auto scrollbar-hide pb-1 border-b border-neutral-800/60">
          {[
            { key: 'boutiques', label: 'Formulaires Boutique', icon: Store, count: boutiques.length, badge: pendingCount },
            { key: 'users', label: 'Utilisateurs', icon: Users, count: users.length },
            { key: 'products', label: 'Produits', icon: Package, count: products.length },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`relative flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl text-[11px] sm:text-xs font-bold transition flex-shrink-0 mb-3 ${
                activeTab === tab.key
                  ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/20'
                  : darkMode ? 'bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800' : 'bg-white text-neutral-600 hover:text-black border border-neutral-300'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label} ({tab.count})</span>
              {!!tab.badge && (
                <span className="absolute -top-1.5 -right-1.5 bg-red-600 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center animate-pulse">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {error && (
          <div className="mb-6 p-4 bg-orange-500/10 border border-orange-500/20 text-orange-400 rounded-xl text-xs">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-20 text-neutral-500 text-xs flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
            Chargement des données de la plateforme...
          </div>
        ) : (
          <>
            {/* ============ FORMULAIRES BOUTIQUE ============ */}
            {activeTab === 'boutiques' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {boutiques.length === 0 ? (
                  <div className={`col-span-full text-center py-10 rounded-2xl border text-neutral-500 text-xs ${cardBase}`}>Aucune candidature boutique pour le moment.</div>
                ) : (
                  boutiques.map(b => (
                    <div key={b.id} className={`rounded-2xl border p-4 ${cardBase}`}>
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div>
                          <h3 className="font-extrabold text-sm">{b.name}</h3>
                          <p className="text-[11px] text-neutral-500">{b.applicantName || b.applicantEmail}</p>
                        </div>
                        <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold flex items-center gap-1 flex-shrink-0 ${
                          b.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                          b.status === 'rejected' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                          'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                        }`}>
                          {b.status === 'approved' ? <CheckCircle className="w-3 h-3" /> : b.status === 'rejected' ? <XCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                          {b.status === 'approved' ? 'Validée' : b.status === 'rejected' ? 'Refusée' : 'En attente'}
                        </span>
                      </div>

                      {b.photos && b.photos.length > 0 && (
                        <div className="grid grid-cols-3 gap-1.5 mb-3">
                          {b.photos.slice(0, 3).map((p, i) => (
                            <img key={i} src={getPhotoUrl(p)} alt={`Photo ${i + 1}`} className="aspect-square w-full object-cover rounded-lg" />
                          ))}
                        </div>
                      )}

                      <div className="space-y-1 text-[11px] text-neutral-400 mb-3">
                        {b.category && <p>Catégorie : <span className="text-neutral-300 font-semibold">{b.category}</span></p>}
                        {(b.city || b.address) && (
                          <p className="flex items-center gap-1"><MapPin className="w-3 h-3 text-orange-600 flex-shrink-0" /> {[b.address, b.neighborhood, b.city].filter(Boolean).join(', ')}</p>
                        )}
                        {b.phone && <p className="flex items-center gap-1"><Phone className="w-3 h-3 text-orange-600 flex-shrink-0" /> {b.phone}</p>}
                        {b.description && <p className="text-neutral-500 line-clamp-2">{b.description}</p>}
                        {b.status === 'rejected' && b.rejectionReason && <p className="text-red-400">Motif : {b.rejectionReason}</p>}
                      </div>

                      {b.status === 'pending' && (
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            onClick={() => handleValidateBoutique(b.id)}
                            disabled={processingId === b.id}
                            className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-[11px] font-bold py-2 rounded-full transition"
                          >
                            <CheckCircle className="w-3.5 h-3.5" /> Valider
                          </button>
                          <button
                            onClick={() => handleRejectBoutique(b.id)}
                            disabled={processingId === b.id}
                            className="flex-1 flex items-center justify-center gap-1.5 bg-red-600/10 hover:bg-red-600 hover:text-white disabled:opacity-50 text-red-400 text-[11px] font-bold py-2 rounded-full transition border border-red-500/20"
                          >
                            <XCircle className="w-3.5 h-3.5" /> Refuser
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </motion.div>
            )}

            {/* ============ UTILISATEURS ============ */}
            {activeTab === 'users' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {users.length === 0 ? (
                  <div className={`col-span-full text-center py-10 rounded-2xl border text-neutral-500 text-xs ${cardBase}`}>Aucun utilisateur trouvé.</div>
                ) : (
                  users.map(u => (
                    <div key={u.id} className={`rounded-2xl border p-4 flex items-center justify-between gap-3 ${cardBase}`}>
                      <div className="min-w-0">
                        <p className="font-bold text-xs flex items-center gap-1.5 truncate">
                          {u.name}
                          {(u.role === 'ADMIN' || u.role === 'SUPER_ADMIN') && <ShieldCheck className="w-3.5 h-3.5 text-orange-500 flex-shrink-0" />}
                        </p>
                        <p className="text-[10px] text-neutral-500 truncate">{u.email}</p>
                        <span className={`inline-block mt-1.5 px-2 py-0.5 rounded-md text-[9px] font-bold ${
                          u.role === 'SUPER_ADMIN' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' :
                          u.role === 'ADMIN' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' :
                          'bg-neutral-800 text-neutral-300'
                        }`}>{u.role}</span>
                      </div>
                      {u.email.toLowerCase() !== 'aganzechristophe2007@gmail.com' && (
                        <button onClick={() => handleDeleteUser(u.id, u.email)} className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition flex-shrink-0" title="Supprimer">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </motion.div>
            )}

            {/* ============ PRODUITS ============ */}
            {activeTab === 'products' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {products.length === 0 ? (
                  <div className={`col-span-full text-center py-10 rounded-2xl border text-neutral-500 text-xs ${cardBase}`}>Aucun produit trouvé en base de données.</div>
                ) : (
                  products.map(product => (
                    <div key={product.id} className={`rounded-2xl border p-4 flex items-center justify-between gap-3 ${cardBase}`}>
                      <div className="min-w-0">
                        <p className="font-bold text-xs truncate">{product.title}</p>
                        <p className="text-[10px] text-neutral-500 truncate">{typeof product.category === 'string' ? product.category : 'Général'}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="font-black text-orange-500 text-xs">{product.priceUSD || 0} $</span>
                          <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold ${product.type === 'SALE' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'}`}>
                            {product.type || 'SALE'}
                          </span>
                        </div>
                      </div>
                      <button onClick={() => handleDeleteProduct(product.id)} className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition flex-shrink-0" title="Supprimer">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </motion.div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
