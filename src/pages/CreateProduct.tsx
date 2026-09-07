import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, ArrowLeft, Check, Sparkles, ShoppingBag, Sun, Moon, ArrowRight } from 'lucide-react';
import { apiFetch } from '../api/client';

const EXCHANGE_RATE = 2300; // 1 USD = 2300 CDF

interface Category {
  id: string;
  name: string;
}

// Compression d'image
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
            const compressedFile = File ? new File([blob], file.name, { type: 'image/jpeg', lastModified: Date.now() }) : file;
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
  const [isDarkMode, setIsDarkMode] = useState(true);

  // Étapes de l'assistant (Step-by-step)
  // 1: Choix (Vendre / Acheter)
  // 2: Nom du produit / Titre
  // 3: Catégorie
  // 4: Prix & Devise (USD / CDF)
  // 5: Quantité & État (si vente)
  // 6: Description
  // 7: Images
  const [currentStep, setCurrentStep] = useState<number>(1);

  const [postType, setPostType] = useState<'SALE' | 'REQUEST'>('SALE');
  const [title, setTitle] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState('');
  
  const [currency, setCurrency] = useState<'USD' | 'CDF'>('USD');
  const [amountInput, setAmountInput] = useState('');
  const [priceUSD, setPriceUSD] = useState(0);
  const [priceCDF, setPriceCDF] = useState(0);

  const [quantity, setQuantity] = useState('1');
  const [itemState, setItemState] = useState('NEW');
  const [description, setDescription] = useState('');

  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

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

  const handleSubmit = async () => {
    if (imageFiles.length < 2) {
      setError("Veuillez ajouter au moins 2 images obligatoires.");
      return;
    }

    setLoading(true);
    setError('');

    const token = localStorage.getItem('token');
    if (!token) {
      setError("Session expirée.");
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
      setError(err.message || "Erreur lors de l'enregistrement.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 px-4 py-6 flex flex-col justify-between items-center relative ${
      isDarkMode ? 'bg-[#0a0a0c] text-slate-100' : 'bg-slate-50 text-slate-900'
    }`}>
      {/* Barre supérieure minimaliste */}
      <div className="w-full max-w-xl flex justify-between items-center">
        {currentStep > 1 ? (
          <button 
            onClick={() => { setError(''); setCurrentStep(currentStep - 1); }}
            className={`text-xs font-semibold flex items-center gap-1 transition ${isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'}`}
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Précédent
          </button>
        ) : (
          <Link to="/" className={`text-xs font-semibold transition ${isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'}`}>
            <ArrowLeft className="w-3.5 h-3.5 inline mr-1" /> Accueil
          </Link>
        )}

        <button
          onClick={() => setIsDarkMode(!isDarkMode)}
          className={`p-2 rounded-full transition ${isDarkMode ? 'text-amber-400 hover:bg-slate-800/50' : 'text-slate-700 hover:bg-slate-200'}`}
        >
          {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>

      {/* Contenu central fluide (Type assistant textuel, sans cadres lourds) */}
      <div className="w-full max-w-md my-auto py-8">
        {error && <div className="mb-4 text-center text-xs text-red-500 font-semibold">{error}</div>}
        {success && <div className="mb-4 text-center text-xs text-emerald-500 font-semibold">Publication réussie ! Redirection...</div>}

        <AnimatePresence mode="wait">
          {/* ÉTAPE 1 : Choix Vendre ou Chercher */}
          {currentStep === 1 && (
            <motion.div 
              key="step1"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="text-center space-y-6"
            >
              <h1 className="text-xl sm:text-2xl font-black tracking-tight">
                Que souhaitez-vous faire ?
              </h1>
              <div className="flex flex-col gap-3 pt-2">
                <button
                  onClick={() => { setPostType('SALE'); setCurrentStep(2); }}
                  className={`w-full py-4 px-6 rounded-2xl font-bold text-sm flex items-center justify-between transition cursor-pointer ${
                    isDarkMode ? 'bg-slate-900 text-white hover:bg-slate-800 border border-slate-800' : 'bg-white text-slate-900 hover:bg-slate-100 border border-slate-200 shadow-sm'
                  }`}
                >
                  <span className="flex items-center gap-2"><ShoppingBag className="w-4 h-4 text-orange-500" /> Vendre un produit</span>
                  <ArrowRight className="w-4 h-4 text-slate-500" />
                </button>

                <button
                  onClick={() => { setPostType('REQUEST'); setCurrentStep(2); }}
                  className={`w-full py-4 px-6 rounded-2xl font-bold text-sm flex items-center justify-between transition cursor-pointer ${
                    isDarkMode ? 'bg-slate-900 text-white hover:bg-slate-800 border border-slate-800' : 'bg-white text-slate-900 hover:bg-slate-100 border border-slate-200 shadow-sm'
                  }`}
                >
                  <span className="flex items-center gap-2"><Sparkles className="w-4 h-4 text-blue-500" /> Chercher un produit</span>
                  <ArrowRight className="w-4 h-4 text-slate-500" />
                </button>
              </div>
            </motion.div>
          )}

          {/* ÉTAPE 2 : Nom / Titre du produit */}
          {currentStep === 2 && (
            <motion.div 
              key="step2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="text-center space-y-6"
            >
              <h1 className="text-xl sm:text-2xl font-black tracking-tight">
                {postType === 'SALE' ? 'Quel produit vendez-vous ?' : 'Quel produit cherchez-vous ?'}
              </h1>
              <div className="space-y-3">
                <input 
                  type="text" 
                  autoFocus
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={postType === 'SALE' ? "Ex: iPhone 13 Pro 128Go" : "Ex: Recherche moto Haojue bon état"}
                  className={`w-full text-center bg-transparent border-b-2 py-3 text-base sm:text-lg font-bold outline-none transition ${
                    isDarkMode ? 'border-slate-700 text-white focus:border-orange-500' : 'border-slate-300 text-slate-900 focus:border-orange-600'
                  }`}
                />
                <button
                  disabled={!title.trim()}
                  onClick={() => setCurrentStep(3)}
                  className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold py-3.5 rounded-2xl transition disabled:opacity-40 text-xs mt-4 cursor-pointer"
                >
                  Continuer
                </button>
              </div>
            </motion.div>
          )}

          {/* ÉTAPE 3 : Catégorie (Sélection claire) */}
          {currentStep === 3 && (
            <motion.div 
              key="step3"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="text-center space-y-6"
            >
              <h1 className="text-xl sm:text-2xl font-black tracking-tight">
                Choisissez la catégorie
              </h1>
              <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto px-1">
                {categories.map((cat) => {
                  const isSelected = categoryId === cat.id;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setCategoryId(cat.id)}
                      className={`py-3 px-4 rounded-xl text-xs font-bold transition flex items-center justify-between cursor-pointer ${
                        isSelected 
                          ? 'bg-orange-600 text-white shadow-md' 
                          : isDarkMode ? 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800' : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                      }`}
                    >
                      <span className="truncate">{cat.name}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 shrink-0 ml-1" />}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => setCurrentStep(4)}
                className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold py-3.5 rounded-2xl transition text-xs cursor-pointer mt-4"
              >
                Continuer
              </button>
            </motion.div>
          )}

          {/* ÉTAPE 4 : Prix ou Budget */}
          {currentStep === 4 && (
            <motion.div 
              key="step4"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="text-center space-y-6"
            >
              <h1 className="text-xl sm:text-2xl font-black tracking-tight">
                {postType === 'SALE' ? 'Quel est son prix unitaire ?' : 'Quel est votre budget estimé ?'}
              </h1>
              <div className="space-y-4">
                <div className="flex justify-center gap-2">
                  <button 
                    type="button" 
                    onClick={() => toggleCurrency('USD')} 
                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition ${currency === 'USD' ? 'bg-orange-600 text-white' : isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}
                  >
                    USD ($)
                  </button>
                  <button 
                    type="button" 
                    onClick={() => toggleCurrency('CDF')} 
                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition ${currency === 'CDF' ? 'bg-orange-600 text-white' : isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}
                  >
                    CDF (Francs)
                  </button>
                </div>
                <input 
                  type="number" 
                  step="any"
                  autoFocus
                  value={amountInput}
                  onChange={(e) => handleAmountChange(e.target.value)}
                  placeholder="0.00"
                  className={`w-full text-center bg-transparent border-b-2 py-3 text-2xl font-black outline-none transition ${
                    isDarkMode ? 'border-slate-700 text-white focus:border-orange-500' : 'border-slate-300 text-slate-900 focus:border-orange-600'
                  }`}
                />
                <button
                  disabled={!amountInput}
                  onClick={() => setCurrentStep(postType === 'SALE' ? 5 : 6)}
                  className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold py-3.5 rounded-2xl transition disabled:opacity-40 text-xs cursor-pointer mt-4"
                >
                  Continuer
                </button>
              </div>
            </motion.div>
          )}

          {/* ÉTAPE 5 : Quantité et État (Uniquement pour la Vente) */}
          {currentStep === 5 && postType === 'SALE' && (
            <motion.div 
              key="step5"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="text-center space-y-6"
            >
              <h1 className="text-xl sm:text-2xl font-black tracking-tight">
                Quantité et état du produit
              </h1>
              <div className="space-y-4 text-left">
                <div>
                  <label className={`block text-[10px] uppercase font-bold tracking-wider mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Quantité disponible</label>
                  <input 
                    type="number" 
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className={`w-full p-3 rounded-xl border text-xs font-bold outline-none ${isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-300'}`}
                  />
                </div>
                <div>
                  <label className={`block text-[10px] uppercase font-bold tracking-wider mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>État</label>
                  <select 
                    value={itemState}
                    onChange={(e) => setItemState(e.target.value)}
                    className={`w-full p-3 rounded-xl border text-xs font-bold outline-none cursor-pointer ${isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-300'}`}
                  >
                    <option value="NEW">Neuf</option>
                    <option value="LIKE_NEW">Comme neuf</option>
                    <option value="GOOD">Bon état</option>
                    <option value="ACCEPTABLE">Acceptable</option>
                  </select>
                </div>
                <button
                  onClick={() => setCurrentStep(6)}
                  className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold py-3.5 rounded-2xl transition text-xs cursor-pointer mt-4"
                >
                  Continuer
                </button>
              </div>
            </motion.div>
          )}

          {/* ÉTAPE 6 : Description */}
          {currentStep === 6 && (
            <motion.div 
              key="step6"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="text-center space-y-6"
            >
              <h1 className="text-xl sm:text-2xl font-black tracking-tight">
                Ajoutez une description
              </h1>
              <div className="space-y-4">
                <textarea 
                  rows={3}
                  autoFocus
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Donnez plus de détails..."
                  className={`w-full p-4 rounded-2xl border text-xs outline-none resize-none transition ${
                    isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-300 text-slate-900'
                  }`}
                />
                <button
                  disabled={!description.trim()}
                  onClick={() => setCurrentStep(7)}
                  className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold py-3.5 rounded-2xl transition disabled:opacity-40 text-xs cursor-pointer"
                >
                  Continuer vers les photos
                </button>
              </div>
            </motion.div>
          )}

          {/* ÉTAPE 7 : Images */}
          {currentStep === 7 && (
            <motion.div 
              key="step7"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="text-center space-y-6"
            >
              <h1 className="text-xl sm:text-2xl font-black tracking-tight">
                Ajoutez au moins 2 photos
              </h1>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-2">
                  {imagePreviews.map((src, idx) => (
                    <div key={idx} className="relative h-20 rounded-xl overflow-hidden border border-slate-700">
                      <img src={src} alt="Preview" className="w-full h-full object-cover" />
                      <button onClick={() => removeImage(idx)} className="absolute top-1 right-1 bg-red-600 text-white p-1 rounded-full">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  {imageFiles.length < 5 && (
                    <label className={`h-20 border border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition ${
                      isDarkMode ? 'border-slate-700 text-slate-400 hover:border-orange-500' : 'border-slate-400 text-slate-600 hover:border-orange-600'
                    }`}>
                      <Upload className="w-4 h-4 text-orange-500 mb-1" />
                      <span className="text-[10px]">Photo</span>
                      <input type="file" accept="image/*" multiple onChange={handleImageChange} className="hidden" />
                    </label>
                  )}
                </div>

                <p className="text-[11px] text-amber-500 font-medium">
                  {imageFiles.length < 2 ? `Encore ${2 - imageFiles.length} photo(s) requise(s)` : 'Photos prêtes !'}
                </p>

                <button
                  disabled={loading || imageFiles.length < 2}
                  onClick={handleSubmit}
                  className="w-full bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-extrabold py-3.5 rounded-2xl transition disabled:opacity-40 text-xs cursor-pointer flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Publication en cours...</span>
                    </>
                  ) : (
                    'Publier maintenant'
                  )}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Indicateur d'étape minimaliste en bas */}
      <div className={`text-[10px] font-bold tracking-widest uppercase ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
        Étape {currentStep} sur {postType === 'SALE' ? 7 : 6}
      </div>
    </div>
  );
}