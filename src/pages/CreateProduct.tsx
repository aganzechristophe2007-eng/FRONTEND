import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, ArrowLeft, PlusCircle, CheckCircle2, Sparkles, Tag, DollarSign, Hash, Layers, Sun, Moon } from 'lucide-react';
import { apiFetch } from '../api/client';

const EXCHANGE_RATE = 2300; // 1 USD = 2300 CDF

interface Category {
  id: string;
  name: string;
}

export default function CreateProduct() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Gestion du thème (Sombre par défaut)
  const [isDarkMode, setIsDarkMode] = useState(true);

  const [postType, setPostType] = useState<'SALE' | 'REQUEST'>('SALE');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState('1');
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState('');
  
  const [currency, setCurrency] = useState<'USD' | 'CDF'>('USD');
  const [amountInput, setAmountInput] = useState('');
  const [priceUSD, setPriceUSD] = useState(0);
  const [priceCDF, setPriceCDF] = useState(0);
  
  const [itemState, setItemState] = useState('NEW');

  // Harmonisation au pluriel pour correspondre à Prisma (images String[])
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login?redirect=/create-product');
      return;
    }

    const fetchCategories = async () => {
      try {
        const data = await apiFetch('/categories');
        const list = Array.isArray(data) ? data : (data.data || []);
        setCategories(list);
        if (list.length > 0 && !categoryId) {
          setCategoryId(list[0].id);
        }
      } catch (err) {
        setError("Erreur lors du chargement des catégories.");
      }
    };

    fetchCategories();
  }, [navigate, categoryId]);

  const handleAmountChange = (value: string) => {
    setAmountInput(value);
    const num = parseFloat(value) || 0;
    if (currency === 'USD') {
      setPriceUSD(num);
      setPriceCDF(num * EXCHANGE_RATE);
    } else {
      setPriceCDF(num);
      setPriceUSD(num / EXCHANGE_RATE);
    }
  };

  const toggleCurrency = (newCurrency: 'USD' | 'CDF') => {
    setCurrency(newCurrency);
    const num = parseFloat(amountInput) || 0;
    if (newCurrency === 'USD') {
      setPriceUSD(num);
      setPriceCDF(num * EXCHANGE_RATE);
    } else {
      setPriceCDF(num);
      setPriceUSD(num / EXCHANGE_RATE);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!categoryId) {
      setError("Veuillez sélectionner une catégorie.");
      return;
    }

    setLoading(true);

    const token = localStorage.getItem('token');
    if (!token) {
      setError("Session expirée. Veuillez vous reconnecter.");
      setLoading(false);
      navigate('/login');
      return;
    }

    try {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      const formData = new FormData();
      formData.append('type', postType);
      formData.append('title', postType === 'REQUEST' ? `[DEMANDE] ${title}` : title);
      formData.append('description', description);
      formData.append('categoryId', categoryId);
      formData.append('quantity', quantity);
      formData.append('durationMode', 'FREE_24H');
      formData.append('expiresAt', expiresAt.toISOString());
      formData.append('priceUSD', Number(priceUSD.toFixed(2)).toString());
      formData.append('priceCDF', Number(priceCDF.toFixed(2)).toString());

      if (postType === 'SALE') {
        formData.append('state', itemState);
        formData.append('isSold', 'false');
      }

      // Envoi sous la clé 'images' (au pluriel) attendue par le contrôleur et Multer
      if (imageFile) {
        formData.append('images', imageFile);
      }

      await apiFetch('/products', {
        method: 'POST',
        body: formData,
      });

      setSuccess(true);
      setTimeout(() => {
        navigate(postType === 'REQUEST' ? '/admin/dashboard' : '/products');
      }, 1500);

    } catch (err: any) {
      setError(err.message || "Une erreur est survenue lors de l'enregistrement.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 py-10 px-4 flex items-center justify-center relative overflow-hidden ${
      isDarkMode ? 'bg-[#0a0a0c] text-slate-100' : 'bg-slate-100 text-slate-900'
    }`}>
      <motion.div 
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4 }}
        className={`max-w-xl w-full backdrop-blur-xl border rounded-3xl p-6 sm:p-8 shadow-2xl relative z-10 transition-colors duration-300 ${
          isDarkMode 
            ? 'bg-slate-900/85 border-slate-800/80 shadow-black/50' 
            : 'bg-white/90 border-slate-200 shadow-slate-300/50'
        }`}
      >
        <div className={`flex justify-between items-center mb-6 pb-4 border-b ${isDarkMode ? 'border-slate-800/80' : 'border-slate-200'}`}>
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-2xl border ${isDarkMode ? 'bg-orange-500/10 text-orange-500 border-orange-500/20' : 'bg-orange-50 text-orange-600 border-orange-200'}`}>
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-black tracking-tight">
                {postType === 'SALE' ? 'Mettre un article en vente' : 'Formuler une recherche'}
              </h1>
              <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Publiez gratuitement sur CBFSOKO</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsDarkMode(!isDarkMode)}
              className={`p-2 rounded-xl border transition cursor-pointer ${
                isDarkMode 
                  ? 'bg-slate-800/50 border-slate-700/50 text-amber-400 hover:bg-slate-800' 
                  : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
              }`}
              title="Changer de thème"
            >
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <Link 
              to="/" 
              className={`text-xs font-semibold flex items-center gap-1.5 px-3 py-2 rounded-xl border transition ${
                isDarkMode 
                  ? 'bg-slate-800/50 text-slate-400 hover:text-white border-slate-700/50' 
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900 border-slate-200'
              }`}
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Retour
            </Link>
          </div>
        </div>

        <div className={`grid grid-cols-2 gap-2 mb-6 p-1 rounded-2xl border ${isDarkMode ? 'bg-slate-950/80 border-slate-800/80' : 'bg-slate-200/60 border-slate-300'}`}>
          <button
            type="button"
            onClick={() => setPostType('SALE')}
            className={`py-2.5 rounded-xl font-bold text-xs transition cursor-pointer flex items-center justify-center gap-2 ${
              postType === 'SALE' ? 'bg-orange-600 text-white shadow-lg' : isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Tag className="w-3.5 h-3.5" /> Mise en vente
          </button>
          <button
            type="button"
            onClick={() => setPostType('REQUEST')}
            className={`py-2.5 rounded-xl font-bold text-xs transition cursor-pointer flex items-center justify-center gap-2 ${
              postType === 'REQUEST' ? 'bg-orange-600 text-white shadow-lg' : isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" /> Recherche
          </button>
        </div>

        {error && <div className="mb-5 p-3.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl text-xs">{error}</div>}
        {success && <div className="mb-5 p-3.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl text-xs">Publication enregistrée avec succès !</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Titre</label>
            <input 
              type="text" 
              required 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Infinix Hot 30 128Go"
              className={`w-full border rounded-xl px-4 py-3 outline-none text-xs sm:text-sm transition ${
                isDarkMode 
                  ? 'bg-slate-950/70 border-slate-800 text-white focus:border-orange-500' 
                  : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-orange-600'
              }`}
            />
          </div>

          <div>
            <label className={`block text-[11px] font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              <Layers className="w-3.5 h-3.5 text-orange-500" /> Choisir une catégorie
            </label>
            <div className={`grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-2 border rounded-2xl ${
              isDarkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-100 border-slate-300'
            }`}>
              {categories.map((cat) => {
                const isSelected = categoryId === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategoryId(cat.id)}
                    className={`p-3 rounded-xl border text-xs font-semibold transition text-left flex items-center justify-between cursor-pointer ${
                      isSelected 
                        ? 'bg-orange-600/20 border-orange-500 text-orange-500 shadow-sm' 
                        : isDarkMode 
                          ? 'bg-slate-900/50 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200' 
                          : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-900'
                    }`}
                  >
                    <span className="truncate">{cat.name}</span>
                    {isSelected && <CheckCircle2 className="w-4 h-4 text-orange-500 shrink-0 ml-1" />}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                <Hash className="w-3.5 h-3.5 text-orange-500" /> Quantité
              </label>
              <input 
                type="number" 
                min="1"
                required
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className={`w-full border rounded-xl px-4 py-3 outline-none text-xs sm:text-sm font-bold transition ${
                  isDarkMode 
                    ? 'bg-slate-950/70 border-slate-800 text-white focus:border-orange-500' 
                    : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-orange-600'
                }`}
              />
            </div>

            {postType === 'SALE' && (
              <div>
                <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>État de l'article</label>
                <select 
                  value={itemState}
                  onChange={(e) => setItemState(e.target.value)}
                  className={`w-full border rounded-xl px-4 py-3 outline-none text-xs sm:text-sm cursor-pointer font-medium transition ${
                    isDarkMode 
                      ? 'bg-slate-950/70 border-slate-800 text-white focus:border-orange-500' 
                      : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-orange-600'
                  }`}
                >
                  <option value="NEW">Neuf</option>
                  <option value="LIKE_NEW">Comme neuf</option>
                  <option value="GOOD">Bon état</option>
                  <option value="ACCEPTABLE">Acceptable</option>
                </select>
              </div>
            )}
          </div>

          <div className={`space-y-3 p-4 border rounded-2xl ${isDarkMode ? 'bg-slate-950/60 border-slate-800/80' : 'bg-slate-100/60 border-slate-300'}`}>
            <div className="flex justify-between items-center">
              <label className={`block text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                <DollarSign className="w-3.5 h-3.5 text-orange-500" /> Prix unitaire
              </label>
              <div className={`flex p-1 rounded-xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                <button type="button" onClick={() => toggleCurrency('USD')} className={`px-3 py-1 rounded-lg text-xs font-bold transition ${currency === 'USD' ? 'bg-orange-600 text-white' : 'text-slate-400'}`}>USD</button>
                <button type="button" onClick={() => toggleCurrency('CDF')} className={`px-3 py-1 rounded-lg text-xs font-bold transition ${currency === 'CDF' ? 'bg-orange-600 text-white' : 'text-slate-400'}`}>CDF</button>
              </div>
            </div>
            <input 
              type="number" 
              step="any"
              value={amountInput}
              onChange={(e) => handleAmountChange(e.target.value)}
              placeholder="Montant"
              className={`w-full border rounded-xl px-4 py-3 outline-none text-sm font-bold transition ${
                isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-300 text-slate-900'
              }`}
            />
          </div>

          <div>
            <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Description</label>
            <textarea 
              rows={3}
              required 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Détails du produit..."
              className={`w-full border rounded-xl p-4 outline-none resize-none text-xs sm:text-sm transition ${
                isDarkMode 
                  ? 'bg-slate-950/70 border-slate-800 text-white focus:border-orange-500' 
                  : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-orange-600'
              }`}
            />
          </div>

          <div>
            <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Image</label>
            {imagePreview ? (
              <div className={`relative h-[46px] border rounded-xl flex items-center px-3 justify-between ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-300'}`}>
                <span className="text-xs text-emerald-400 font-medium truncate">Fichier prêt</span>
                <button type="button" onClick={() => { setImageFile(null); setImagePreview(''); }} className={`p-1 rounded-lg transition ${isDarkMode ? 'text-slate-400 hover:text-white bg-slate-800' : 'text-slate-600 hover:text-slate-900 bg-slate-200'}`}><X className="w-3.5 h-3.5" /></button>
              </div>
            ) : (
              <label className={`w-full h-[46px] border border-dashed rounded-xl flex items-center justify-center gap-2 cursor-pointer transition ${
                isDarkMode ? 'border-slate-700 hover:border-orange-500 bg-slate-950/70 text-slate-400' : 'border-slate-400 hover:border-orange-600 bg-slate-50 text-slate-600'
              }`}>
                <Upload className="w-4 h-4 text-orange-500" />
                <span className="text-xs font-medium">Ajouter une image</span>
                <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
              </label>
            )}
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-extrabold py-3.5 rounded-xl transition shadow-lg cursor-pointer disabled:opacity-50 text-xs sm:text-sm flex items-center justify-center gap-2"
          >
            {loading ? 'Traitement...' : 'Publier l\'annonce'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}