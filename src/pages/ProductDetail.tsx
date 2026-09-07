import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, MapPin, ShieldCheck, MessageSquare, 
  Layers, ChevronLeft, ChevronRight, Share2 
} from 'lucide-react';
import { apiFetch } from '../api/client';

interface ProductItem {
  id?: string;
  _id?: string;
  title: string;
  description?: string;
  priceUSD: number;
  priceCDF: number;
  category?: { name: string } | string;
  images: string[] | string;
  sellerId?: string;
  userId?: string;
  seller?: { id: string; _id?: string; name: string; email?: string; phone?: string; avatar?: string };
  location?: string;
  state?: string;
  quantity?: number | string;
  createdAt?: string;
}

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [product, setProduct] = useState<ProductItem | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeImageIndex, setActiveImageIndex] = useState<number>(0);
  const [currentUserId, setCurrentUserId] = useState<string>('');

  // Fonction utilitaire pour formater proprement les URLs des images
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
    } catch {
      // Ignore parsing errors
    }

    if (!id) return;

    setLoading(true);
    apiFetch(`/products/${id}`)
      .then(res => {
        const prodData = res.product || res.data || res;
        setProduct(prodData);
      })
      .catch(err => {
        console.error("Erreur chargement produit:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id]);

  const handleContactSeller = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate(`/login?redirect=/products/${id}`);
      return;
    }

    if (!product) return;

    const sellerInfo = product.seller;
    const sellerId = product.sellerId || product.userId || sellerInfo?.id || sellerInfo?._id;

    if (!sellerId) {
      alert("Impossible de contacter ce vendeur pour le moment.");
      return;
    }

    if (sellerId === currentUserId) {
      alert("C'est votre propre article !");
      return;
    }

    const defaultMsg = `Bonjour, je suis intéressé(e) par votre article "${product.title}" publié sur CBFSOKO. Est-il toujours disponible ?`;

    try {
      await apiFetch('/messages', {
        method: 'POST',
        body: JSON.stringify({ receiverId: sellerId, content: defaultMsg })
      });
      localStorage.setItem('activeConversationId', sellerId);
      navigate('/messages', { state: { conversationId: sellerId, defaultMessage: defaultMsg } });
    } catch (err) {
      console.error("Erreur envoi message:", err);
      navigate('/messages');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-neutral-400 font-medium tracking-wide">Chargement de l'article...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center p-6 text-center">
        <h2 className="text-base font-bold mb-2">Produit introuvable</h2>
        <p className="text-xs text-neutral-400 mb-6 max-w-xs">Cet article a peut-être été supprimé ou l'adresse est incorrecte.</p>
        <button 
          onClick={() => navigate('/')} 
          className="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-lg shadow-orange-600/20"
        >
          Retour à l'accueil
        </button>
      </div>
    );
  }

  // Normalisation sécurisée des images (tableau ou chaîne unique)
  let imagesList: string[] = ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80'];
  if (product.images) {
    if (Array.isArray(product.images) && product.images.length > 0) {
      imagesList = product.images;
    } else if (typeof product.images === 'string') {
      try {
        const parsed = JSON.parse(product.images);
        if (Array.isArray(parsed) && parsed.length > 0) imagesList = parsed;
        else if (product.images.trim() !== '') imagesList = [product.images];
      } catch {
        imagesList = [product.images];
      }
    }
  }

  const categoryName = typeof product.category === 'object' && product.category !== null 
    ? product.category.name 
    : (product.category || 'Général');

  const sellerName = product.seller?.name || 'Vendeur CBFSOKO';
  const sellerAvatar = product.seller?.avatar ? getImageUrl(product.seller.avatar) : null;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white pb-28 selection:bg-orange-500 selection:text-white">
      
      {/* HEADER ÉPURÉ & FIXE */}
      <header className="sticky top-0 z-40 bg-[#0a0a0a]/80 backdrop-blur-xl border-b border-neutral-900 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button 
            onClick={() => navigate(-1)} 
            className="flex items-center gap-2 text-xs font-bold text-neutral-300 hover:text-orange-500 transition cursor-pointer bg-transparent border-none p-0"
          >
            <div className="w-8 h-8 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center">
              <ArrowLeft className="w-4 h-4 text-orange-500" />
            </div>
            <span>Retour</span>
          </button>

          <div className="flex items-center gap-1.5 bg-neutral-900/80 border border-neutral-800 px-3 py-1.5 rounded-full">
            <MapPin className="w-3.5 h-3.5 text-orange-500" />
            <span className="text-[11px] font-bold tracking-wide uppercase text-neutral-200">Bukavu</span>
          </div>

          <button 
            onClick={() => {
              if (navigator.share) {
                navigator.share({ title: product.title, url: window.location.href }).catch(() => {});
              } else {
                navigator.clipboard.writeText(window.location.href);
                alert("Lien copié !");
              }
            }}
            className="w-9 h-9 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-400 hover:text-orange-500 hover:border-neutral-700 transition cursor-pointer"
            title="Partager"
          >
            <Share2 className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* CONTENU PRINCIPAL */}
      <main className="max-w-4xl mx-auto px-4 pt-6 grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* GALERIE PHOTO OPTIMISÉE */}
        <div className="space-y-3">
          <div className="h-80 sm:h-96 rounded-3xl overflow-hidden bg-neutral-900 border border-neutral-900 relative shadow-2xl group">
            <img 
              src={getImageUrl(imagesList[activeImageIndex])} 
              alt={product.title} 
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80';
              }}
            />
            
            {imagesList.length > 1 && (
              <>
                <button 
                  onClick={() => setActiveImageIndex((prev) => (prev === 0 ? imagesList.length - 1 : prev - 1))}
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-black/50 hover:bg-orange-600 text-white rounded-full backdrop-blur-md flex items-center justify-center transition border border-white/10 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setActiveImageIndex((prev) => (prev === imagesList.length - 1 ? 0 : prev + 1))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-black/50 hover:bg-orange-600 text-white rounded-full backdrop-blur-md flex items-center justify-center transition border border-white/10 cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </>
            )}

            <div className="absolute bottom-3 left-3 bg-black/70 backdrop-blur-md text-[10px] font-bold px-3 py-1.5 rounded-xl text-orange-400 border border-white/10 tracking-wider">
              {activeImageIndex + 1} / {imagesList.length} photos
            </div>
          </div>

          {/* MINIATURES */}
          {imagesList.length > 1 && (
            <div className="flex items-center gap-2.5 overflow-x-auto pb-1 scrollbar-none">
              {imagesList.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImageIndex(idx)}
                  className={`w-16 h-16 rounded-2xl overflow-hidden border-2 transition flex-shrink-0 cursor-pointer ${
                    activeImageIndex === idx ? 'border-orange-500 scale-95 shadow-lg shadow-orange-500/20' : 'border-neutral-900 opacity-50 hover:opacity-100'
                  }`}
                >
                  <img src={getImageUrl(img)} alt={`Aperçu ${idx + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* INFORMATIONS & DETAILS */}
        <div className="flex flex-col justify-between space-y-6">
          <div className="space-y-5">
            <div>
              <span className="inline-block bg-orange-500/10 border border-orange-500/20 text-orange-400 text-[10px] font-extrabold px-3 py-1 rounded-lg uppercase tracking-widest mb-2.5">
                {categoryName}
              </span>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white leading-snug">{product.title}</h1>
            </div>

            {/* PRIX DESIGN */}
            <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-900 space-y-1">
              <div className="text-orange-500 text-2xl font-black tracking-tight">
                {product.priceUSD > 0 ? `${product.priceUSD} $` : 'Prix sur demande'}
              </div>
              {product.priceCDF > 0 && (
                <div className="text-xs text-neutral-400 font-medium">
                  ≈ {product.priceCDF.toLocaleString()} CDF
                </div>
              )}
            </div>

            {/* SPÉCIFICATIONS RAPIDES */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-900 flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500 flex-shrink-0">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <span className="block text-[10px] text-neutral-400 font-medium">État / Stock</span>
                  <span className="font-bold text-neutral-200">{product.state || 'Disponible'} ({product.quantity || 1})</span>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-900 flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500 flex-shrink-0">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <span className="block text-[10px] text-neutral-400 font-medium">Localisation</span>
                  <span className="font-bold text-neutral-200 truncate">{product.location || 'Bukavu'}</span>
                </div>
              </div>
            </div>

            {/* DESCRIPTION */}
            <div className="space-y-2">
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">Description</h3>
              <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed whitespace-pre-line bg-neutral-950/50 p-4 rounded-2xl border border-neutral-900">
                {product.description || "Aucune description détaillée n'a été fournie pour cet article."}
              </p>
            </div>

            {/* VENDEUR CARTE */}
            <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-900 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-orange-600 text-white font-extrabold flex items-center justify-center overflow-hidden shadow-md shadow-orange-600/20">
                  {sellerAvatar ? (
                    <img src={sellerAvatar} alt={sellerName} className="w-full h-full object-cover" />
                  ) : (
                    sellerName.substring(0, 2).toUpperCase()
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-xs text-white">{sellerName}</span>
                    <ShieldCheck className="w-4 h-4 text-orange-500" />
                  </div>
                  <span className="text-[10px] text-neutral-400 font-medium">Membre vérifié CBFSOKO</span>
                </div>
              </div>
            </div>
          </div>

          {/* BOUTON D'ACTION FLOTTANT / FIXE EN BAS */}
          <div className="pt-4 border-t border-neutral-900">
            <button 
              onClick={handleContactSeller}
              className="w-full py-4 bg-orange-600 hover:bg-orange-700 text-white font-black text-xs sm:text-sm rounded-2xl shadow-xl shadow-orange-600/30 transition flex items-center justify-center gap-2.5 cursor-pointer active:scale-98"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Contacter le vendeur & Commander</span>
            </button>
          </div>

        </div>
      </main>
    </div>
  );
}