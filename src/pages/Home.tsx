import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  Search, PlusCircle, Sun, Moon, Zap, Wallet, 
  MessageSquare, Bell, LogOut, Package, ShieldCheck, Truck, 
  Headphones, MapPin, CheckCircle2, Layers, Home as HomeIcon, Image as ImageIcon 
} from 'lucide-react';
import { apiFetch } from '../api/client';

interface User {
  id?: string;
  _id?: string;
  name: string;
  balance: number;
  role?: string;
  avatar?: string;
  profileImage?: string;
}

interface ProductItem {
  id?: string;
  _id?: string;
  title: string;
  priceUSD: number;
  priceCDF: number;
  category?: { name: string } | string;
  images: string[];
  sellerId?: string;
  userId?: string;
  seller?: { id: string; _id?: string; name: string; email?: string };
  location?: string;
  state?: string;
  quantity?: number | string;
  type?: string;
  isDemande?: boolean;
}

export default function Home() {
  const [darkMode, setDarkMode] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const location = useLocation();
  
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('user');
    try {
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [userAvatarUrl, setUserAvatarUrl] = useState<string>(() => {
    const offlineAvatar = localStorage.getItem('offline_avatar');
    if (offlineAvatar) return offlineAvatar;
    const saved = localStorage.getItem('user');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.avatar) {
          const cleanPath = parsed.avatar.replace(/\\/g, '/').replace(/^\/+/, '');
          return cleanPath.startsWith('http') ? cleanPath : `https://cbfsoko-backend.onrender.com/${cleanPath.startsWith('uploads/') ? cleanPath : 'uploads/' + cleanPath}`;
        }
      } catch {
        // Ignore
      }
    }
    return '';
  });

  const [featuredProducts, setFeaturedProducts] = useState<ProductItem[]>([]);
  const [loadingProducts, setLoadingProducts] = useState<boolean>(true);
  const [ordersCount, setOrdersCount] = useState<number>(0);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState<number>(0);
  const [unreadNotifsCount, setUnreadNotifsCount] = useState<number>(0);
  const navigate = useNavigate();

  // Fonction utilitaire robuste pour formater les URLs d'images
  const getImageUrl = useCallback((path?: string) => {
    if (!path) return 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=500&q=80';
    if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('blob:') || path.startsWith('data:')) {
      return path;
    }
    const cleanPath = path.replace(/\\/g, '/').replace(/^\/+/, '');
    if (cleanPath.startsWith('uploads/')) {
      return `https://cbfsoko-backend.onrender.com/${cleanPath}`;
    }
    return `https://cbfsoko-backend.onrender.com/uploads/${cleanPath}`;
  }, []);

  // Synchronisation de l'avatar utilisateur
  const updateAvatarFromStorage = useCallback(() => {
    const updatedUserStr = localStorage.getItem('user');
    const offlineAv = localStorage.getItem('offline_avatar');
    if (offlineAv) {
      setUserAvatarUrl(offlineAv);
      return;
    }
    if (updatedUserStr) {
      try {
        const parsed = JSON.parse(updatedUserStr);
        if (parsed.avatar) {
          const fullUrl = getImageUrl(parsed.avatar);
          setUserAvatarUrl(fullUrl);
        } else {
          setUserAvatarUrl('');
        }
      } catch (e) {
        console.error("Erreur mise à jour avatar", e);
      }
    }
  }, [getImageUrl]);

  useEffect(() => {
    const currentToken = localStorage.getItem('token');
    updateAvatarFromStorage();

    if (currentToken) {
      apiFetch('/auth/me')
        .then(response => {
          const actualUser = response.data || response;
          if (actualUser) {
            setUser(actualUser);
            localStorage.setItem('user', JSON.stringify(actualUser));
            
            if (actualUser.avatar) {
              const fullUrl = getImageUrl(actualUser.avatar);
              setUserAvatarUrl(fullUrl);
              localStorage.setItem('offline_avatar', fullUrl);
            } else {
              setUserAvatarUrl('');
              localStorage.removeItem('offline_avatar');
            }
          }
        })
        .catch((err) => {
          console.error("Erreur de synchronisation utilisateur :", err);
          if (err?.status === 401 || err?.message?.includes('401')) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            localStorage.removeItem('offline_avatar');
            setToken(null);
            setUser(null);
            setUserAvatarUrl('');
          }
        });
    }

    window.addEventListener('avatar-updated', updateAvatarFromStorage);
    window.addEventListener('storage', updateAvatarFromStorage);

    apiFetch('/products')
      .then(data => {
        const list = Array.isArray(data) ? data : (data.data || []);
        setFeaturedProducts(list.slice(0, 12));
      })
      .catch(err => {
        console.error("Erreur chargement produits", err);
      })
      .finally(() => {
        setLoadingProducts(false);
      });

    return () => {
      window.removeEventListener('avatar-updated', updateAvatarFromStorage);
      window.removeEventListener('storage', updateAvatarFromStorage);
    };
  }, [getImageUrl, updateAvatarFromStorage]);

  // Récupération des compteurs non lus (messages & notifications)
  useEffect(() => {
    const currentToken = localStorage.getItem('token');
    if (!currentToken) {
      setUnreadMessagesCount(0);
      setUnreadNotifsCount(0);
      return;
    }

    let currentUserId = '';
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const parsedUser = JSON.parse(userStr);
        currentUserId = parsedUser.id || parsedUser._id || '';
      }
    } catch {
      // Ignore
    }

    const fetchUnreadCounts = async () => {
      try {
        try {
          const resMsg = await apiFetch('/messages');
          const msgList = Array.isArray(resMsg) ? resMsg : (resMsg.data || resMsg.messages || []);
          const unreadMsgs = msgList.filter((m: any) => {
            const receiverId = m.receiverId || m.receiver?._id || m.receiver?.id;
            return receiverId === currentUserId && m.isRead === false;
          });
          setUnreadMessagesCount(unreadMsgs.length);
        } catch {
          const resMsgCount = await apiFetch('/messages/unread-count').catch(() => ({ count: 0 }));
          setUnreadMessagesCount(resMsgCount.count || resMsgCount.data || 0);
        }

        try {
          const resNotif = await apiFetch('/notifications');
          const notifList = Array.isArray(resNotif) ? resNotif : (resNotif.data || resNotif.notifications || []);
          const unreadNotifs = notifList.filter((n: any) => n.isRead === false);
          setUnreadNotifsCount(unreadNotifs.length);
        } catch {
          const resNotifCount = await apiFetch('/notifications/unread-count').catch(() => ({ count: 0 }));
          setUnreadNotifsCount(resNotifCount.count || resNotifCount.data || 0);
        }
      } catch (err) {
        console.error("Erreur lors de la récupération des compteurs non lus", err);
      }
    };

    fetchUnreadCounts();
    const interval = setInterval(fetchUnreadCounts, 15000);

    return () => clearInterval(interval);
  }, [token]);

  // Comptage des commandes et demandes
  useEffect(() => {
    const currentToken = localStorage.getItem('token');
    if (!currentToken) {
      setOrdersCount(0);
      return;
    }

    const fetchUserOrdersCount = async () => {
      try {
        let currentUserId = '';
        try {
          const userStr = localStorage.getItem('user');
          if (userStr) {
            const parsedUser = JSON.parse(userStr);
            currentUserId = parsedUser.id || parsedUser._id || '';
          }
        } catch {
          // Ignore
        }

        let ordersLength = 0;
        let demandesLength = 0;

        try {
          const resOrders = await apiFetch('/orders');
          const ordersList = Array.isArray(resOrders) ? resOrders : (resOrders.data || resOrders.orders || []);
          ordersLength = ordersList.length;
        } catch {
          // Ignore
        }

        try {
          const resProducts = await apiFetch('/products');
          const productsList = Array.isArray(resProducts) ? resProducts : (resProducts.data || []);
          
          const userDemandes = productsList.filter((p: ProductItem) => {
            const pSellerId = p.sellerId || p.userId || p.seller?.id || p.seller?._id;
            const matchesUser = currentUserId ? (pSellerId === currentUserId) : true;
            
            const typeStr = String(p.type || '').toUpperCase();
            const titleStr = String(p.title || '');
            const isDemandeType = typeStr === 'REQUEST' || titleStr.includes('[DEMANDE]') || p.isDemande === true;

            return matchesUser && isDemandeType;
          });

          demandesLength = userDemandes.length;
        } catch {
          // Ignore
        }

        setOrdersCount(ordersLength + demandesLength);
      } catch (err) {
        console.error("Erreur lors du comptage des commandes/demandes", err);
      }
    };

    fetchUserOrdersCount();
  }, [token, user]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('offline_avatar');
    setToken(null);
    setUser(null);
    setUserAvatarUrl('');
    navigate('/login');
  };

  const getInitials = (name: string) => {
    if (!name) return "U";
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  const handleProtectedAction = (destination: string) => {
    if (!token) {
      navigate(`/login?redirect=${destination}`);
    } else {
      navigate(destination);
    }
  };

  const handleOpenMessages = async () => {
    setUnreadMessagesCount(0);
    try {
      await apiFetch('/messages/mark-read', { method: 'POST' }).catch(() => {});
    } catch {
      // Ignore
    }
    handleProtectedAction('/messages');
  };

  const handleOpenNotifications = () => {
    setUnreadNotifsCount(0);
    handleProtectedAction('/notifications');
  };
      
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchQuery)}`);
    } else {
      navigate('/products');
    }
  };

  const memoizedAvatar = useMemo(() => {
    if (userAvatarUrl) {
      return (
        <img 
          src={userAvatarUrl} 
          alt={user?.name || 'User'} 
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.currentTarget as HTMLElement).style.display = 'none';
          }}
        />
      );
    }
    if (user?.avatar) {
      return (
        <img 
          src={getImageUrl(user.avatar)} 
          alt={user?.name || 'User'} 
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.currentTarget as HTMLElement).style.display = 'none';
          }}
        />
      );
    }
    return getInitials(user?.name || 'U');
  }, [userAvatarUrl, user?.avatar, user?.name, getImageUrl]);

  return (
    <div className={`min-h-screen pb-20 sm:pb-8 transition-colors duration-300 relative ${darkMode ? 'bg-neutral-950 text-white' : 'bg-neutral-50 text-neutral-900'}`}>
      
      {/* HEADER DESKTOP & MOBILE SEARCH */}
      <header className={`sticky top-0 z-50 border-b px-2 sm:px-4 lg:px-8 py-2.5 sm:py-3 transition-colors ${
        darkMode ? 'bg-neutral-900/90 border-neutral-800 backdrop-blur-md' : 'bg-white/90 border-neutral-200 backdrop-blur-md'
      }`}>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center justify-between w-full md:w-auto gap-2 sm:gap-6">
            
            <Link to="/" className="flex items-center gap-1.5 sm:gap-2.5 flex-shrink-0">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-orange-600 rounded-lg sm:rounded-xl flex items-center justify-center text-white font-black text-xs sm:text-base shadow-lg shadow-orange-600/30">
                CBF
              </div>
              <div>
                <span className="font-extrabold text-xs sm:text-base tracking-tight block leading-none">CBFSOKO</span>
                <span className="text-[9px] sm:text-[10px] text-orange-500 font-bold tracking-widest uppercase flex items-center gap-0.5 sm:gap-1">
                  <MapPin className="w-2 h-2 sm:w-2.5 sm:h-2.5" /> Bukavu
                </span>
              </div>
            </Link>

            {/* Navigation Desktop uniquement */}
            <nav className="hidden sm:flex items-center gap-4 text-xs font-semibold">
              <Link to="/products" className="hover:text-orange-500 transition flex items-center gap-1">
                <span>Catalogue</span>
              </Link>
              <button 
                onClick={() => handleProtectedAction('/orders')}
                className="hover:text-orange-500 transition flex items-center gap-1 relative cursor-pointer bg-transparent border-none text-inherit font-semibold"
              >
                <Package className="w-3.5 h-3.5" /> 
                <span>Commandes</span>
                {ordersCount > 0 && (
                  <span className="bg-orange-600 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full leading-tight">
                    {ordersCount}
                  </span>
                )}
              </button>
              <button 
                onClick={handleOpenMessages}
                className="hover:text-orange-500 transition flex items-center gap-1 relative cursor-pointer bg-transparent border-none text-inherit font-semibold"
              >
                <MessageSquare className="w-3.5 h-3.5" /> 
                <span>Messages</span>
                {unreadMessagesCount > 0 && (
                  <span className="absolute -top-1 -right-2 bg-red-600 text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full shadow-md animate-pulse">
                    {unreadMessagesCount}
                  </span>
                )}
              </button>
              <button 
                onClick={handleOpenNotifications}
                className="hover:text-orange-500 transition flex items-center gap-1 relative cursor-pointer bg-transparent border-none text-inherit font-semibold"
              >
                <Bell className="w-3.5 h-3.5" /> 
                <span>Notifications</span>
                {unreadNotifsCount > 0 && (
                  <span className="absolute -top-1 -right-2 bg-red-600 text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full shadow-md animate-pulse">
                    {unreadNotifsCount}
                  </span>
                )}
              </button>
            </nav>
          </div>

          <form onSubmit={handleSearch} className="flex-1 max-w-lg w-full">
            <div className={`flex w-full items-center rounded-xl border overflow-hidden transition ${
              darkMode ? 'bg-neutral-950 border-neutral-800 focus-within:border-orange-500' : 'bg-neutral-100 border-neutral-300 focus-within:border-orange-500'
            }`}>
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher un produit à Bukavu..." 
                className="w-full bg-transparent px-3 sm:px-4 py-2 text-xs sm:text-sm outline-none placeholder-neutral-500"
              />
              <button type="submit" className="bg-orange-600 hover:bg-orange-700 px-3 sm:px-4 py-2 text-white transition flex items-center justify-center cursor-pointer">
                <Search className="w-4 h-4" />
              </button>
            </div>
          </form>

          <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
            <button 
              onClick={() => handleProtectedAction('/create-product')}
              className="hidden sm:flex items-center gap-1 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition shadow-md shadow-orange-600/20 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Vendre</span>
            </button>

            {token ? (
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => handleProtectedAction('/wallet')}
                  className={`flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-xl border transition group cursor-pointer ${
                    darkMode ? 'bg-neutral-950 border-neutral-800 hover:border-orange-500 text-white' : 'bg-white border-neutral-300 hover:border-orange-500 text-neutral-900'
                  }`}
                >
                  <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-orange-600 text-white font-bold text-xs flex items-center justify-center shadow overflow-hidden relative">
                    {memoizedAvatar}
                  </div>
                  <div className="hidden sm:flex flex-col text-left">
                    <span className="text-[10px] text-neutral-400 leading-none flex items-center gap-1">Solde <Wallet className="w-3 h-3 text-orange-500" /></span>
                    <span className="text-xs font-black text-orange-500">{user?.balance ?? 0} $</span>
                  </div>
                </button>
                <button onClick={handleLogout} className="p-2 rounded-xl bg-red-600/20 border border-red-800 text-red-400 hover:bg-red-600 hover:text-white transition cursor-pointer" title="Se déconnecter">
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Link to="/login" className="px-2.5 sm:px-3 py-2 rounded-xl text-xs font-bold bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-white transition">Connexion</Link>
                <Link to="/register" className="px-2.5 sm:px-3 py-2 rounded-xl text-xs font-bold bg-orange-600 hover:bg-orange-500 text-white transition">Inscription</Link>
              </div>
            )}

            <button onClick={() => setDarkMode(!darkMode)} className={`p-2 rounded-xl border transition flex items-center justify-center cursor-pointer ${darkMode ? 'bg-neutral-950 border-neutral-800 text-yellow-400' : 'bg-white border-neutral-300 text-neutral-800'}`}>
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4 text-orange-600" />}
            </button>
          </div>
        </div>
      </header>

      {/* BARRE D'ONGLETS MOBILE */}
      <div className={`sm:hidden fixed bottom-0 left-0 right-0 z-50 border-t flex items-center justify-around py-2 px-1 backdrop-blur-md transition-colors ${
        darkMode ? 'bg-neutral-900/95 border-neutral-800 text-neutral-400' : 'bg-white/95 border-neutral-200 text-neutral-600'
      }`}>
        <Link 
          to="/" 
          className={`flex flex-col items-center justify-center flex-1 py-1 transition ${location.pathname === '/' ? 'text-orange-500 font-bold' : 'hover:text-orange-500'}`}
        >
          <HomeIcon className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">Accueil</span>
        </Link>

        <button 
          onClick={() => handleProtectedAction('/orders')}
          className={`flex flex-col items-center justify-center flex-1 py-1 relative bg-transparent border-none cursor-pointer text-inherit transition ${location.pathname.includes('/orders') ? 'text-orange-500 font-bold' : 'hover:text-orange-500'}`}
        >
          <Package className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">Commandes</span>
          {ordersCount > 0 && (
            <span className="absolute top-0 right-4 bg-orange-600 text-white text-[9px] font-bold px-1 rounded-full">
              {ordersCount}
            </span>
          )}
        </button>

        <div className="flex flex-col items-center justify-center flex-1 -mt-4">
          <button 
            onClick={() => handleProtectedAction('/create-product')}
            className="w-12 h-12 bg-orange-600 hover:bg-orange-700 text-white rounded-full flex items-center justify-center shadow-lg shadow-orange-600/40 border-4 border-neutral-950 cursor-pointer transition transform active:scale-95"
            title="Publier un article"
          >
            <PlusCircle className="w-6 h-6" />
          </button>
          <span className="text-[10px] font-bold text-orange-500 mt-0.5">Vendre</span>
        </div>

        <button 
          onClick={handleOpenMessages}
          className={`flex flex-col items-center justify-center flex-1 py-1 relative bg-transparent border-none cursor-pointer text-inherit transition ${location.pathname.includes('/messages') ? 'text-orange-500 font-bold' : 'hover:text-orange-500'}`}
        >
          <MessageSquare className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">Messages</span>
          {unreadMessagesCount > 0 && (
            <span className="absolute top-0 right-3 bg-red-600 text-white text-[9px] font-bold w-4 h-4 flex items-center justify-center rounded-full animate-pulse">
              {unreadMessagesCount}
            </span>
          )}
        </button>

        <button 
          onClick={handleOpenNotifications}
          className={`flex flex-col items-center justify-center flex-1 py-1 relative bg-transparent border-none cursor-pointer text-inherit transition ${location.pathname.includes('/notifications') ? 'text-orange-500 font-bold' : 'hover:text-orange-500'}`}
        >
          <Bell className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">Notifs</span>
          {unreadNotifsCount > 0 && (
            <span className="absolute top-0 right-3 bg-red-600 text-white text-[9px] font-bold w-4 h-4 flex items-center justify-center rounded-full animate-pulse">
              {unreadNotifsCount}
            </span>
          )}
        </button>
      </div>

      {/* BOX PROFESSIONNELLES */}
      <section className="max-w-7xl mx-auto px-4 pt-6 pb-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className={`p-4 sm:p-5 rounded-2xl border transition flex items-start gap-4 ${
            darkMode ? 'bg-neutral-900/60 border-neutral-800' : 'bg-white border-neutral-200 shadow-sm'
          }`}>
            <div className="w-10 h-10 rounded-xl bg-orange-600/10 text-orange-500 flex items-center justify-center flex-shrink-0 border border-orange-500/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm mb-1">Paiement Sécurisé</h4>
              <p className="text-xs text-neutral-400 leading-relaxed">Transactions protégées par portefeuille intégré et validation par code.</p>
            </div>
          </div>

          <div className={`p-4 sm:p-5 rounded-2xl border transition flex items-start gap-4 ${
            darkMode ? 'bg-neutral-900/60 border-neutral-800' : 'bg-white border-neutral-200 shadow-sm'
          }`}>
            <div className="w-10 h-10 rounded-xl bg-orange-600/10 text-orange-500 flex items-center justify-center flex-shrink-0 border border-orange-500/20">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm mb-1">Livraison Rapide</h4>
              <p className="text-xs text-neutral-400 leading-relaxed">Service de logistique de confiance disponible à travers tous les quartiers de Bukavu.</p>
            </div>
          </div>

          <div className={`p-4 sm:p-5 rounded-2xl border transition flex items-start gap-4 ${
            darkMode ? 'bg-neutral-900/60 border-neutral-800' : 'bg-white border-neutral-200 shadow-sm'
          }`}>
            <div className="w-10 h-10 rounded-xl bg-orange-600/10 text-orange-500 flex items-center justify-center flex-shrink-0 border border-orange-500/20">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm mb-1">Vendeurs Vérifiés</h4>
              <p className="text-xs text-neutral-400 leading-relaxed">Profils contrôlés et évalués par la communauté pour zéro mauvaise surprise.</p>
            </div>
          </div>

          <div className={`p-4 sm:p-5 rounded-2xl border transition flex items-start gap-4 ${
            darkMode ? 'bg-neutral-900/60 border-neutral-800' : 'bg-white border-neutral-200 shadow-sm'
          }`}>
            <div className="w-10 h-10 rounded-xl bg-orange-600/10 text-orange-500 flex items-center justify-center flex-shrink-0 border border-orange-500/20">
              <Headphones className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm mb-1">Support 7j/7</h4>
              <p className="text-xs text-neutral-400 leading-relaxed">Une équipe locale dédiée pour vous assister à tout moment en cas de besoin.</p>
            </div>
          </div>
        </div>
      </section>

      {/* HOT PRODUCTS */}
      <section className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6 border-b border-neutral-800 pb-4">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-orange-500" />
            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">BYA BIKO DISPO</h2>
          </div>
          <Link to="/products" className="text-orange-500 hover:text-orange-400 font-semibold text-xs uppercase tracking-wider transition flex items-center gap-1">
            Catalogue complet &rarr;
          </Link>
        </div>

        {loadingProducts ? (
          <div className="text-center py-16 text-neutral-500 text-xs flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
            Chargement des meilleures offres...
          </div>
        ) : featuredProducts.length === 0 ? (
          <div className="text-center py-16 text-neutral-500 text-xs bg-neutral-900/30 rounded-2xl border border-neutral-800">
            Aucun produit disponible pour le moment. Soyez le premier à en poster un !
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 2xl:grid-cols-6 gap-3 sm:gap-6">
            {featuredProducts.map((product, index) => {
              const productId = product.id || product._id;
              const prodTitle = product.title || 'Article sans nom';
              const priceUSDValue = product.priceUSD || 0;
              const priceCDFValue = product.priceCDF || 0;
              
              const priceUSDStr = priceUSDValue > 0 ? `${priceUSDValue} $` : 'Prix sur demande';
              const priceCDFStr = priceCDFValue > 0 ? `${priceCDFValue.toLocaleString()} CDF` : '';

              const prodCategory = typeof product.category === 'object' && product.category !== null ? product.category.name : 'Général';
              
              // Gestion des images et du nombre total de photos (2 à 5 photos)
              const imagesList = Array.isArray(product.images) ? product.images : [];
              const rawImage = imagesList.length > 0 ? imagesList[0] : null;
              const prodImage = getImageUrl(rawImage);
              const photosCount = imagesList.length;

              const posterName = product.seller?.name || 'Vendeur';

              return (
                <motion.div 
                  key={productId || index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: index * 0.03 }}
                  onClick={() => navigate(`/products/${productId}`)}
                  className={`rounded-xl sm:rounded-2xl overflow-hidden border group shadow-md transition flex flex-col justify-between cursor-pointer hover:border-orange-500 ${
                    darkMode ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-neutral-200'
                  }`}
                >
                  <div>
                    {/* Conteneur image cliquable avec indicateur du nombre de photos */}
                    <div className="h-36 sm:h-48 overflow-hidden bg-neutral-950 relative">
                      <img 
                        src={prodImage} 
                        alt={prodTitle} 
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=500&q=80';
                        }}
                      />
                      <span className="absolute top-2 left-2 sm:top-3 sm:left-3 bg-black/85 backdrop-blur-md text-[9px] sm:text-[10px] font-bold px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md text-orange-400 border border-neutral-700 truncate max-w-[100px]">
                        {prodCategory}
                      </span>

                      {/* Badge indiquant le nombre de photos disponibles (ex: 5 photos) */}
                      {photosCount > 0 && (
                        <span className="absolute bottom-2 right-2 bg-black/75 backdrop-blur-md text-white text-[9px] sm:text-[10px] font-bold px-2 py-1 rounded-lg flex items-center gap-1 border border-neutral-700/60 shadow">
                          <ImageIcon className="w-3 h-3 text-orange-400" />
                          <span>{photosCount} {photosCount > 1 ? 'photos' : 'photo'}</span>
                        </span>
                      )}
                    </div>

                    <div className="p-3 sm:p-4">
                      <div className="flex justify-between items-center text-[10px] sm:text-[11px] text-neutral-400 mb-1">
                        <span className="truncate max-w-[80px] sm:max-w-[120px]" title={posterName}>Par : <strong className="text-neutral-300">{posterName}</strong></span>
                        <span className="flex items-center gap-0.5"><MapPin className="w-2.5 h-2.5 text-orange-500" /> Bukavu</span>
                      </div>

                      <h3 className="font-bold text-xs sm:text-sm mb-1 sm:mb-2 truncate group-hover:text-orange-500 transition">{prodTitle}</h3>

                      <div className="mt-2">
                        <div className="text-orange-500 font-black text-xs sm:text-sm">
                          {priceUSDStr}
                        </div>
                        {priceCDFStr && (
                          <div className="text-[10px] sm:text-[11px] text-neutral-400 font-medium">
                            ≈ {priceCDFStr}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="p-3 sm:p-4 pt-0">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/products/${productId}`);
                      }}
                      className="w-full py-2 bg-orange-600/10 hover:bg-orange-600 hover:text-white text-orange-500 font-bold text-xs rounded-xl transition border border-orange-500/20 flex items-center justify-center gap-1 cursor-pointer"
                    >
                      Voir le produit ({photosCount} 📷)
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}