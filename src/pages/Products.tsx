import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Search, ArrowLeft, Sun, Moon, MapPin, MessageSquare, Layers } from 'lucide-react';
import { apiFetch } from '../api/client';

interface ProductItem {
  id: string;
  title?: string;
  name?: string;
  priceUSD?: number;
  priceCDF?: number;
  price?: string | number;
  category?: { name: string } | string;
  location?: string;
  images?: string[];
  image?: string;
  quantity?: number | string; // Ajout de la quantité
  sellerId?: string;
  seller?: { id: string; name: string };
}

export default function Products() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const initialSearch = searchParams.get('search') || '';
  const initialCategory = searchParams.get('category') || 'Tous';

  const [darkMode, setDarkMode] = useState(true);
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [token] = useState<string | null>(() => localStorage.getItem('token'));

  const categories = ["Tous", "Téléphonie", "Informatique", "Mode & Vêtements", "Équipement"];

  useEffect(() => {
    const s = searchParams.get('search');
    const c = searchParams.get('category');
    if (s !== null) setSearchTerm(s);
    if (c !== null) setSelectedCategory(c);
  }, [searchParams]);

  useEffect(() => {
    apiFetch('/products')
      .then((data) => {
        const list = Array.isArray(data) ? data : (data.data || []);
        setProducts(list);
      })
      .catch((err) => {
        console.error("Erreur de chargement du catalogue:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const handleProtectedAction = (destination: string) => {
    if (!token) {
      navigate(`/login?redirect=${destination}`);
    } else {
      navigate(destination);
    }
  };

  const filteredProducts = products.filter((p) => {
    const prodName = p.title || p.name || '';
    const prodLocation = p.location || '';
    
    let prodCategory = 'Général';
    if (typeof p.category === 'object' && p.category !== null) {
      prodCategory = p.category.name;
    } else if (typeof p.category === 'string') {
      prodCategory = p.category;
    }

    const matchesSearch = prodName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          prodLocation.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = selectedCategory === 'Tous' || 
                            prodCategory.toLowerCase() === selectedCategory.toLowerCase();
    
    return matchesSearch && matchesCategory;
  });

  const handleSearchChange = (val: string) => {
    setSearchTerm(val);
    setSearchParams({ search: val, category: selectedCategory });
  };

  const handleCategoryChange = (cat: string) => {
    setSelectedCategory(cat);
    setSearchParams({ search: searchTerm, category: cat });
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${darkMode ? 'bg-neutral-950 text-white' : 'bg-neutral-50 text-neutral-900'}`}>
      
      <header className={`sticky top-0 z-50 border-b px-4 lg:px-8 py-3 transition-colors ${
        darkMode ? 'bg-neutral-900/90 border-neutral-800 backdrop-blur-md' : 'bg-white/90 border-neutral-200 backdrop-blur-md'
      }`}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-semibold text-xs hover:text-orange-500 transition">
            <ArrowLeft size={18} />
            <span>Accueil</span>
          </Link>
          <span className="font-extrabold text-sm tracking-tight uppercase text-orange-500">Catalogue CBFSOKO</span>
          <button 
            onClick={() => setDarkMode(!darkMode)}
            className={`p-2 rounded-xl border transition ${
              darkMode ? 'bg-neutral-950 border-neutral-800 text-yellow-400' : 'bg-white border-neutral-300 text-neutral-800'
            }`}
          >
            {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4 text-orange-600" />}
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className={`p-4 rounded-2xl border mb-8 flex flex-col md:flex-row gap-4 items-center justify-between ${
          darkMode ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-neutral-200'
        }`}>
          <div className={`flex items-center gap-2 w-full md:w-96 px-3 py-2 rounded-xl border ${
            darkMode ? 'bg-neutral-950 border-neutral-800' : 'bg-neutral-100 border-neutral-300'
          }`}>
            <Search size={16} className="text-neutral-500" />
            <input 
              type="text"
              placeholder="Filtrer par nom ou lieu..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full bg-transparent outline-none text-xs sm:text-sm"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => handleCategoryChange(cat)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                  selectedCategory === cat 
                    ? 'bg-orange-600 text-white shadow-md' 
                    : darkMode ? 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700' : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20 text-neutral-500 text-xs flex flex-col items-center justify-center gap-3">
            <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
            Chargement du catalogue...
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-sm text-neutral-500 mb-4">Aucun produit ne correspond à vos critères de recherche.</p>
            <button 
              onClick={() => { handleSearchChange(''); handleCategoryChange('Tous'); }}
              className="px-4 py-2 rounded-xl bg-orange-600 text-white text-xs font-bold hover:bg-orange-500 transition cursor-pointer"
            >
              Réinitialiser les filtres
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredProducts.map((product, index) => {
              const title = product.title || product.name || 'Produit sans nom';
              
              const rawPriceUSD = product.priceUSD !== undefined 
                ? product.priceUSD 
                : (typeof product.price === 'number' ? product.price : parseFloat(product.price as string) || 0);
              
              const rawPriceCDF = product.priceCDF || (rawPriceUSD > 0 ? rawPriceUSD * 2300 : 0);

              const priceUSD = rawPriceUSD > 0 ? `${rawPriceUSD} $` : 'Prix sur demande';
              const priceCDF = rawPriceCDF > 0 ? `${rawPriceCDF.toLocaleString()} CDF` : '';

              const productImage = (product.images && product.images.length > 0) ? product.images[0] : (product.image || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=500&q=80');
              const location = product.location || 'Bukavu, Kivu';
              const catName = typeof product.category === 'object' && product.category !== null ? product.category.name : (product.category || 'Général');
              const quantityDisplay = product.quantity !== undefined && product.quantity !== null ? product.quantity : 1;
              
              const posterName = product.seller?.name || 'Vendeur';
              const logisticRoute = '/admin/seller-dashboard';

              return (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: index * 0.03 }}
                  key={product.id} 
                  className={`rounded-2xl overflow-hidden border group shadow-md transition ${
                    darkMode ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-neutral-200'
                  }`}
                >
                  <div className="h-48 overflow-hidden bg-neutral-950 relative">
                    <img src={productImage} alt={title} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                    <span className="absolute top-3 left-3 bg-black/80 backdrop-blur-md text-[10px] font-bold px-2.5 py-1 rounded-md text-orange-400 border border-neutral-700">
                      {catName}
                    </span>
                  </div>

                  <div className="p-4 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-center text-[11px] text-neutral-400 mb-1">
                        <span className="truncate max-w-[120px]" title={posterName}>Par : <strong className="text-neutral-300">{posterName}</strong></span>
                        <div className="flex items-center gap-1">
                          <MapPin size={12} />
                          <span>Bukavu</span>
                        </div>
                      </div>
                      <h3 className="font-bold text-sm mb-2 truncate">{title}</h3>
                      
                      {/* Affichage de la quantité */}
                      <div className={`flex items-center gap-1.5 text-[11px] font-semibold mb-3 ${darkMode ? 'text-neutral-400' : 'text-neutral-600'}`}>
                        <Layers size={13} className="text-orange-500" />
                        <span>Quantité : <strong className={darkMode ? 'text-neutral-200' : 'text-neutral-800'}>{quantityDisplay}</strong></span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 mb-3 pt-2 border-t border-neutral-800/60">
                      <button 
                        onClick={() => handleProtectedAction(logisticRoute)}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-neutral-800 hover:bg-orange-600 text-neutral-200 hover:text-white py-1.5 px-3 rounded-xl text-xs font-semibold transition cursor-pointer border border-neutral-700"
                        title="Contacter le logisticien"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Msg (Logistique)</span>
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-base font-black text-orange-500">{priceUSD}</span>
                        {priceCDF && <span className="text-[10px] text-neutral-400 font-semibold">{priceCDF}</span>}
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
      </main>
    </div>
  );
}