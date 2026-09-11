import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  Search, PlusCircle, Sun, Moon, Zap, Wallet, 
  MessageSquare, Bell, LogOut, Package, ShieldCheck, Truck, 
  Headphones, MapPin, Home as HomeIcon, Image as ImageIcon, Sparkles, X, ChevronDown, Award, CreditCard, Camera, User as UserIcon, HelpCircle, History, Info, Target, Store,
  FileText, Cookie, Scale, Mail, Phone
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
// Icônes réseaux sociaux en SVG inline (évite toute dépendance à lucide-react pour les logos de marque)
const FacebookIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5.02 3.66 9.18 8.44 9.94v-7.03H7.9v-2.91h2.54V9.85c0-2.51 1.49-3.9 3.77-3.9 1.09 0 2.23.2 2.23.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56v1.89h2.78l-.44 2.91h-2.34V22c4.78-.76 8.44-4.92 8.44-9.94Z" />
  </svg>
);

const InstagramIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37Z" />
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
  </svg>
);

const TwitterIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M18.9 2H22l-7.6 8.7L23.3 22h-7.1l-5.5-7.2L4.3 22H1l8.1-9.3L1 2h7.3l5 6.6L18.9 2Zm-1.2 18h1.9L7.4 4H5.4l12.3 16Z" />
  </svg>
);

const YoutubeIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M23.5 6.6a3 3 0 0 0-2.1-2.1C19.5 4 12 4 12 4s-7.5 0-9.4.5A3 3 0 0 0 .5 6.6 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.4 3 3 0 0 0 2.1 2.1C4.5 20 12 20 12 20s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.4ZM9.6 15.5v-7l6.3 3.5-6.3 3.5Z" />
  </svg>
);

