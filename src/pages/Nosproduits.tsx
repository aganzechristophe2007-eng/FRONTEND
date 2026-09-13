import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Store, Percent, Share2, CheckCircle, Package } from 'lucide-react';
import { apiFetch } from '../api/client';

interface OfficialProduct {
  id: string;
  title: string;
  description: string;
  priceUSD: number;
  priceCDF: number;
  images: string[];
  category?: { name: string } | string;
  quantity?: number;
}

// Taux de commission fixe pour tous les produits officiels CBF
const COMMISSION_RATE = 10;

export default function NosProduits() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<OfficialProduct[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    fetchOfficialProducts();
  }, []);

  const fetchOfficialProducts = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiFetch('/products?official=true');
      const list = Array.isArray(data) ? data : (data.data || []);
      setProducts(list);
    } catch (err: any) {
      setError(err.message || "Impossible de charger les produits officiels.");
    } finally {
      setLoading(false);
    }
  };

  // Génère un lien de revente à partager (attribue la vente au revendeur via ?ref=)
  const handleResell = async (productId: string) => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login?redirect=/nos-produits');
      return;
    }
    const userStr = localStorage.getItem('user');
    let userId = '';
    try {
      userId = userStr ? JSON.parse(userStr).id : '';
    } catch {
      // ignore
    }

    const link = `${window.location.origin}/products/${productId}?ref=${userId}`;

    try {
      await navigator.clipboard.writeText(link);
      setCopiedId(productId);
      setTimeout(() => setCopiedId(null), 2500);
    } catch {
      // Copie impossible (permissions navigateur) — on ignore silencieusement
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <header className="border-b border-neutral-800 bg-neutral-900/90 backdrop-blur-md px-4 lg:px-8 py-3 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-orange-600 rounded-xl flex items-center justify-center text-white font-black text-sm shadow-lg shadow-orange-600/30">
              CBF
            </div>
            <div>
              <span className="font-extrabold text-sm tracking-tight block leading-none">Nos produits</span>
              <span className="text-[10px] text-orange-500 font-bold tracking-widest uppercase">Produits officiels CBF</span>
            </div>
          </div>
          <Link to="/" className="text-xs text-neutral-400 hover:text-white flex items-center gap-1.5 transition">
            <ArrowLeft className="w-4 h-4" /> Accueil
          </Link>
        </div>
      </header>

      <div className="max-w-6xl mx-auto p-4 sm:p-8">
        {/* Bannière commission */}
        <div className="mb-6 rounded-2xl border border-orange-800/40 bg-gradient-to-r from-orange-900/30 to-neutral-900 p-5 sm:p-6 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-orange-700 text-white flex items-center justify-center flex-shrink-0">
            <Percent className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-extrabold text-sm sm:text-base">Devenez revendeur CBF</h1>
            <p className="text-[11px] sm:text-xs text-neutral-400">
              Partagez ces produits officiels et gagnez <span className="text-orange-500 font-bold">{COMMISSION_RATE}% de commission</span> sur chaque vente réalisée grâce à vous.
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-24 text-orange-500 text-xs font-semibold gap-2">
            <span className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
            Chargement des produits officiels...
          </div>
        ) : products.length === 0 ? (
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-12 text-center text-neutral-400 text-xs flex flex-col items-center gap-2">
            <Package className="w-6 h-6 text-neutral-600" />
            Aucun produit officiel n'a encore été publié par l'administration.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.map((product) => {
              const categoryName = typeof product.category === 'object' && product.category !== null ? product.category.name : (product.category || 'Général');
              const commission = ((product.priceUSD || 0) * COMMISSION_RATE) / 100;
              return (
                <div key={product.id} className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden flex flex-col shadow-xl">
                  <div className="aspect-square bg-neutral-800 flex items-center justify-center overflow-hidden">
                    {product.images?.[0] ? (
                      <img src={product.images[0]} alt={product.title} className="w-full h-full object-cover" />
                    ) : (
                      <Store className="w-8 h-8 text-neutral-600" />
                    )}
                  </div>
                  <div className="p-3 flex flex-col gap-2 flex-1">
                    <span className="text-[9px] bg-neutral-800 text-neutral-300 px-2 py-0.5 rounded font-bold uppercase w-fit">{categoryName}</span>
                    <h3 className="text-xs font-bold leading-tight line-clamp-2">{product.title}</h3>
                    <span className="text-sm font-black text-orange-500">{product.priceUSD || 0} $</span>
                    <span className="text-[10px] text-neutral-500">Commission estimée : <span className="text-green-400 font-bold">{commission.toFixed(2)} $</span></span>

                    <button
                      onClick={() => handleResell(product.id)}
                      className="mt-auto bg-orange-700 hover:bg-orange-800 text-white font-bold text-[11px] px-3 py-2 rounded-xl transition flex items-center justify-center gap-1.5"
                    >
                      {copiedId === product.id ? (
                        <><CheckCircle className="w-3.5 h-3.5" /> Lien copié !</>
                      ) : (
                        <><Share2 className="w-3.5 h-3.5" /> Revendre ce produit</>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}