import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Sun, Moon, MapPin, ShieldCheck, MessageSquare, Wallet,
  Image as ImageIcon, ChevronLeft, ChevronRight, Package, Tag, Layers,
  Clock, Share2, X, Minus, Plus, Store, AlertCircle
} from 'lucide-react';
import { apiFetch } from '../api/client';

interface Seller {
  id?: string;
  _id?: string;
  name: string;
  email?: string;
  avatar?: string;
  phone?: string;
}

interface ProductDetail {
  id?: string;
  _id?: string;
  title: string;
  description?: string;
  priceUSD: number;
  priceCDF: number;
  category?: { name: string; id?: string; _id?: string } | string;
  images: string[];
  sellerId?: string;
  userId?: string;
  seller?: Seller;
  location?: string;
  state?: string;
  quantity?: number | string;
  type?: string;
  isDemande?: boolean;
  isSold?: boolean;
  createdAt?: string;
  expiresAt?: string;
}

const STATE_LABELS: Record<string, string> = {
  NEW: 'Neuf',
  LIKE_NEW: 'Comme neuf',
  GOOD: 'Bon état',
  ACCEPTABLE: 'Acceptable',
};

type TabKey = 'description' | 'details';

export default function ProductDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [darkMode, setDarkMode] = useState<boolean>(true);
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [activeImage, setActiveImage] = useState<number>(0);
  const [quantitySelected, setQuantitySelected] = useState<number>(1);
  const [showFullImage, setShowFullImage] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<TabKey>('description');

  const [similarProducts, setSimilarProducts] = useState<ProductDetail[]>([]);
  const [loadingSimilar, setLoadingSimilar] = useState<boolean>(true);

  const [token] = useState<string | null>(() => localStorage.getItem('token'));
  const [currentUserId, setCurrentUserId] = useState<string>('');

  const LOGO_URL = '/logo.png';

  const getImageUrl = useCallback((path?: string) => {
    if (!path) return 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80';
    if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('blob:') || path.startsWith('data:')) {
      return path;
    }
    const cleanPath = path.replace(/\\/g, '/').replace(/^\/+/, '');
    if (cleanPath.startsWith('uploads/')) {
      return `https://cbfsoko-backend.onrender.com/${cleanPath}`;
    }
    return `https://cbfsoko-backend.onrender.com/uploads/${cleanPath}`;
  }, []);

  useEffect(() => {
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const parsed = JSON.parse(userStr);
        setCurrentUserId(parsed.id || parsed._id || '');
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (!id) {
      setError("Produit introuvable.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    setActiveImage(0);
    setActiveTab('description');

    apiFetch(`/products/${id}`)
      .then((data) => {
        const p = data?.data || data;
        if (!p || (!p.id && !p._id)) {
          throw new Error('not-found');
        }
        setProduct(p);
      })
      .catch(() => {
        // Repli : si l'endpoint direct échoue, on cherche dans la liste globale
        apiFetch('/products')
          .then((data) => {
            const list = Array.isArray(data) ? data : (data.data || []);
            const found = list.find((p: ProductDetail) => (p.id || p._id) === id);
            if (found) {
              setProduct(found);
            } else {
              setError("Ce produit n'existe plus ou a été retiré.");
            }
          })
          .catch(() => setError("Impossible de charger ce produit."));
      })
      .finally(() => setLoading(false));
  }, [id]);

  // Produits similaires : même catégorie, produit courant exclu
  useEffect(() => {
    if (!product) return;

    const currentCategoryName = typeof product.category === 'object' && product.category !== null
      ? product.category.name
      : (typeof product.category === 'string' ? product.category : null);

    if (!currentCategoryName) {
      setSimilarProducts([]);
      setLoadingSimilar(false);
      return;
    }

    setLoadingSimilar(true);
    apiFetch('/products')
      .then((data) => {
        const list: ProductDetail[] = Array.isArray(data) ? data : (data.data || []);
        const currentId = product.id || product._id;
        const filtered = list.filter((p) => {
          const pId = p.id || p._id;
          if (pId === currentId) return false;
          const pCategoryName = typeof p.category === 'object' && p.category !== null
            ? p.category.name
            : (typeof p.category === 'string' ? p.category : null);
          return pCategoryName === currentCategoryName;
        });
        setSimilarProducts(filtered.slice(0, 4));
      })
      .catch(() => setSimilarProducts([]))
      .finally(() => setLoadingSimilar(false));
  }, [product]);

  const handleContactSeller = () => {
    if (!token) {
      navigate(`/login?redirect=/messages`);
      return;
    }
    const sellerId = product?.sellerId || product?.userId || product?.seller?.id || product?.seller?._id;
    navigate(`/messages${sellerId ? `?to=${sellerId}` : ''}`);
  };

  const handleBuyNow = () => {
    if (!token) {
      navigate(`/login?redirect=/products/${id}`);
      return;
    }
    navigate(`/orders?productId=${id}&quantity=${quantitySelected}`);
  };

  const handleShare = async () => {
    const shareUrl = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: product?.title || 'CBF SOKO', url: shareUrl });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      // annulé par l'utilisateur
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return "U";
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  const imagesList = useMemo(() => (Array.isArray(product?.images) ? product!.images : []), [product]);
  const isOwner = useMemo(() => {
    if (!product || !currentUserId) return false;
    const sellerId = product.sellerId || product.userId || product.seller?.id || product.seller?._id;
    return sellerId === currentUserId;
  }, [product, currentUserId]);

  const maxQuantity = useMemo(() => {
    const q = Number(product?.quantity);
    return Number.isFinite(q) && q > 0 ? q : 99;
  }, [product]);

  const nextImage = () => setActiveImage((prev) => (prev + 1) % imagesList.length);
  const prevImage = () => setActiveImage((prev) => (prev - 1 + imagesList.length) % imagesList.length);

  const prodCategory = typeof product?.category === 'object' && product?.category !== null
    ? product.category.name
    : (typeof product?.category === 'string' ? product.category : 'Général');

  const isRequest = product?.type === 'REQUEST' || product?.isDemande === true || String(product?.title || '').includes('[DEMANDE]');
  const displayTitle = product?.title ? product.title.replace('[DEMANDE] ', '') : '';

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-neutral-950 text-white' : 'bg-neutral-50 text-neutral-900'}`}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-neutral-500">Chargement du produit...</span>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center ${darkMode ? 'bg-neutral-950 text-white' : 'bg-neutral-50 text-neutral-900'}`}>
        <AlertCircle className="w-10 h-10 text-orange-500" />
        <h1 className="text-lg font-extrabold">{error || "Produit introuvable"}</h1>
        <p className="text-xs text-neutral-500 max-w-xs">Ce produit a peut-être expiré, a été supprimé, ou le lien est incorrect.</p>
        <Link to="/products" className="mt-2 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs px-5 py-2.5 rounded-full transition">
          Retour au catalogue
        </Link>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex flex-col pb-10 transition-colors duration-300 ${darkMode ? 'bg-neutral-950 text-white' : 'bg-neutral-50 text-neutral-900'}`}>

      {/* HEADER */}
      <header className={`sticky top-0 z-40 border-b px-4 sm:px-8 py-3 transition-colors ${
        darkMode ? 'bg-neutral-900/95 border-neutral-800 backdrop-blur-md' : 'bg-white/95 border-neutral-200 backdrop-blur-md'
      }`}>
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className={`flex items-center gap-1.5 text-xs font-bold transition ${darkMode ? 'text-neutral-300 hover:text-orange-500' : 'text-neutral-700 hover:text-orange-600'}`}
          >
            <ArrowLeft className="w-4 h-4" /> Retour
          </button>

          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-orange-600 rounded-lg flex items-center justify-center overflow-hidden shadow-md border border-orange-500">
              <img src={LOGO_URL} alt="CBF SOKO" className="w-full h-full object-cover" onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }} />
            </div>
            <span className="font-extrabold text-sm hidden sm:block">CBFSOKO</span>
          </Link>

          <div className="flex items-center gap-2">
            <button
              onClick={handleShare}
              className={`p-2 rounded-full border transition relative ${darkMode ? 'bg-neutral-950 border-neutral-800 hover:border-orange-500 text-neutral-300' : 'bg-white border-neutral-300 hover:border-orange-500 text-neutral-700'}`}
              title="Partager"
            >
              <Share2 className="w-4 h-4" />
              {copied && (
                <span className="absolute -bottom-7 right-0 bg-neutral-800 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap">Lien copié !</span>
              )}
            </button>
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`p-2 rounded-full border transition ${darkMode ? 'bg-neutral-950 border-neutral-800 text-yellow-400' : 'bg-white border-neutral-300 text-neutral-800'}`}
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4 text-orange-600" />}
            </button>
          </div>
        </div>
      </header>

      {/* Fil d'ariane simple */}
      <div className="max-w-6xl mx-auto w-full px-3 sm:px-6 pt-4 text-[11px] text-neutral-500 flex items-center gap-1.5">
        <Link to="/" className="hover:text-orange-500 transition">Accueil</Link>
        <span>/</span>
        <Link to="/products" className="hover:text-orange-500 transition">Catalogue</Link>
        <span>/</span>
        <span className={darkMode ? 'text-neutral-300' : 'text-neutral-700'}>{prodCategory}</span>
      </div>

      {/* BLOC PRINCIPAL PRODUIT */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-3 sm:px-6 py-6">
        <div className={`rounded-2xl border p-4 sm:p-6 ${darkMode ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-neutral-200'}`}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10">

            {/* GALERIE : miniatures + image principale, comme la capture */}
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Miniatures (verticales sur desktop, horizontales sur mobile) */}
              {imagesList.length > 1 && (
                <div className="flex sm:flex-col gap-2 order-2 sm:order-1 overflow-x-auto sm:overflow-visible">
                  {imagesList.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveImage(idx)}
                      className={`flex-shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden border-2 transition ${
                        activeImage === idx ? 'border-orange-500' : darkMode ? 'border-neutral-800' : 'border-neutral-200'
                      }`}
                    >
                      <img src={getImageUrl(img)} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}

              {/* Image principale */}
              <div className={`relative aspect-square w-full overflow-hidden rounded-2xl border order-1 sm:order-2 flex-1 cursor-zoom-in ${darkMode ? 'bg-neutral-950 border-neutral-800' : 'bg-neutral-50 border-neutral-200'}`}>
                {imagesList.length > 0 ? (
                  <img
                    src={getImageUrl(imagesList[activeImage])}
                    alt={displayTitle}
                    onClick={() => setShowFullImage(true)}
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80'; }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-neutral-600">
                    <ImageIcon className="w-10 h-10" />
                  </div>
                )}

                {isRequest && (
                  <span className="absolute top-3 left-3 bg-blue-600 text-white text-[10px] font-extrabold px-2.5 py-1 rounded-full shadow">
                    DEMANDE
                  </span>
                )}
                {product.isSold && (
                  <span className="absolute top-3 right-3 bg-red-600 text-white text-[10px] font-extrabold px-2.5 py-1 rounded-full shadow">
                    VENDU
                  </span>
                )}

                {imagesList.length > 1 && (
                  <>
                    <button
                      onClick={(e) => { e.stopPropagation(); prevImage(); }}
                      className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white p-1.5 rounded-full transition"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); nextImage(); }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white p-1.5 rounded-full transition"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    <span className="absolute bottom-3 right-3 bg-black/70 text-white text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1">
                      <ImageIcon className="w-3 h-3" /> {activeImage + 1}/{imagesList.length}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* INFOS PRODUIT */}
            <div className="flex flex-col gap-5">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide flex items-center gap-1 ${darkMode ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' : 'bg-orange-50 text-orange-600 border border-orange-200'}`}>
                    <Tag className="w-3 h-3" /> {prodCategory}
                  </span>
                  {product.state && !isRequest && (
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide ${darkMode ? 'bg-neutral-800 text-neutral-300' : 'bg-neutral-100 text-neutral-700'}`}>
                      {STATE_LABELS[product.state] || product.state}
                    </span>
                  )}
                </div>
                <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight leading-snug">{displayTitle}</h1>
                <div className="flex items-center gap-3 mt-2 text-[11px] text-neutral-500">
                  <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-orange-500" /> {product.location || 'Bukavu, RDC'}</span>
                  {product.createdAt && (
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(product.createdAt).toLocaleDateString('fr-FR')}</span>
                  )}
                </div>
              </div>

              {/* PRIX */}
              <div>
                <span className="text-[10px] uppercase font-bold tracking-widest text-neutral-500">
                  {isRequest ? 'Budget estimé' : 'Prix unitaire'}
                </span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl sm:text-3xl font-black text-orange-500">
                    {product.priceUSD > 0 ? `${product.priceUSD} $` : 'Sur demande'}
                  </span>
                </div>
                {product.priceCDF > 0 && (
                  <span className="text-xs text-neutral-500 font-medium">≈ {product.priceCDF.toLocaleString()} CDF</span>
                )}
              </div>

              {/* Quantité disponible + sélecteur (si vente) */}
              {!isRequest && (
                <div className={`rounded-2xl border p-4 flex items-center justify-between ${darkMode ? 'bg-neutral-950 border-neutral-800' : 'bg-neutral-50 border-neutral-200'}`}>
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-orange-500" />
                    <div>
                      <span className="block text-[10px] uppercase font-bold tracking-widest text-neutral-500">Quantité disponible</span>
                      <span className="text-sm font-bold">{product.quantity ?? '—'} unité(s)</span>
                    </div>
                  </div>

                  {!isOwner && !product.isSold && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setQuantitySelected((q) => Math.max(1, q - 1))}
                        className={`w-7 h-7 rounded-full border flex items-center justify-center transition ${darkMode ? 'border-neutral-700 hover:border-orange-500' : 'border-neutral-300 hover:border-orange-500'}`}
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-sm font-bold w-5 text-center">{quantitySelected}</span>
                      <button
                        onClick={() => setQuantitySelected((q) => Math.min(maxQuantity, q + 1))}
                        className={`w-7 h-7 rounded-full border flex items-center justify-center transition ${darkMode ? 'border-neutral-700 hover:border-orange-500' : 'border-neutral-300 hover:border-orange-500'}`}
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* VENDEUR */}
              <div className={`rounded-2xl border p-4 ${darkMode ? 'bg-neutral-950 border-neutral-800' : 'bg-neutral-50 border-neutral-200'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-orange-600 text-white font-bold text-sm flex items-center justify-center overflow-hidden flex-shrink-0">
                      {product.seller?.avatar ? (
                        <img src={getImageUrl(product.seller.avatar)} alt={product.seller.name} className="w-full h-full object-cover" onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }} />
                      ) : (
                        getInitials(product.seller?.name)
                      )}
                    </div>
                    <div>
                      <span className="block text-sm font-extrabold">{product.seller?.name || 'Vendeur CBF SOKO'}</span>
                      <span className="flex items-center gap-1 text-[11px] text-emerald-500 font-semibold">
                        <ShieldCheck className="w-3 h-3" /> Vendeur vérifié
                      </span>
                    </div>
                  </div>
                  <Store className="w-5 h-5 text-neutral-600" />
                </div>
              </div>

              {/* ACTIONS */}
              {!isOwner ? (
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={handleContactSeller}
                    className={`flex-1 flex items-center justify-center gap-2 font-bold text-xs py-3.5 rounded-2xl border transition cursor-pointer ${
                      darkMode ? 'bg-neutral-950 border-neutral-800 hover:border-orange-500 text-white' : 'bg-white border-neutral-300 hover:border-orange-500 text-neutral-900'
                    }`}
                  >
                    <MessageSquare className="w-4 h-4 text-orange-500" /> Contacter le vendeur
                  </button>

                  {!isRequest && !product.isSold && (
                    <button
                      onClick={handleBuyNow}
                      className="flex-1 flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs py-3.5 rounded-2xl transition shadow-md shadow-orange-600/20 cursor-pointer"
                    >
                      <Wallet className="w-4 h-4" /> Acheter maintenant
                    </button>
                  )}
                </div>
              ) : (
                <div className={`flex items-center gap-2 text-xs font-semibold px-4 py-3 rounded-2xl border ${darkMode ? 'bg-neutral-950 border-neutral-800 text-neutral-400' : 'bg-neutral-100 border-neutral-200 text-neutral-600'}`}>
                  <Package className="w-4 h-4 text-orange-500" /> C'est votre propre annonce.
                </div>
              )}

              {product.isSold && (
                <div className="flex items-center gap-2 text-xs font-semibold px-4 py-3 rounded-2xl border border-red-800 bg-red-950/30 text-red-400">
                  <AlertCircle className="w-4 h-4" /> Ce produit n'est plus disponible à la vente.
                </div>
              )}
            </div>
          </div>

          {/* ONGLETS : Description / Détails (comme la capture, sans avis puisque pas de système de reviews) */}
          <div className="mt-8 border-t pt-6 border-neutral-800/60">
            <div className="flex items-center gap-6 border-b border-neutral-800/60 mb-4">
              <button
                onClick={() => setActiveTab('description')}
                className={`pb-3 text-xs font-bold uppercase tracking-wide transition border-b-2 ${
                  activeTab === 'description'
                    ? 'border-orange-500 text-orange-500'
                    : 'border-transparent text-neutral-500 hover:text-neutral-300'
                }`}
              >
                Description
              </button>
              <button
                onClick={() => setActiveTab('details')}
                className={`pb-3 text-xs font-bold uppercase tracking-wide transition border-b-2 ${
                  activeTab === 'details'
                    ? 'border-orange-500 text-orange-500'
                    : 'border-transparent text-neutral-500 hover:text-neutral-300'
                }`}
              >
                Détails
              </button>
            </div>

            <AnimatePresence mode="wait">
              {activeTab === 'description' && (
                <motion.div
                  key="tab-description"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.15 }}
                >
                  <p className={`text-sm leading-relaxed whitespace-pre-line ${darkMode ? 'text-neutral-300' : 'text-neutral-700'}`}>
                    {product.description || "Aucune description fournie par le vendeur pour ce produit."}
                  </p>
                </motion.div>
              )}

              {activeTab === 'details' && (
                <motion.div
                  key="tab-details"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.15 }}
                  className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-xs"
                >
                  <div className="flex justify-between py-2 border-b border-neutral-800/60">
                    <span className="text-neutral-500">Catégorie</span>
                    <span className="font-semibold">{prodCategory}</span>
                  </div>
                  {!isRequest && product.state && (
                    <div className="flex justify-between py-2 border-b border-neutral-800/60">
                      <span className="text-neutral-500">État</span>
                      <span className="font-semibold">{STATE_LABELS[product.state] || product.state}</span>
                    </div>
                  )}
                  {!isRequest && (
                    <div className="flex justify-between py-2 border-b border-neutral-800/60">
                      <span className="text-neutral-500">Quantité disponible</span>
                      <span className="font-semibold">{product.quantity ?? '—'}</span>
                    </div>
                  )}
                  <div className="flex justify-between py-2 border-b border-neutral-800/60">
                    <span className="text-neutral-500">Localisation</span>
                    <span className="font-semibold">{product.location || 'Bukavu, RDC'}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-neutral-800/60">
                    <span className="text-neutral-500">Type d'annonce</span>
                    <span className="font-semibold">{isRequest ? 'Demande / Recherche' : 'Vente'}</span>
                  </div>
                  {product.createdAt && (
                    <div className="flex justify-between py-2 border-b border-neutral-800/60">
                      <span className="text-neutral-500">Publié le</span>
                      <span className="font-semibold">{new Date(product.createdAt).toLocaleDateString('fr-FR')}</span>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* PRODUITS SIMILAIRES (même catégorie) */}
        {!loadingSimilar && similarProducts.length > 0 && (
          <div className="mt-10">
            <div className="flex items-center gap-2 mb-4">
              <Layers className="w-4 h-4 text-orange-500" />
              <h2 className="text-sm sm:text-base font-extrabold">Produits similaires</h2>
              <span className="text-[11px] text-neutral-500">({prodCategory})</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {similarProducts.map((sp, idx) => {
                const spId = sp.id || sp._id;
                const spImage = getImageUrl(Array.isArray(sp.images) && sp.images.length > 0 ? sp.images[0] : undefined);
                const spPrice = sp.priceUSD > 0 ? `${sp.priceUSD} $` : 'Sur demande';

                return (
                  <motion.div
                    key={spId || idx}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.25, delay: idx * 0.03 }}
                    onClick={() => navigate(`/products/${spId}`)}
                    className={`rounded-xl overflow-hidden border cursor-pointer group transition hover:border-orange-500 ${
                      darkMode ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-neutral-200'
                    }`}
                  >
                    <div className="aspect-square w-full overflow-hidden bg-neutral-950">
                      <img
                        src={spImage}
                        alt={sp.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=500&q=80'; }}
                      />
                    </div>
                    <div className="p-2.5">
                      <h3 className="text-[11px] font-bold truncate group-hover:text-orange-500 transition">{sp.title?.replace('[DEMANDE] ', '')}</h3>
                      <span className="text-orange-500 font-black text-xs">{spPrice}</span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* LIGHTBOX PLEIN ÉCRAN */}
      <AnimatePresence>
        {showFullImage && imagesList.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowFullImage(false)}
            className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
          >
            <button
              onClick={() => setShowFullImage(false)}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={getImageUrl(imagesList[activeImage])}
              alt={displayTitle}
              onClick={(e) => e.stopPropagation()}
              className="max-w-full max-h-full object-contain rounded-lg"
            />
            {imagesList.length > 1 && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); prevImage(); }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white p-2 rounded-full transition"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); nextImage(); }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white p-2 rounded-full transition"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}