export default function Home() {
  const [darkMode, setDarkMode] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showServicesDropdown, setShowServicesDropdown] = useState<boolean>(false);
  const [showMobileServicesModal, setShowMobileServicesModal] = useState<boolean>(false);
  const location = useLocation();
  
  const servicesDropdownRef = useRef<HTMLDivElement>(null);

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

  const LOGO_URL = '/logo.png'; 

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

  // Gestion de la fermeture au clic en dehors pour le menu dropdown desktop
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (servicesDropdownRef.current && !servicesDropdownRef.current.contains(event.target as Node)) {
        setShowServicesDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

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
        setFeaturedProducts(list.slice(0, 16));
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
    } catch {}

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
        console.error("Erreur compteurs", err);
      }
    };

    fetchUnreadCounts();
    const interval = setInterval(fetchUnreadCounts, 15000);
    return () => clearInterval(interval);
  }, [token]);

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
        } catch {}

        let ordersLength = 0;
        let demandesLength = 0;

        try {
          const resOrders = await apiFetch('/orders');
          const ordersList = Array.isArray(resOrders) ? resOrders : (resOrders.data || resOrders.orders || []);
          ordersLength = ordersList.length;
        } catch {}

        try {
          const resProducts = await apiFetch('/products');
          const productsList = Array.isArray(resProducts) ? resProducts : (resProducts.data || []);
          
          const userDemandes = productsList.filter((p: ProductItem) => {
            const pSellerId = p.sellerId || p.userId || p.seller?.id || p.seller?._id;
            const matchesUser = currentUserId ? (pSellerId === currentUserId) : true;
            const typeStr = String(p.type || '').toUpperCase();
            const titleStr = String(p.title || '');
            return matchesUser && (typeStr === 'REQUEST' || titleStr.includes('[DEMANDE]') || p.isDemande === true);
          });
          demandesLength = userDemandes.length;
        } catch {}

        setOrdersCount(ordersLength + demandesLength);
      } catch (err) {
        console.error("Erreur commandes", err);
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
    try { await apiFetch('/messages/mark-read', { method: 'POST' }); } catch {}
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

  // Redirection centralisée vers ProductDetails (route /products/:id)
  const goToProductDetails = useCallback((productId?: string) => {
    if (!productId) return;
    navigate(`/products/${productId}`);
  }, [navigate]);

  const memoizedAvatar = useMemo(() => {
    if (userAvatarUrl) {
      return <img src={userAvatarUrl} alt={user?.name || 'User'} className="w-full h-full object-cover" onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }} />;
    }
    if (user?.avatar) {
      return <img src={getImageUrl(user.avatar)} alt={user?.name || 'User'} className="w-full h-full object-cover" onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }} />;
    }
    return getInitials(user?.name || 'U');
  }, [userAvatarUrl, user?.avatar, user?.name, getImageUrl]);

  // Contenu riche et détaillé sur l'historique, les créateurs, la mission, les services et garanties de CBF SOKO
  const detailedServicesContent = (
    <div className="flex flex-col gap-4 max-h-[420px] overflow-y-auto pr-1 text-left">
      
      {/* Historique & Origine */}
      <div className="flex items-start gap-3 pb-3 border-b border-neutral-700/50">
        <div className="w-14 h-14 rounded-lg bg-orange-500/10 text-orange-500 flex items-center justify-center flex-shrink-0 mt-0.5">
          <History className="w-4 h-4" />
        </div>
        <div>
          <h5 className="font-extrabold text-xs mb-1 text-orange-400">Histoire & Origine de CBF SOKO</h5>
          <p className="text-[11px] text-neutral-300 leading-relaxed">
            Fondée à Bukavu (République Démocratique du Congo) par des entrepreneurs locaux visionnaires passionnés de tech, CBF SOKO est née du besoin urgent de digitaliser le commerce de proximité et de fluidifier les transactions entre acheteurs et vendeurs au Kivu avec un outil ultra-rapide, fiable et sécurisé.
          </p>
        </div>
      </div>

      {/* Vision & Créateurs */}
      <div className="flex items-start gap-3 pb-3 border-b border-neutral-700/50">
        <div className="w-14 h-14 rounded-lg bg-orange-500/10 text-orange-500 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Target className="w-4 h-4" />
        </div>
        <div>
          <h5 className="font-extrabold text-xs mb-1 text-orange-400">Nos Créateurs & Mission</h5>
          <p className="text-[11px] text-neutral-300 leading-relaxed">
            Imaginée par une équipe d'ingénieurs et développeurs congolais, notre mission est de connecter directement les boutiques physiques, marchés locaux et particuliers de la région pour booster l'économie numérique locale, en éliminant les intermédiaires superflus.
          </p>
        </div>
      </div>

      {/* Services & Multidevises */}
      <div className="flex items-start gap-3 pb-3 border-b border-neutral-700/50">
        <div className="w-14 h-14 rounded-lg bg-orange-500/10 text-orange-500 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Store className="w-4 h-4" />
        </div>
        <div>
          <h5 className="font-extrabold text-xs mb-1 text-orange-400">Nos Services Principaux</h5>
          <p className="text-[11px] text-neutral-300 leading-relaxed">
            Publication d'annonces instantanée par photo 📷, gestion de boutiques vérifiées, conversion automatique des prix en Dollars ($) et Francs Congolais (CDF), et messagerie interne en temps réel.
          </p>
        </div>
      </div>

      {/* Sécurité, Livraison & Garantie */}
      <div className="flex items-start gap-3 pb-3 border-b border-neutral-700/50">
        <div className="w-14 h-14 rounded-lg bg-orange-500/10 text-orange-500 flex items-center justify-center flex-shrink-0 mt-0.5">
          <ShieldCheck className="w-4 h-4" />
        </div>
        <div>
          <h5 className="font-extrabold text-xs mb-1 text-orange-400">Garantie & Paiements Sécurisés</h5>
          <p className="text-[11px] text-neutral-300 leading-relaxed">
            Chaque transaction est protégée par notre portefeuille électronique intégré. Les fonds restent sécurisés jusqu'à la livraison effective de votre colis par nos coursiers partenaires à Bukavu (Ibanda, Kadutu, Bagira).
          </p>
        </div>
      </div>

      {/* Support 7j/7 */}
      <div className="flex items-start gap-3">
        <div className="w-14 h-14 rounded-lg bg-orange-500/10 text-orange-500 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Headphones className="w-4 h-4" />
        </div>
        <div>
          <h5 className="font-extrabold text-xs mb-1 text-orange-400">Support Client 7j/7</h5>
          <p className="text-[11px] text-neutral-300 leading-relaxed">
            Une assistance dédiée et réactive disponible à tout moment pour résoudre vos litiges, répondre à vos questions et vous accompagner dans vos achats et ventes quotidiens.
          </p>
        </div>
      </div>

    </div>
  );

  return (
    // Layout en flex-col : le footer reste en bas de l'écran si peu de contenu,
    // et suit le scroll normalement dès que le contenu (produits) dépasse la hauteur de l'écran.
    <div className={`min-h-screen flex flex-col transition-colors duration-300 relative ${darkMode ? 'bg-neutral-950 text-white' : 'bg-neutral-50 text-neutral-900'}`}>
      
      {/* HEADER */}
      <header className={`sticky top-0 z-50 border-b px-2 sm:px-6 lg:px-8 py-2.5 transition-colors shadow-sm ${
        darkMode ? 'bg-neutral-900/95 border-neutral-800 backdrop-blur-md' : 'bg-white/95 border-neutral-200 backdrop-blur-md'
      }`}>
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-1.5 sm:gap-4">
          
          {/* Logo / Nom (Desktop) & Bouton '?' / Caméra (Mobile) */}
          <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0 relative" ref={servicesDropdownRef}>
            <Link to="/" className="hidden sm:flex items-center gap-2">
              <div className="w-9 h-9 sm:w-11 sm:h-11 bg-orange-600 rounded-xl flex items-center justify-center overflow-hidden shadow-md shadow-orange-600/30 border border-orange-500 relative">
                <img 
                  src={LOGO_URL} 
                  alt="CBF SOKO Logo" 
                  className="w-full h-full object-cover" 
                  onError={(e) => {
                    (e.currentTarget as HTMLElement).style.display = 'none';
                  }} 
                />
              </div>
              <div>
                <span className="font-extrabold text-sm sm:text-base tracking-tight block leading-none">CBFSOKO</span>
                <span className="text-[9px] text-orange-500 font-bold tracking-widest uppercase flex items-center gap-0.5">
                  <MapPin className="w-2.5 h-2.5" /> Bukavu
                </span>
              </div>
            </Link>

            {/* Petit bouton '?' à gauche (cliquable, ouvre la modale ou le menu déroulant complet) */}
            <button 
              onClick={() => {
                setShowMobileServicesModal(true);
                setShowServicesDropdown(prev => !prev);
              }}
              className="w-8 h-8 rounded-full bg-orange-600/20 border border-orange-500 text-orange-500 flex items-center justify-center font-bold text-xs cursor-pointer hover:bg-orange-600 hover:text-white transition shadow-sm"
              title="À propos, Historique, Nos Services & Garanties"
            >
              <HelpCircle className="w-4 h-4" />
            </button>

            {/* SUR MOBILE : Icône Notification placée à gauche de la recherche */}
            <button 
              onClick={handleOpenNotifications}
              className="sm:hidden p-2 rounded-xl bg-neutral-800 border border-neutral-700 text-orange-500 flex items-center justify-center cursor-pointer hover:bg-neutral-700 transition relative"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadNotifsCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[9px] font-extrabold w-4 h-4 flex items-center justify-center rounded-full animate-pulse">
                  {unreadNotifsCount}
                </span>
              )}
            </button>

            {/* Menu Déroulant DESKTOP pour les services et l'historique complet */}
            <div className="relative hidden md:block">
              <button 
                onClick={() => setShowServicesDropdown(!showServicesDropdown)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold transition cursor-pointer ${
                  darkMode ? 'bg-neutral-950 border-neutral-800 hover:border-orange-500 text-neutral-300' : 'bg-neutral-100 border-neutral-200 hover:border-orange-500 text-neutral-700'
                }`}
              >
                <span>À propos de CBF SOKO</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showServicesDropdown ? 'rotate-180 text-orange-500' : ''}`} />
              </button>

              {showServicesDropdown && (
                <div className={`absolute top-full left-0 mt-2 w-[420px] p-5 rounded-2xl border shadow-2xl z-50 transition-all ${
                  darkMode ? 'bg-neutral-900 border-neutral-800 text-white' : 'bg-white border-neutral-200 text-neutral-900'
                }`}>
                  <div className="flex items-center justify-between pb-3 mb-3 border-b border-neutral-700/50">
                    <div className="flex items-center gap-2">
                      <div className="w-14 h-14 rounded-lg bg-orange-600 text-white flex items-center justify-center font-bold">
                        <Sparkles className="w-3.5 h-3.5" />
                      </div>
                      <h4 className="font-extrabold text-xs text-orange-500">Histoire, Créateurs & Services</h4>
                    </div>
                    <button onClick={() => setShowServicesDropdown(false)} className="text-neutral-400 hover:text-white cursor-pointer p-1">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  {detailedServicesContent}
                </div>
              )}
            </div>
          </div>

          {/* Modale mobile pour l'historique, créateurs, services et garanties */}
          <AnimatePresence>
            {showMobileServicesModal && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowMobileServicesModal(false)}
                className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 sm:hidden"
              >
                <motion.div 
                  initial={{ scale: 0.9, y: 20 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0.9, y: 20 }}
                  onClick={(e) => e.stopPropagation()}
                  className={`w-full max-w-sm p-5 rounded-2xl border relative shadow-2xl ${darkMode ? 'bg-neutral-900 border-neutral-800 text-white' : 'bg-white border-neutral-200 text-neutral-900'}`}
                >
                  <div className="flex justify-between items-center mb-4 pb-2 border-b border-neutral-800">
                    <h3 className="font-extrabold text-xs text-orange-500 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4" /> Histoire & Infos CBF SOKO
                    </h3>
                    <button 
                      onClick={() => setShowMobileServicesModal(false)} 
                      className="p-1 rounded-lg bg-neutral-800 text-neutral-300 hover:text-white cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  {detailedServicesContent}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Barre de recherche au milieu */}
          <form onSubmit={handleSearch} className="flex-1 max-w-lg min-w-0 mx-1 sm:mx-4">
            <div className={`flex w-full items-center rounded-full border overflow-hidden transition ${
              darkMode ? 'bg-neutral-950 border-neutral-800 focus-within:border-orange-500' : 'bg-neutral-100 border-neutral-300 focus-within:border-orange-500'
            }`}>
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher un produit..." 
                className="w-full bg-transparent px-3 sm:px-4 py-1.5 sm:py-2 text-[11px] sm:text-sm outline-none placeholder-neutral-500 truncate"
              />
              <button type="submit" className="bg-orange-600 hover:bg-orange-700 px-3 sm:px-4 py-1.5 sm:py-2 text-white transition flex items-center justify-center cursor-pointer flex-shrink-0">
                <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            </div>
          </form>

          {/* Actions Droite */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 flex-shrink-0">
            
            <button 
              onClick={() => handleProtectedAction('/orders')}
              className={`hidden md:flex items-center gap-1.5 px-2.5 py-2 rounded-full border text-xs font-bold transition cursor-pointer relative ${
                darkMode ? 'bg-neutral-950 border-neutral-800 hover:border-orange-500 text-neutral-300' : 'bg-white border-neutral-300 hover:border-orange-500 text-neutral-700'
              }`}
            >
              <Package className="w-4 h-4 text-orange-500" />
              <span>Commandes</span>
              {ordersCount > 0 && (
                <span className="bg-orange-600 text-white text-[10px] font-extrabold px-1.5 py-0.2 rounded-full">
                  {ordersCount}
                </span>
              )}
            </button>

            <button 
              onClick={handleOpenMessages}
              className={`hidden md:flex items-center gap-1.5 px-2.5 py-2 rounded-full border text-xs font-bold transition cursor-pointer relative ${
                darkMode ? 'bg-neutral-950 border-neutral-800 hover:border-orange-500 text-neutral-300' : 'bg-white border-neutral-300 hover:border-orange-500 text-neutral-700'
              }`}
              title="Messages"
            >
              <MessageSquare className="w-4 h-4 text-orange-500" />
              <span>Messages</span>
              {unreadMessagesCount > 0 && (
                <span className="bg-red-600 text-white text-[10px] font-extrabold w-4 h-4 flex items-center justify-center rounded-full animate-pulse">
                  {unreadMessagesCount}
                </span>
              )}
            </button>

            <button 
              onClick={handleOpenNotifications}
              className={`hidden md:flex items-center p-2 rounded-full border transition cursor-pointer relative ${
                darkMode ? 'bg-neutral-950 border-neutral-800 hover:border-orange-500 text-neutral-300' : 'bg-white border-neutral-300 hover:border-orange-500 text-neutral-700'
              }`}
              title="Notifications"
            >
              <Bell className="w-4 h-4 text-orange-500" />
              {unreadNotifsCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[9px] font-extrabold w-4 h-4 flex items-center justify-center rounded-full animate-pulse">
                  {unreadNotifsCount}
                </span>
              )}
            </button>

            <button 
              onClick={() => handleProtectedAction('/create-product')}
              className="hidden sm:flex items-center gap-1 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs px-4 py-2 rounded-full transition shadow-md shadow-orange-600/20 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Vendre</span>
            </button>

            {/* Profil utilisateur à droite */}
            {token ? (
              <div className="flex items-center gap-1.5">
                <button 
                  onClick={() => handleProtectedAction('/wallet')}
                  className={`flex items-center gap-1.5 px-2 py-1.5 rounded-full border transition cursor-pointer ${
                    darkMode ? 'bg-neutral-950 border-neutral-800 text-white' : 'bg-white border-neutral-300 text-neutral-900'
                  }`}
                  title="Profil & Portefeuille"
                >
                  <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-orange-600 text-white font-bold text-xs flex items-center justify-center overflow-hidden flex-shrink-0">
                    {memoizedAvatar}
                  </div>
                  <div className="hidden sm:flex flex-col text-left">
                    <span className="text-[10px] text-neutral-400 leading-none flex items-center gap-1">Solde <Wallet className="w-3 h-3 text-orange-500" /></span>
                    <span className="text-xs font-black text-orange-500">{user?.balance ?? 0} $</span>
                  </div>
                </button>
                <button onClick={handleLogout} className="p-2 rounded-full bg-red-600/20 border border-red-800 text-red-400 hover:bg-red-600 hover:text-white transition cursor-pointer hidden sm:block" title="Se déconnecter">
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <Link to="/login" className="px-3 py-1.5 rounded-full text-[11px] sm:text-xs font-bold bg-neutral-800 text-white transition hover:bg-neutral-700">Connexion</Link>
                <Link to="/register" className="px-3 py-1.5 rounded-full text-[11px] sm:text-xs font-bold bg-orange-600 text-white hidden sm:block transition hover:bg-orange-700">Inscription</Link>
              </div>
            )}

            <button onClick={() => setDarkMode(!darkMode)} className={`p-2 rounded-full border transition cursor-pointer ${darkMode ? 'bg-neutral-950 border-neutral-800 text-yellow-400' : 'bg-white border-neutral-300 text-neutral-800'}`}>
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4 text-orange-600" />}
            </button>
          </div>
        </div>
      </header>

      {/* BARRE D'ONGLETS MOBILE EN BAS (fixe à l'écran, indépendante du footer) */}
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
            <Camera className="w-6 h-6" />
          </button>
          <span className="text-[10px] font-bold text-orange-500 mt-0.5">Poster</span>
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
          onClick={() => handleProtectedAction('/wallet')}
          className={`flex flex-col items-center justify-center flex-1 py-1 relative bg-transparent border-none cursor-pointer text-inherit transition ${location.pathname.includes('/wallet') ? 'text-orange-500 font-bold' : 'hover:text-orange-500'}`}
        >
          <UserIcon className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">Profil</span>
        </button>
      </div>

      {/* CONTENU PRINCIPAL — flex-1 pour occuper l'espace restant et repousser le footer en bas */}
      <main className="flex-1 pb-20 sm:pb-0">
        <section className="max-w-7xl mx-auto px-2 sm:px-4 py-6">
          <div className="flex justify-between items-center mb-5 border-b border-neutral-800 pb-3">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500" />
              <h2 className="text-base sm:text-2xl font-extrabold tracking-tight">BYA BIKO DISPO</h2>
            </div>
            <Link to="/products" className="text-orange-500 hover:text-orange-400 font-semibold text-[11px] sm:text-xs uppercase tracking-wider transition flex items-center gap-1">
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
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
              {featuredProducts.map((product, index) => {
                const productId = product.id || product._id;
                const prodTitle = product.title || 'Article';
                const priceUSDValue = product.priceUSD || 0;
                const priceCDFValue = product.priceCDF || 0;
                
                const priceUSDStr = priceUSDValue > 0 ? `${priceUSDValue} $` : 'Sur demande';
                const priceCDFStr = priceCDFValue > 0 ? `${priceCDFValue.toLocaleString()} CDF` : '';

                const prodCategory = typeof product.category === 'object' && product.category !== null ? product.category.name : 'Général';
                
                const imagesList = Array.isArray(product.images) ? product.images : [];
                const rawImage = imagesList.length > 0 ? imagesList[0] : undefined;
                const prodImage = getImageUrl(rawImage);
                const photosCount = imagesList.length;

                const posterName = product.seller?.name || 'Vendeur';

                return (
                  <motion.div 
                    key={productId || index}
                    initial={{ opacity: 0, y: 15 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.3, delay: index * 0.02 }}
                    onClick={() => goToProductDetails(productId)}
                    className={`rounded-lg sm:rounded-2xl overflow-hidden border group shadow-sm hover:shadow-lg transition-all flex flex-col justify-between cursor-pointer hover:border-orange-500 hover:-translate-y-0.5 ${
                      darkMode ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-neutral-200'
                    }`}
                  >
                    <div>
                      {/* Image carrée cliquable -> ProductDetails */}
                      <div 
                        className="aspect-square w-full overflow-hidden bg-neutral-950 relative"
                        onClick={(e) => {
                          e.stopPropagation();
                          goToProductDetails(productId);
                        }}
                      >
                        <img 
                          src={prodImage} 
                          alt={prodTitle} 
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=500&q=80';
                          }}
                        />
                        <span className="absolute top-1 left-1 sm:top-2 sm:left-2 bg-black/80 backdrop-blur-md text-[8px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded text-orange-400 border border-neutral-700 truncate max-w-[70px] sm:max-w-[100px]">
                          {prodCategory}
                        </span>

                        {photosCount > 0 && (
                          <span className="absolute bottom-1 right-1 bg-black/75 backdrop-blur-md text-white text-[8px] sm:text-[10px] font-bold px-1 py-0.5 rounded flex items-center gap-0.5 border border-neutral-700/60 shadow">
                            <ImageIcon className="w-2.5 h-2.5 text-orange-400" />
                            <span>{photosCount}</span>
                          </span>
                        )}
                      </div>

                      <div className="p-1.5 sm:p-4">
                        <div className="flex justify-between items-center text-[8px] sm:text-[11px] text-neutral-400 mb-0.5">
                          <span className="truncate max-w-[50px] sm:max-w-[120px]" title={posterName}><strong>{posterName}</strong></span>
                          <span className="flex items-center gap-0.5"><MapPin className="w-2 h-2 text-orange-500" /> Bukavu</span>
                        </div>

                        <h3 className="font-bold text-[9px] sm:text-sm mb-1 truncate group-hover:text-orange-500 transition leading-tight">{prodTitle}</h3>

                        <div>
                          <div className="text-orange-500 font-black text-[9px] sm:text-sm leading-none">
                            {priceUSDStr}
                          </div>
                          {priceCDFStr && (
                            <div className="text-[7px] sm:text-[11px] text-neutral-400 font-medium truncate mt-0.5">
                              ≈ {priceCDFStr}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="p-1.5 sm:p-4 pt-0">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          goToProductDetails(productId);
                        }}
                        className="w-full py-1 sm:py-2 bg-orange-600/10 hover:bg-orange-600 hover:text-white text-orange-500 font-bold text-[8px] sm:text-xs rounded-md sm:rounded-xl transition border border-orange-500/20 flex items-center justify-center gap-0.5 cursor-pointer"
                      >
                        <span>Voir</span> <span className="hidden sm:inline">({photosCount} 📷)</span>
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {/* FOOTER — flux normal, tout en bas de page (pas fixed), façon Facebook avec liens légaux */}
      <footer className={`mt-auto border-t transition-colors ${
        darkMode ? 'bg-neutral-900 border-neutral-800 text-neutral-400' : 'bg-white border-neutral-200 text-neutral-600'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            
            {/* Colonne marque */}
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-10 h-10 bg-orange-600 rounded-xl flex items-center justify-center overflow-hidden shadow-md border border-orange-500 relative flex-shrink-0">
                  <img 
                    src={LOGO_URL} 
                    alt="CBF SOKO Logo" 
                    className="w-full h-full object-cover" 
                    onError={(e) => {
                      (e.currentTarget as HTMLElement).style.display = 'none';
                    }} 
                  />
                </div>
                <span className={`font-extrabold text-sm block ${darkMode ? 'text-white' : 'text-neutral-900'}`}>CBF SOKO</span>
              </div>
              <p className="text-[12px] leading-relaxed mb-4">
                La plateforme de confiance pour vos achats et ventes en RDC. Bukavu, Sud-Kivu.
              </p>
              <div className="flex items-center gap-2">
  <a href="#" aria-label="Facebook" className="w-8 h-8 rounded-full bg-neutral-800/50 hover:bg-orange-600 hover:text-white flex items-center justify-center transition"><FacebookIcon className="w-3.5 h-3.5" /></a>
  <a href="#" aria-label="Instagram" className="w-8 h-8 rounded-full bg-neutral-800/50 hover:bg-orange-600 hover:text-white flex items-center justify-center transition"><InstagramIcon className="w-3.5 h-3.5" /></a>
  <a href="#" aria-label="Twitter / X" className="w-8 h-8 rounded-full bg-neutral-800/50 hover:bg-orange-600 hover:text-white flex items-center justify-center transition"><TwitterIcon className="w-3.5 h-3.5" /></a>
  <a href="#" aria-label="Youtube" className="w-8 h-8 rounded-full bg-neutral-800/50 hover:bg-orange-600 hover:text-white flex items-center justify-center transition"><YoutubeIcon className="w-3.5 h-3.5" /></a>
</div>
            </div>

            {/* Découvrir */}
            <div>
              <h4 className={`text-xs font-extrabold uppercase tracking-wider mb-3 ${darkMode ? 'text-white' : 'text-neutral-900'}`}>Découvrir</h4>
              <ul className="flex flex-col gap-2 text-[12px]">
                <li><Link to="/products" className="hover:text-orange-500 transition">Catalogue</Link></li>
                <li><Link to="/create-product" className="hover:text-orange-500 transition">Vendre un article</Link></li>
                <li><Link to="/wallet" className="hover:text-orange-500 transition">Portefeuille</Link></li>
                <li><Link to="/orders" className="hover:text-orange-500 transition">Mes commandes</Link></li>
              </ul>
            </div>

            {/* Assistance */}
            <div>
              <h4 className={`text-xs font-extrabold uppercase tracking-wider mb-3 ${darkMode ? 'text-white' : 'text-neutral-900'}`}>Assistance</h4>
              <ul className="flex flex-col gap-2 text-[12px]">
                <li><Link to="/messages" className="hover:text-orange-500 transition">Centre d'aide</Link></li>
                <li><Link to="/messages" className="hover:text-orange-500 transition">Nous contacter</Link></li>
                <li>
                  <a href="mailto:support@cbfsoko.com" className="hover:text-orange-500 transition flex items-center gap-1.5">
                    <Mail className="w-3 h-3" /> support@cbfsoko.com
                  </a>
                </li>
                <li>
                  <a href="tel:+243000000000" className="hover:text-orange-500 transition flex items-center gap-1.5">
                    <Phone className="w-3 h-3" /> +243 000 000 000
                  </a>
                </li>
              </ul>
            </div>

            {/* Légal */}
            <div>
              <h4 className={`text-xs font-extrabold uppercase tracking-wider mb-3 ${darkMode ? 'text-white' : 'text-neutral-900'}`}>Légal</h4>
              <ul className="flex flex-col gap-2 text-[12px]">
                <li><Link to="/legal/terms" className="hover:text-orange-500 transition flex items-center gap-1.5"><FileText className="w-3 h-3" /> Conditions d'utilisation</Link></li>
                <li><Link to="/legal/privacy" className="hover:text-orange-500 transition flex items-center gap-1.5"><ShieldCheck className="w-3 h-3" /> Politique de confidentialité</Link></li>
                <li><Link to="/legal/cookies" className="hover:text-orange-500 transition flex items-center gap-1.5"><Cookie className="w-3 h-3" /> Politique de cookies</Link></li>
                <li><Link to="/legal/mentions" className="hover:text-orange-500 transition flex items-center gap-1.5"><Scale className="w-3 h-3" /> Mentions légales</Link></li>
                <li><Link to="/legal/community" className="hover:text-orange-500 transition flex items-center gap-1.5"><Info className="w-3 h-3" /> Règles de la communauté</Link></li>
              </ul>
            </div>
          </div>

          {/* Barre du bas */}
          <div className={`mt-10 pt-6 border-t flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] ${darkMode ? 'border-neutral-800' : 'border-neutral-200'}`}>
            <span>&copy; {new Date().getFullYear()} CBF SOKO. Tous droits réservés.</span>
            <div className="flex items-center gap-4">
              <span>Français (RDC)</span>
              <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-orange-500" /> Bukavu, RDC</span>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}