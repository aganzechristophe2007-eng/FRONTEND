import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Zap, Search, ArrowRight, ShieldCheck, MapPin, Star, AlertCircle } from 'lucide-react';
import ProductCard from './ProductCard';
import MobileNav from './MobileNav';

const getImageUrl = (img?: string) => {
  if (!img) return 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=500&q=80';
  if (img.startsWith('http://') || img.startsWith('https://') || img.startsWith('blob:') || img.startsWith('data:')) {
    return img;
  }
  const cleanPath = img.replace(/\\/g, '/').replace(/^\/+/, '');
  return `https://cbfsoko-backend.onrender.com/${cleanPath.startsWith('uploads/') ? cleanPath : 'uploads/' + cleanPath}`;
};

export default function Home({
  darkMode = true,
  user,
  unreadMessagesCount = 0,
  featuredProducts = [],
  loadingProducts = false,
  LOGO_URL = '',
  handleProtectedAction
}: any) {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

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
      
      <div className="flex-grow pb-24 sm:pb-12">
        {/* HERO SECTION */}
        <section className="relative overflow-hidden py-12 sm:py-20 px-4 border-b border-neutral-800/60 bg-gradient-to-b from-neutral-900/50 to-neutral-950">
          <div className="max-w-4xl mx-auto text-center relative z-10">
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <span className="bg-orange-500/10 text-orange-400 border border-orange-500/20 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider inline-block mb-4">
                La référence e-commerce à Bukavu 🇨🇩[cite: 1]
              </span>
              <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight mb-4">
                Achetez et Vendez en toute <span className="text-orange-500">Confiance</span>
              </h1>
              <p className="text-neutral-400 text-sm sm:text-base max-w-2xl mx-auto mb-8">
                Trouvez les meilleures offres locales, gagnez du temps et concluez vos transactions en toute sécurité sur CBF SOKO[cite: 1].
              </p>
            </motion.div>

            <motion.form 
              onSubmit={handleSearchSubmit}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="flex items-center bg-neutral-900 border border-neutral-800 rounded-2xl p-1.5 sm:p-2 shadow-xl max-w-2xl mx-auto focus-within:border-orange-500 transition"
            >
              <div className="pl-3 text-neutral-400"><Search className="w-5 h-5" /></div>
              <input 
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Que recherchez-vous aujourd'hui ? (ex: iPhone, Chaussures...)"
                className="w-full bg-transparent border-none outline-none px-3 text-sm sm:text-base text-white placeholder-neutral-500"
              />
              <button type="submit" className="bg-orange-600 hover:bg-orange-500 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition cursor-pointer flex items-center gap-1.5 shrink-0">
                <span>Rechercher</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </motion.form>

            <div className="grid grid-cols-3 gap-2 sm:gap-4 mt-8 max-w-xl mx-auto text-xs text-neutral-400 font-medium">
              <div className="flex items-center justify-center gap-1.5 bg-neutral-900/60 border border-neutral-800/80 py-2 px-3 rounded-xl"><ShieldCheck className="w-4 h-4 text-orange-500 shrink-0" /><span>Paiement Sécurisé[cite: 1]</span></div>
              <div className="flex items-center justify-center gap-1.5 bg-neutral-900/60 border border-neutral-800/80 py-2 px-3 rounded-xl"><MapPin className="w-4 h-4 text-orange-500 shrink-0" /><span>Bukavu & RDC[cite: 1]</span></div>
              <div className="flex items-center justify-center gap-1.5 bg-neutral-900/60 border border-neutral-800/80 py-2 px-3 rounded-xl"><Star className="w-4 h-4 text-orange-500 shrink-0" /><span>Vendeurs Vérifiés[cite: 1]</span></div>
            </div>
          </div>
        </section>

        {/* CATALOGUE */}
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
              {featuredProducts.map((product: any, index: number) => (
                <ProductCard key={product.id || product._id || index} product={product} index={index} darkMode={darkMode} />
              ))}
            </div>
          )}
        </section>
      </div>

      {/* NAVIGATION MOBILE */}
      <MobileNav user={user} unreadMessagesCount={unreadMessagesCount} handleProtectedAction={handleProtectedAction} getImageUrl={getImageUrl} />

      {/* FOOTER */}
      <footer className={`border-t py-8 px-4 sm:px-8 mt-auto transition-colors ${darkMode ? 'bg-neutral-900 border-neutral-800 text-neutral-400' : 'bg-white border-neutral-200 text-neutral-600'}`}>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-600 rounded-xl flex items-center justify-center overflow-hidden shadow-md border border-orange-500 relative">
              <img src={LOGO_URL} alt="CBF SOKO Logo" className="w-full h-full object-cover" onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }} />
            </div>
            <div>
              <span className="font-extrabold text-sm text-white block">CBF SOKO Bukavu[cite: 1]</span>
              <p className="text-[11px]">La plateforme de confiance pour vos achats et ventes en RDC[cite: 1].</p>
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
            <p>&copy; {new Date().getFullYear()} CBF SOKO[cite: 1]. Tous droits réservés.</p>
            <p className="text-[10px] mt-0.5">Plateforme sécurisée régie par les lois de la RDC[cite: 1].</p>
          </div>
        </div>
      </footer>

    </div>
  );
}