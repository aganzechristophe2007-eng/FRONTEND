import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Zap, 
  MapPin, 
  Image as ImageIcon, 
  MessageSquare, 
  User as UserIcon, 
  ShoppingBag, 
  Wallet, 
  FileText,
  Search,
  Filter,
  ArrowRight,
  ShieldCheck,
  Star,
  ChevronRight,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

// Fonction utilitaire pour résoudre les URLs d'images (produits ou avatars)
const getImageUrl = (img?: string) => {
  if (!img) return 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=500&q=80';
  if (img.startsWith('http')) return img;
  return `${import.meta.env.VITE_API_URL || ''}/${img}`;
};

interface HomeProps {
  darkMode?: boolean;
  user?: {
    id?: string;
    _id?: string;
    name?: string;
    avatar?: string;
    profileImage?: string;
  };
  unreadMessagesCount?: number;
  featuredProducts?: any[];
  loadingProducts?: boolean;
  LOGO_URL?: string;
  handleProtectedAction: (path: string) => void;
}

export default function Home({
  darkMode = true,
  user,
  unreadMessagesCount = 0,
  featuredProducts = [],
  loadingProducts = false,
  LOGO_URL = '',
  handleProtectedAction
}: HomeProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      navigate('/products');
    }
  };

  return (
    <div className={`min-h-screen flex flex-col justify-between ${darkMode ? 'bg-neutral-950 text-white' : 'bg-neutral-50 text-neutral-900'}`}>
      
      {/* CONTENU GLOBAL DE LA PAGE ACCUEIL / CATALOGUE */}
      <div className="flex-grow pb-16 sm:pb-0">
        
        {/* HERO SECTION / BANNIERE DE RECHERCHE RAPIDE */}
        <section className="relative overflow-hidden py-12 sm:py-20 px-4 border-b border-neutral-800/60 bg-gradient-to-b from-neutral-900/50 to-neutral-950">
          <div className="max-w-4xl mx-auto text-center relative z-10">
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <span className="bg-orange-500/10 text-orange-400 border border-orange-500/20 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider inline-block mb-4">
                La référence e-commerce à Bukavu 🇨🇩
              </span>
              <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight mb-4">
                Achetez et Vendez en toute <span className="text-orange-500">Confiance</span>
              </h1>
              <p className="text-neutral-400 text-sm sm:text-base max-w-2xl mx-auto mb-8">
                Trouvez les meilleures offres locales, gagnez du temps et concluez vos transactions en toute sécurité sur CBF SOKO.
              </p>
            </motion.div>

            {/* Barre de recherche principale */}
            <motion.form 
              onSubmit={handleSearchSubmit}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="flex items-center bg-neutral-900 border border-neutral-800 rounded-2xl p-1.5 sm:p-2 shadow-xl max-w-2xl mx-auto focus-within:border-orange-500 transition"
            >
              <div className="pl-3 text-neutral-400">
                <Search className="w-5 h-5" />
              </div>
              <input 
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Que recherchez-vous aujourd'hui ? (ex: iPhone, Chaussures...)"
                className="w-full bg-transparent border-none outline-none px-3 text-sm sm:text-base text-white placeholder-neutral-500"
              />
              <button 
                type="submit"
                className="bg-orange-600 hover:bg-orange-500 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition cursor-pointer flex items-center gap-1.5 shrink-0"
              >
                <span>Rechercher</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </motion.form>

            {/* Avantages rapides */}
            <div className="grid grid-cols-3 gap-2 sm:gap-4 mt-8 max-w-xl mx-auto text-xs text-neutral-400 font-medium">
              <div className="flex items-center justify-center gap-1.5 bg-neutral-900/60 border border-neutral-800/80 py-2 px-3 rounded-xl">
                <ShieldCheck className="w-4 h-4 text-orange-500 shrink-0" />
                <span>Paiement Sécurisé</span>
              </div>
              <div className="flex items-center justify-center gap-1.5 bg-neutral-900/60 border border-neutral-800/80 py-2 px-3 rounded-xl">
                <MapPin className="w-4 h-4 text-orange-500 shrink-0" />
                <span>Bukavu & RDC</span>
              </div>
              <div className="flex items-center justify-center gap-1.5 bg-neutral-900/60 border border-neutral-800/80 py-2 px-3 rounded-xl">
                <Star className="w-4 h-4 text-orange-500 shrink-0" />
                <span>Vendeurs Vérifiés</span>
              </div>
            </div>
          </div>
        </section>

        {/* CATALOGUE / PRODUITS (4 produits par ligne en mobile, aspect parfaitement carré, texte réduit en bas) */}
        <section className="max-w-7xl mx-auto px-2 sm:px-4 py-8">
          <div className="flex justify-between items-center mb-6 border-b border-neutral-800 pb-3">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500" />
              <h2 className="text-base sm:text-2xl font-extrabold tracking-tight">BYA BIKO DISPO</h2>
            </div>
            <Link to="/products" className="text-orange-500 hover:text-orange-400 font-semibold text-[11px] sm:text-xs uppercase tracking-wider transition flex items-center gap-1">
              Catalogue complet &rarr;
            </Link>
          </div>

          {loadingProducts ? (
            <div className="text-center py-20 text-neutral-500 text-xs flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
              Chargement des meilleures offres...
            </div>
          ) : featuredProducts.length === 0 ? (
            <div className="text-center py-20 text-neutral-500 text-xs bg-neutral-900/30 rounded-2xl border border-neutral-800 flex flex-col items-center justify-center gap-2">
              <AlertCircle className="w-8 h-8 text-neutral-600 mb-1" />
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
                    onClick={() => navigate(`/products/${productId}`)}
                    className={`rounded-lg sm:rounded-2xl overflow-hidden border group shadow-sm transition flex flex-col justify-between cursor-pointer hover:border-orange-500 ${
                      darkMode ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-neutral-200'
                    }`}
                  >
                    <div>
                      {/* Image carrée (aspect-square) cliquable redirigeant vers la page de détails */}
                      <div className="aspect-square w-full overflow-hidden bg-neutral-950 relative">
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

                      {/* Bloc texte extrêmement compact et police réduite pour mobile (4 par ligne) */}
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
                          navigate(`/products/${productId}`);
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
      </div>

      {/* BARRE DE NAVIGATION MOBILE (Fixe en bas sur petits écrans) */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-neutral-900 border-t border-neutral-800 flex items-center justify-around py-2 shadow-2xl">
        <button 
          onClick={() => handleProtectedAction('/messages')}
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
          {user?.avatar || user?.profileImage ? (
            <div className="w-5 h-5 mb-0.5 rounded-full overflow-hidden border border-orange-500/50">
              <img 
                src={getImageUrl(user.avatar || user.profileImage)} 
                alt="Profil" 
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.currentTarget.parentElement as HTMLElement).style.display = 'none';
                }}
              />
            </div>
          ) : (
            <UserIcon className="w-5 h-5 mb-0.5" />
          )}
          <span className="text-[10px]">Profil</span>
        </button>
      </div>

      {/* FOOTER IMMOBILISÉ EN BAS AVEC MENTIONS JURIDIQUES ET CONDITIONS */}
      <footer className={`border-t py-8 px-4 sm:px-8 mt-auto sticky bottom-0 z-40 transition-colors ${
        darkMode ? 'bg-neutral-900 border-neutral-800 text-neutral-400' : 'bg-white border-neutral-200 text-neutral-600'
      }`}>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-600 rounded-xl flex items-center justify-center overflow-hidden shadow-md border border-orange-500 relative">
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
              <span className="font-extrabold text-sm text-white block">CBF SOKO Bukavu</span>
              <p className="text-[11px]">La plateforme de confiance pour vos achats et ventes en RDC.</p>
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-6 text-xs font-semibold">
            <Link to="/products" className="hover:text-orange-500 transition">Catalogue</Link>
            <Link to="/wallet" className="hover:text-orange-500 transition">Portefeuille</Link>
            <Link to="/orders" className="hover:text-orange-500 transition">Commandes</Link>
            <Link to="/messages" className="hover:text-orange-500 transition">Support</Link>
            <Link to="/terms" className="hover:text-orange-500 transition">Termes d'utilisation</Link>
            <Link to="/privacy" className="hover:text-orange-500 transition">Politique de confidentialité</Link>
            <Link to="/legal" className="hover:text-orange-500 transition">Mentions légales</Link>
          </div>

          <div className="text-[11px] text-neutral-500 text-center md:text-right">
            <p>&copy; {new Date().getFullYear()} CBF SOKO. Tous droits réservés.</p>
            <p className="text-[10px] mt-0.5">Plateforme sécurisée régie par les lois de la RDC.</p>
          </div>
        </div>
      </footer>

    </div>
  );
}