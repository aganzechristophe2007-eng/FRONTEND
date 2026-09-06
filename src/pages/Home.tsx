import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Search, PlusCircle, Sun, Moon, Zap, Wallet, 
  MessageSquare, Bell, LogOut, Package, ShieldCheck, Truck, 
  Headphones, MapPin, CheckCircle2, Layers 
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
  id: string;
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
  
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('user');
    try {
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // État pour stocker l'URL propre de l'avatar
  const [userAvatarUrl, setUserAvatarUrl] = useState<string>('');

  const [featuredProducts, setFeaturedProducts] = useState<ProductItem[]>([]);
  const [loadingProducts, setLoadingProducts] = useState<boolean>(true);
  const [ordersCount, setOrdersCount] = useState<number>(0);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState<number>(0);
  const [unreadNotifsCount, setUnreadNotifsCount] = useState<number>(0);
  const navigate = useNavigate();

  // Fonction utilitaire pour formater correctement l'URL de l'avatar (identique aux produits)
  const getAvatarUrl = (path?: string) => {
    if (!path) return '';
    if (path.startsWith('http') || path.startsWith('blob:') || path.startsWith('data:')) {
      return path;
    }
    const cleanPath = path.replace(/\\/g, '/');
    if (!cleanPath.includes('uploads')) {
      const formattedPath = cleanPath.startsWith('/') ? cleanPath : `/${cleanPath}`;
      return `https://cbfsoko-backend.onrender.com/uploads${formattedPath}`;
    }
    const formattedPath = cleanPath.startsWith('/') ? cleanPath : `/${cleanPath}`;
    return `https://cbfsoko-backend.onrender.com/${formattedPath}`;
  };

  // Synchronisation de l'utilisateur et de son avatar
  useEffect(() => {
    const currentToken = localStorage.getItem('token');

    // 1. Charger depuis le cache local pour un affichage instantané
    const cachedUser = localStorage.getItem('user');
    if (cachedUser) {
      try {
        const parsedUser = JSON.parse(cachedUser);
        if (parsedUser.avatar) {
          setUserAvatarUrl(getAvatarUrl(parsedUser.avatar));
        }
      } catch (e) {
        console.error("Erreur lecture cache utilisateur", e);
      }
    }

    // 2. Requête prioritaire à la base de données via /auth/me
    if (currentToken) {
      apiFetch('/auth/me')
        .then(response => {
          const actualUser = response.data || response;
          if (actualUser) {
            setUser(actualUser);
            localStorage.setItem('user', JSON.stringify(actualUser));
            
            if (actualUser.avatar) {
              const fullUrl = getAvatarUrl(actualUser.avatar);
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

    // Écoute de l'événement de mise à jour provenant de UserWallet ou autre composant
    const handleAvatarUpdate = () => {
      const updatedUserStr = localStorage.getItem('user');
      if (updatedUserStr) {
        try {
          const parsed = JSON.parse(updatedUserStr);
          if (parsed.avatar) {
            setUserAvatarUrl(getAvatarUrl(parsed.avatar));
          }
        } catch (e) {
          console.error("Erreur mise à jour avatar", e);
        }
      }
    };
    window.addEventListener('avatar-updated', handleAvatarUpdate);
    window.addEventListener('storage', handleAvatarUpdate);

    // Chargement des produits
    apiFetch('/products')
      .then(data => {
        const list = Array.isArray(data) ? data : (data.data || []);
        setFeaturedProducts(list.slice(0, 8));
      })
      .catch(err => {
        console.error("Erreur chargement produits", err);
      })
      .finally(() => {
        setLoadingProducts(false);
      });

    return () => {
      window.removeEventListener('avatar-updated', handleAvatarUpdate);
      window.removeEventListener('storage', handleAvatarUpdate);
    };
  }, []);

  // Gestion des compteurs non lus (Messages & Notifications)
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
    const interval = setInterval(fetchUnreadCounts, 10000);

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

  const handleContactSeller = async (product: ProductItem) => {
    if (!token) {
      navigate(`/login?redirect=/messages`);
      return;
    }
    try {
      const defaultMessage = `Bonjour, je voulais me renseigner sur ce produit : ${product.title}`;

      // 1. Récupère (et ouvre automatiquement si besoin) le contact avec l'administrateur
      const supportRes = await apiFetch('/messages/support-chat', { method: 'POST' });
      const admin = supportRes.data || supportRes;
      const adminId = admin?.id || admin?._id;

      if (!adminId) {
        throw new Error("Impossible de récupérer les coordonnées de l'administrateur.");
      }

      // 2. Envoie directement le message à l'administrateur
      await apiFetch('/messages', {
        method: 'POST',
        body: JSON.stringify({ receiverId: adminId, content: defaultMessage })
      });

      localStorage.setItem('activeConversationId', adminId);
      navigate('/messages', { state: { conversationId: adminId, defaultMessage } });
      return;
    } catch (err) {
      console.error("Erreur lors de l'envoi du message à l'admin:", err);
    }
    navigate('/messages');
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 relative ${darkMode ? 'bg-neutral-950 text-white' : 'bg-neutral-50 text-neutral-900'}`}>
      
      {/* HEADER */}
      <header className={`sticky top-0 z-50 border-b px-4 lg:px-8 py-3 transition-colors ${
        darkMode ? 'bg-neutral-900/90 border-neutral-800 backdrop-blur-md' : 'bg-white/90 border-neutral-200 backdrop-blur-md'
      }`}>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center justify-between w-full md:w-auto gap-6">
            <Link to="/" className="flex items-center gap-2.5 flex-shrink-0">
              <div className="w-10 h-10 bg-orange-600 rounded-xl flex items-center justify-center text-white font-black text-base shadow-lg shadow-orange-600/30">
                CBF
              </div>
              <div>
                <span className="font-extrabold text-base tracking-tight block leading-none">CBFSOKO</span>
                <span className="text-[10px] text-orange-500 font-bold tracking-widest uppercase flex items-center gap-1">
                  <MapPin className="w-2.5 h-2.5" /> Bukavu
                </span>
              </div>
            </Link>

            <nav className="flex items-center gap-2 sm:gap-4 text-xs font-semibold overflow-x-auto py-1 max-w-full">
              <Link to="/products" className="hover:text-orange-500 transition whitespace-nowrap">Catalogue</Link>
              <button 
                onClick={() => handleProtectedAction('/orders')}
                className="hover:text-orange-500 transition flex items-center gap-1 relative whitespace-nowrap cursor-pointer bg-transparent border-none text-inherit font-semibold"
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
                className="hover:text-orange-500 transition flex items-center gap-1 relative whitespace-nowrap cursor-pointer bg-transparent border-none text-inherit font-semibold"
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
                className="hover:text-orange-500 transition flex items-center gap-1 relative whitespace-nowrap cursor-pointer bg-transparent border-none text-inherit font-semibold"
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
                className="w-full bg-transparent px-4 py-2 text-xs sm:text-sm outline-none placeholder-neutral-500"
              />
              <button type="submit" className="bg-orange-600 hover:bg-orange-700 px-4 py-2 text-white transition flex items-center justify-center cursor-pointer">
                <Search className="w-4 h-4" />
              </button>
            </div>
          </form>

          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            <button 
              onClick={() => handleProtectedAction('/create-product')}
              className="flex items-center gap-1.5 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition shadow-md shadow-orange-600/20 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Vendre</span>
            </button>

            {token ? (
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => handleProtectedAction('/wallet')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition group cursor-pointer ${
                    darkMode ? 'bg-neutral-950 border-neutral-800 hover:border-orange-500 text-white' : 'bg-white border-neutral-300 hover:border-orange-500 text-neutral-900'
                  }`}
                >
                  {/* CERCLE DE L'AVATAR MIS À JOUR AVEC getAvatarUrl et userAvatarUrl */}
                  <div className="w-7 h-7 rounded-full bg-orange-600 text-white font-bold text-xs flex items-center justify-center shadow overflow-hidden relative">
                    {(userAvatarUrl || user?.avatar) ? (
                      <img 
                        src={userAvatarUrl || getAvatarUrl(user?.avatar)} 
                        alt={user?.name || 'User'} 
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.currentTarget as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      getInitials(user?.name || 'U')
                    )}
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
              <div className="flex items-center gap-2">
                <Link to="/login" className="px-3 py-2 rounded-xl text-xs font-bold bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-white transition">Connexion</Link>
                <Link to="/register" className="px-3 py-2 rounded-xl text-xs font-bold bg-orange-600 hover:bg-orange-500 text-white transition">Inscription</Link>
              </div>
            )}

            <button onClick={() => setDarkMode(!darkMode)} className={`p-2 rounded-xl border transition flex items-center justify-center cursor-pointer ${darkMode ? 'bg-neutral-950 border-neutral-800 text-yellow-400' : 'bg-white border-neutral-300 text-neutral-800'}`}>
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4 text-orange-600" />}
            </button>
          </div>
        </div>
      </header>

      {/* BOX PROFESSIONNELLES */}
      <section className="max-w-7xl mx-auto px-4 pt-6 pb-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className={`p-5 rounded-2xl border transition flex items-start gap-4 ${
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

          <div className={`p-5 rounded-2xl border transition flex items-start gap-4 ${
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

          <div className={`p-5 rounded-2xl border transition flex items-start gap-4 ${
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

          <div className={`p-5 rounded-2xl border transition flex items-start gap-4 ${
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
            <h2 className="text-2xl font-extrabold tracking-tight">BYA BIKO DISPO</h2>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            {featuredProducts.map((product, index) => {
              const prodTitle = product.title || 'Article sans nom';
              const priceUSDValue = product.priceUSD || 0;
              const priceCDFValue = product.priceCDF || 0;
              
              const priceUSDStr = priceUSDValue > 0 ? `${priceUSDValue} $` : 'Prix sur demande';
              const priceCDFStr = priceCDFValue > 0 ? `${priceCDFValue.toLocaleString()} CDF` : '';

              const prodCategory = typeof product.category === 'object' && product.category !== null ? product.category.name : 'Général';
              const quantityDisplay = product.quantity !== undefined && product.quantity !== null ? product.quantity : 1;
              
              let rawImage = (product.images && product.images.length > 0) ? product.images[0] : null;
              let prodImage = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=500&q=80';

              if (rawImage) {
                if (rawImage.startsWith('blob:')) {
                  prodImage = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=500&q=80';
                } else if (rawImage.startsWith('http://') || rawImage.startsWith('https://')) {
                  prodImage = rawImage;
                } else {
                  const baseUrl = 'https://cbfsoko-backend.onrender.com';
                  prodImage = `${baseUrl}${rawImage.startsWith('/') ? '' : '/'}${rawImage}`;
                }
              }

              const posterName = product.seller?.name || 'Vendeur';

              return (
                <motion.div 
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className={`rounded-2xl overflow-hidden border group shadow-md transition ${
                    darkMode ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-neutral-200'
                  }`}
                >
                  <div className="h-48 overflow-hidden bg-neutral-950 relative">
                    <img 
                      src={prodImage} 
                      alt={prodTitle} 
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />
                    <span className="absolute top-3 left-3 bg-black/85 backdrop-blur-md text-[10px] font-bold px-2.5 py-1 rounded-md text-orange-400 border border-neutral-700">
                      {prodCategory}
                    </span>
                  </div>

                  <div className="p-4">
                    <div className="flex justify-between items-center text-[11px] text-neutral-400 mb-1">
                      <span className="truncate max-w-[120px]" title={posterName}>Par : <strong className="text-neutral-300">{posterName}</strong></span>
                      <span className="flex items-center gap-0.5"><MapPin className="w-2.5 h-2.5 text-orange-500" /> Bukavu</span>
                    </div>

                    <h3 className="font-bold text-sm mb-2 truncate">{prodTitle}</h3>

                    <div className={`flex items-center gap-1.5 text-[11px] font-semibold mb-3 ${darkMode ? 'text-neutral-400' : 'text-neutral-600'}`}>
                      <Layers size={13} className="text-orange-500" />
                      <span>Quantité : <strong className={darkMode ? 'text-neutral-200' : 'text-neutral-800'}>{quantityDisplay}</strong></span>
                    </div>

                    <div className="flex items-center justify-between gap-2 mb-3 pt-2 border-t border-neutral-800/60">
                      <button 
                        onClick={() => handleContactSeller(product)}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-neutral-800 hover:bg-orange-600 text-neutral-200 hover:text-white py-1.5 px-3 rounded-xl text-xs font-semibold transition cursor-pointer border border-neutral-700"
                        title="Contacter le vendeur pour ce produit"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Send Msg</span>
                      </button>
                    </div>

                    <div className="flex justify-between items-center">
                      <div className="flex flex-col">
                        <span className="text-base font-black text-orange-500">{priceUSDStr}</span>
                        {priceCDFStr && <span className="text-[10px] text-neutral-400 font-semibold">{priceCDFStr}</span>}
                      </div>
                      <Link 
                        to={`/products/${product.id}`} 
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                          darkMode ? 'bg-neutral-800 hover:bg-orange-600 hover:text-white text-neutral-200' : 'bg-neutral-100 hover:bg-orange-600 hover:text-white text-neutral-800'
                        }`}
                      >
                        Détails
                      </Link>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </section>

      {/* FOOTER */}
      <footer className={`border-t py-8 px-4 mt-12 transition-colors ${darkMode ? 'bg-neutral-900 border-neutral-800 text-neutral-400' : 'bg-white border-neutral-200 text-neutral-600'}`}>
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-orange-600 rounded-lg flex items-center justify-center text-white font-black text-xs">
              CBF
            </div>
            <span className="font-bold text-sm">CBFSOKO Bukavu</span> &copy; {new Date().getFullYear()} — Tous droits réservés.
          </div>
          <div className="flex gap-4">
            <Link to="/products" className="hover:text-orange-500 transition">Catalogue</Link>
            <Link to="/terms" className="hover:text-orange-500 transition">Conditions d'utilisation</Link>
            <Link to="/contact" className="hover:text-orange-500 transition">Contact</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}