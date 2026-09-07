import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Upload, X, ArrowLeft, PlusCircle, CheckCircle2, Sparkles, Tag, DollarSign, Hash, Layers, Sun, Moon } from 'lucide-react';
import { apiFetch } from '../api/client';

const EXCHANGE_RATE = 2300; // 1 USD = 2300 CDF

interface Category {
  id: string;
  name: string;
}

// Fonction utilitaire pour compresser l'image avant l'envoi
const compressImage = (file: File): Promise<File> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1000;
        const MAX_HEIGHT = 1000;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        canvas.toBlob((blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          } else {
            resolve(file);
          }
        }, 'image/jpeg', 0.8);
      };
    };
  });
};

export default function CreateProduct() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

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

  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

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
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const totalFiles = [...imageFiles, ...files];
    if (totalFiles.length > 5) {
      setError("Maximum 5 images autorisées.");
      return;
    }

    setError('');
    setImageFiles(totalFiles);
    const newPreviews = files.map(file => URL.createObjectURL(file));
    setImagePreviews(prev => [...prev, ...newPreviews]);
  };

  const removeImage = (index: number) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!categoryId) {
      setError("Veuillez sélectionner une catégorie.");
      return;
    }

    if (imageFiles.length < 2) {
      setError("Veuillez ajouter au moins 2 images obligatoires (maximum 5).");
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

      for (const file of imageFiles) {
        const optimizedFile = await compressImage(file);
        formData.append('images', optimizedFile);
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
    <div className={`min-h-screen transition-colors duration-300 py-2 px-2 sm:py-8 sm:px-4 flex items-center justify-center relative overflow-x-hidden ${
      isDarkMode ? 'bg-[#0a0a0c] text-slate-100' : 'bg-slate-100 text-slate-900'
    }`}>
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className={`w-full max-w-xl backdrop-blur-xl border rounded-2xl sm:rounded-3xl p-3.5 sm:p-6 shadow-xl relative z-10 transition-colors duration-300 ${
          isDarkMode 
            ? 'bg-slate-900/95 border-slate-800 shadow-black/60' 
            : 'bg-white border-slate-200 shadow-slate-300/40'
        }`}
      >
        {/* En-tête compact */}
        <div className={`flex justify-between items-center mb-4 pb-3 border-b ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl border ${isDarkMode ? 'bg-orange-500/10 text-orange-500 border-orange-500/20' : 'bg-orange-50 text-orange-600 border-orange-200'}`}>
              <PlusCircle className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-xs sm:text-sm font-black tracking-tight">
                {postType === 'SALE' ? 'Mettre en vente' : 'Formuler une recherche'}
              </h1>
              <p className={`text-[10px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>CBFSOKO Gratuit</p>
            </div>
          </div>
          
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setIsDarkMode(!isDarkMode)}
              className={`p-1.5 rounded-xl border transition cursor-pointer ${
                isDarkMode 
                  ? 'bg-slate-800/50 border-slate-700 text-amber-400 hover:bg-slate-800' 
                  : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
              }`}
              title="Changer de thème"
            >
              {isDarkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </button>
            <Link 
              to="/" 
              className={`text-[11px] font-semibold flex items-center gap-1 px-2.5 py-1.5 rounded-xl border transition ${
                isDarkMode 
                  ? 'bg-slate-800/50 text-slate-400 hover:text-white border-slate-700' 
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900 border-slate-200'
              }`}
            >
              <ArrowLeft className="w-3 h-3" /> Retour
            </Link>
          </div>
        </div>

        {/* Sélecteur de type d'annonce */}
        <div className={`grid grid-cols-2 gap-1.5 mb-4 p-1 rounded-xl border ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-200 border-slate-300'}`}>
          <button
            type="button"
            onClick={() => setPostType('SALE')}
            className={`py-2 rounded-lg font-bold text-[11px] transition cursor-pointer flex items-center justify-center gap-1.5 ${
              postType === 'SALE' ? 'bg-orange-600 text-white shadow-md' : isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Tag className="w-3 h-3" /> Vente
          </button>
          <button
            type="button"
            onClick={() => setPostType('REQUEST')}
            className={`py-2 rounded-lg font-bold text-[11px] transition cursor-pointer flex items-center justify-center gap-1.5 ${
              postType === 'REQUEST' ? 'bg-orange-600 text-white shadow-md' : isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-3 h-3" /> Recherche
          </button>
        </div>

        {error && <div className="mb-3 p-2.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl text-[11px]">{error}</div>}
        {success && <div className="mb-3 p-2.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl text-[11px]">Publication enregistrée ! Redirection...</div>}

        <form onSubmit={handleSubmit} className="space-y-3 pb-4">
          <div>
            <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Titre</label>
            <input 
              type="text" 
              required 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Infinix Hot 30 128Go"
              className={`w-full border rounded-xl px-3 py-2.5 outline-none text-xs transition ${
                isDarkMode 
                  ? 'bg-slate-950 border-slate-800 text-white focus:border-orange-500' 
                  : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-orange-600'
              }`}
            />
          </div>

          <div>
            <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              <Layers className="w-3 h-3 text-orange-500" /> Catégorie
            </label>
            <div className={`grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto p-1.5 border rounded-xl ${
              isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-300'
            }`}>
              {categories.map((cat) => {
                const isSelected = categoryId === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategoryId(cat.id)}
                    className={`p-2 rounded-lg border text-[11px] font-semibold transition text-left flex items-center justify-between cursor-pointer ${
                      isSelected 
                        ? 'bg-orange-600/20 border-orange-500 text-orange-400' 
                        : isDarkMode 
                          ? 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200' 
                          : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <span className="truncate">{cat.name}</span>
                    {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-orange-500 shrink-0 ml-1" />}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1 flex items-center gap-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                <Hash className="w-3 h-3 text-orange-500" /> Quantité
              </label>
              <input 
                type="number" 
                min="1"
                required
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className={`w-full border rounded-xl px-3 py-2.5 outline-none text-xs font-bold transition ${
                  isDarkMode ? 'bg-slate-950 border-slate-800 text-white focus:border-orange-500' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-orange-600'
                }`}
              />
            </div>

            {postType === 'SALE' && (
              <div>
                <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>État</label>
                <select 
                  value={itemState}
                  onChange={(e) => setItemState(e.target.value)}
                  className={`w-full border rounded-xl px-3 py-2.5 outline-none text-xs cursor-pointer font-medium transition ${
                    isDarkMode ? 'bg-slate-950 border-slate-800 text-white focus:border-orange-500' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-orange-600'
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

          <div className={`space-y-2 p-3 border rounded-xl ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-300'}`}>
            <div className="flex justify-between items-center">
              <label className={`block text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                <DollarSign className="w-3 h-3 text-orange-500" /> Prix unitaire
              </label>
              <div className={`flex p-0.5 rounded-lg border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                <button type="button" onClick={() => toggleCurrency('USD')} className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition ${currency === 'USD' ? 'bg-orange-600 text-white' : 'text-slate-400'}`}>USD</button>
                <button type="button" onClick={() => toggleCurrency('CDF')} className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition ${currency === 'CDF' ? 'bg-orange-600 text-white' : 'text-slate-400'}`}>CDF</button>
              </div>
            </div>
            <input 
              type="number" 
              step="any"
              value={amountInput}
              onChange={(e) => handleAmountChange(e.target.value)}
              placeholder="Montant"
              className={`w-full border rounded-xl px-3 py-2.5 outline-none text-xs font-bold transition ${
                isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-300 text-slate-900'
              }`}
            />
          </div>

          <div>
            <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Description</label>
            <textarea 
              rows={2}
              required 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Détails du produit..."
              className={`w-full border rounded-xl p-3 outline-none resize-none text-xs transition ${
                isDarkMode ? 'bg-slate-950 border-slate-800 text-white focus:border-orange-500' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-orange-600'
              }`}
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className={`text-[10px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                Images (Min. 2, Max. 5)
              </label>
              <span className="text-[10px] font-semibold text-orange-500">
                {imageFiles.length}/5
              </span>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-2">
              {imagePreviews.map((src, index) => (
                <div key={index} className={`relative h-20 border rounded-xl overflow-hidden flex items-center justify-center ${isDarkMode ? 'border-slate-800 bg-slate-950' : 'border-slate-300 bg-slate-100'}`}>
                  <img src={src} alt={`Preview ${index}`} className="w-full h-full object-cover" />
                  <button 
                    type="button" 
                    onClick={() => removeImage(index)} 
                    className="absolute top-1 right-1 p-1 rounded-full bg-red-600 text-white shadow"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}

              {imageFiles.length < 5 && (
                <label className={`h-20 border border-dashed rounded-xl flex flex-col items-center justify-center gap-1 cursor-pointer transition ${
                  isDarkMode ? 'border-slate-700 hover:border-orange-500 bg-slate-950 text-slate-400' : 'border-slate-400 hover:border-orange-600 bg-slate-50 text-slate-600'
                }`}>
                  <Upload className="w-4 h-4 text-orange-500" />
                  <span className="text-[10px] font-medium">Ajouter</span>
                  <input type="file" accept="image/*" multiple onChange={handleImageChange} className="hidden" />
                </label>
              )}
            </div>
            {imageFiles.length < 2 && (
              <p className="text-[10px] text-amber-500 font-medium">Ajoutez encore {2 - imageFiles.length} photo(s) minimum.</p>
            )}
          </div>

          <button 
            type="submit" 
            disabled={loading || imageFiles.length < 2}
            className="w-full bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-extrabold py-3 rounded-xl transition shadow-md cursor-pointer disabled:opacity-50 text-xs flex items-center justify-center gap-2 mt-2"
          >
            {loading ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Compression & Envoi...</span>
              </>
            ) : (
              'Publier l\'annonce'
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
}