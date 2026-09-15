import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, ShoppingCart, Trash2, Plus, Minus, Clock, Users, ShieldCheck,
  Info, Loader2, CheckCircle2, Package, Store, Wallet,
} from 'lucide-react';
import { apiFetch } from '../api/client';

// --- Frais de service CBF SOKO appliqués au moment du paiement ---
// CBF centralise la mise en relation avec chaque vendeur (souvent différent d'un article à l'autre)
// et prend en charge la vérification/contact avant confirmation : d'où ces 15% sur le total.
const SERVICE_FEE_RATE = 0.15;

interface CartSellerLite {
  id: string;
  name: string;
}

interface CartProduct {
  id?: string;
  _id?: string;
  title: string;
  priceUSD: number;
  priceCDF: number;
  images: string[];
  stockQuantity?: number;
  seller?: { id?: string; _id?: string; name: string };
  sellerId?: string;
  userId?: string;
}

interface CartItem {
  id: string;
  productId: string;
  quantity: number;
  product: CartProduct;
}

function getImageUrl(path?: string): string {
  if (!path) return '';
  const cleanPath = path.replace(/\\/g, '/').replace(/^\/+/, '');
  return cleanPath.startsWith('http')
    ? cleanPath
    : `https://cbfsoko-backend.onrender.com/${cleanPath.startsWith('uploads/') ? cleanPath : 'uploads/' + cleanPath}`;
}

function formatUSD(n: number): string {
  return `$${n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatCDF(n: number): string {
  return `${Math.round(n).toLocaleString('fr-FR')} FC`;
}

export default function Cart() {
  const navigate = useNavigate();
  const [darkMode] = useState<boolean>(() => localStorage.getItem('cbfsoko-theme-mode') !== 'light');

  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const [checkingOut, setCheckingOut] = useState<boolean>(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [checkoutDone, setCheckoutDone] = useState<boolean>(false);

  // Normalise la réponse backend, quelle que soit sa forme exacte (item.product ou item direct)
  const normalizeItems = (data: any): CartItem[] => {
    const list: any[] = Array.isArray(data) ? data : (data?.items || data?.data || []);
    return list
      .map((raw: any) => {
        const product = raw.product || raw.Product || raw;
        const productId = raw.productId || product?.id || product?._id;
        if (!productId) return null;
        return {
          id: String(raw.id || raw._id || productId),
          productId: String(productId),
          quantity: Number(raw.quantity || 1),
          product: {
            id: product?.id,
            _id: product?._id,
            title: product?.title || 'Produit',
            priceUSD: Number(product?.priceUSD || 0),
            priceCDF: Number(product?.priceCDF || 0),
            images: product?.images || [],
            stockQuantity: product?.quantity,
            seller: product?.seller,
            sellerId: product?.sellerId || product?.userId,
            userId: product?.userId,
          },
        } as CartItem;
      })
      .filter((it): it is CartItem => it !== null);
  };

  const fetchCart = useCallback(() => {
    setLoading(true);
    setLoadError(null);
    apiFetch('/cart')
      .then((data) => setItems(normalizeItems(data)))
      .catch(() => setLoadError("Impossible de charger votre panier pour le moment. Réessayez dans un instant."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login?redirect=/cart');
      return;
    }
    fetchCart();
  }, [fetchCart, navigate]);

  // --- Regroupement par vendeur, pour bien montrer que les articles viennent de personnes différentes ---
  const groupedBySeller = useMemo(() => {
    const map = new Map<string, { seller: CartSellerLite; items: CartItem[] }>();
    items.forEach((it) => {
      const sellerId = it.product.sellerId || it.product.seller?.id || it.product.seller?._id || 'inconnu';
      const sellerName = it.product.seller?.name || 'Vendeur CBF SOKO';
      if (!map.has(sellerId)) {
        map.set(sellerId, { seller: { id: sellerId, name: sellerName }, items: [] });
      }
      map.get(sellerId)!.items.push(it);
    });
    return Array.from(map.values());
  }, [items]);

  const sellersCount = groupedBySeller.length;

  // --- Calcul du montant : marchandise + 15% de frais de service CBF SOKO ---
  const merchandiseUSD = useMemo(() => items.reduce((sum, it) => sum + it.product.priceUSD * it.quantity, 0), [items]);
  const merchandiseCDF = useMemo(() => items.reduce((sum, it) => sum + it.product.priceCDF * it.quantity, 0), [items]);
  const serviceFeeUSD = merchandiseUSD * SERVICE_FEE_RATE;
  const serviceFeeCDF = merchandiseCDF * SERVICE_FEE_RATE;
  const totalUSD = merchandiseUSD + serviceFeeUSD;
  const totalCDF = merchandiseCDF + serviceFeeCDF;
  const totalArticles = useMemo(() => items.reduce((sum, it) => sum + it.quantity, 0), [items]);

  const updateQuantity = async (item: CartItem, nextQty: number) => {
    if (nextQty < 1) return;
    const prevItems = items;
    setUpdatingId(item.id);
    setItems((prev) => prev.map((it) => (it.id === item.id ? { ...it, quantity: nextQty } : it)));
    try {
      await apiFetch(`/cart/${item.id}`, { method: 'PATCH', body: JSON.stringify({ quantity: nextQty }) });
    } catch (err) {
      setItems(prevItems);
      console.error('Erreur mise à jour de la quantité', err);
    } finally {
      setUpdatingId(null);
    }
  };

  const removeItem = async (item: CartItem) => {
    const prevItems = items;
    setRemovingId(item.id);
    setItems((prev) => prev.filter((it) => it.id !== item.id));
    try {
      await apiFetch(`/cart/${item.id}`, { method: 'DELETE' });
    } catch (err) {
      setItems(prevItems);
      console.error('Erreur suppression de l’article', err);
    } finally {
      setRemovingId(null);
    }
  };

  const handleCheckout = async () => {
    if (items.length === 0 || checkingOut) return;
    setCheckingOut(true);
    setCheckoutError(null);
    try {
      await apiFetch('/orders/checkout', {
        method: 'POST',
        body: JSON.stringify({
          items: items.map((it) => ({ productId: it.productId, quantity: it.quantity })),
          serviceFeeRate: SERVICE_FEE_RATE,
        }),
      });
      setCheckoutDone(true);
      setItems([]);
    } catch (err) {
      console.error('Erreur lors du paiement', err);
      setCheckoutError("Votre commande n'a pas pu être envoyée. Vérifiez votre connexion et réessayez.");
    } finally {
      setCheckingOut(false);
    }
  };

  const bg = darkMode ? 'bg-neutral-950 text-white' : 'bg-neutral-50 text-neutral-900';
  const cardBg = darkMode ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-neutral-200';
  const subtleText = darkMode ? 'text-neutral-400' : 'text-neutral-500';

  return (
    <div className={`min-h-screen ${bg}`}>
      {/* En-tête */}
      <header className={`sticky top-0 z-20 border-b backdrop-blur-md ${darkMode ? 'bg-neutral-950/90 border-neutral-800' : 'bg-white/90 border-neutral-200'}`}>
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className={`p-2 rounded-full border transition ${darkMode ? 'border-neutral-800 hover:border-orange-600' : 'border-neutral-200 hover:border-orange-600'}`}
            title="Retour"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-orange-600" />
            <h1 className="font-extrabold text-sm sm:text-base">Mon panier</h1>
          </div>
          {totalArticles > 0 && (
            <span className="ml-auto text-[11px] font-bold bg-orange-700 text-white px-2.5 py-1 rounded-full">
              {totalArticles} article{totalArticles > 1 ? 's' : ''}
            </span>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 pb-32 sm:pb-10">

        {/* ===== Écran de succès après paiement/commande envoyée ===== */}
        {checkoutDone ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-2xl border p-8 text-center ${cardBg}`}
          >
            <div className="w-14 h-14 mx-auto rounded-full bg-orange-700/10 text-orange-600 flex items-center justify-center mb-4">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h2 className="font-extrabold text-base mb-2">Votre commande a bien été envoyée !</h2>
            <p className={`text-xs leading-relaxed max-w-sm mx-auto mb-6 ${subtleText}`}>
              CBF SOKO va maintenant contacter chaque vendeur concerné pour confirmer la disponibilité
              des articles. Vous recevrez une notification dès qu'un vendeur aura répondu. Merci pour votre patience.
            </p>
            <div className="flex items-center justify-center gap-3">
              <Link
                to="/orders"
                className="bg-orange-700 hover:bg-orange-800 text-white text-xs font-bold px-5 py-2.5 rounded-full transition"
              >
                Suivre mes commandes
              </Link>
              <Link
                to="/products"
                className={`text-xs font-bold px-5 py-2.5 rounded-full border transition ${darkMode ? 'border-neutral-800 hover:border-orange-600' : 'border-neutral-200 hover:border-orange-600'}`}
              >
                Continuer mes achats
              </Link>
            </div>
          </motion.div>
        ) : (
          <>
            {/* ===== Bandeau d'information : multi-vendeurs, délai, frais de 15% ===== */}
            <div className={`rounded-2xl border p-4 sm:p-5 mb-6 ${darkMode ? 'bg-orange-900/15 border-orange-800/40' : 'bg-orange-50 border-orange-200'}`}>
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-orange-700/15 text-orange-600 flex items-center justify-center flex-shrink-0">
                  <Info className="w-4.5 h-4.5" />
                </div>
                <div className="text-xs sm:text-[13px] leading-relaxed">
                  <p className="font-extrabold mb-1">Comment fonctionne votre panier CBF SOKO</p>
                  <p className={subtleText}>
                    Les articles de ce panier appartiennent à <span className="font-bold text-orange-600">différents vendeurs</span> de
                    la plateforme{sellersCount > 0 ? ` (${sellersCount} vendeur${sellersCount > 1 ? 's' : ''} concerné${sellersCount > 1 ? 's' : ''} ici)` : ''}.
                    Après votre commande, <span className="font-semibold">CBF SOKO contacte chaque vendeur</span> pour confirmer la
                    disponibilité avant de finaliser la livraison — merci de patienter pendant cette étape.
                  </p>
                  <p className={`mt-2 ${subtleText}`}>
                    Pour cette mise en relation et la vérification des vendeurs, des{' '}
                    <span className="font-bold text-orange-600">frais de service de 15%</span> s'ajoutent au prix de la marchandise :
                    c'est ce montant, déjà inclus, que vous voyez dans le total à payer ci-dessous.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3 mt-3 pt-3 border-t border-orange-800/20 text-[11px]">
                <span className={`flex items-center gap-1.5 ${subtleText}`}><Clock className="w-3.5 h-3.5 text-orange-600" /> Confirmation vendeur sous peu</span>
                <span className={`flex items-center gap-1.5 ${subtleText}`}><Users className="w-3.5 h-3.5 text-orange-600" /> Vendeurs vérifiés individuellement</span>
                <span className={`flex items-center gap-1.5 ${subtleText}`}><ShieldCheck className="w-3.5 h-3.5 text-orange-600" /> Paiement sécurisé via CBF SOKO</span>
              </div>
            </div>

            {/* ===== Contenu : chargement / erreur / vide / liste ===== */}
            {loading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className={`h-24 rounded-2xl border animate-pulse ${cardBg}`} />
                ))}
              </div>
            ) : loadError ? (
              <div className={`rounded-2xl border p-6 text-center text-xs ${cardBg} ${subtleText}`}>
                {loadError}
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={fetchCart}
                    className="text-orange-600 font-bold hover:underline"
                  >
                    Réessayer
                  </button>
                </div>
              </div>
            ) : items.length === 0 ? (
              <div className={`rounded-2xl border p-10 text-center ${cardBg}`}>
                <div className="w-12 h-12 mx-auto rounded-full bg-orange-700/10 text-orange-600 flex items-center justify-center mb-3">
                  <ShoppingCart className="w-6 h-6" />
                </div>
                <p className="font-extrabold text-sm mb-1">Votre panier est vide</p>
                <p className={`text-xs mb-5 ${subtleText}`}>Parcourez le catalogue et ajoutez des articles depuis les fiches produits ou les reels.</p>
                <Link
                  to="/products"
                  className="inline-block bg-orange-700 hover:bg-orange-800 text-white text-xs font-bold px-5 py-2.5 rounded-full transition"
                >
                  Voir les produits
                </Link>
              </div>
            ) : (
              <div className="space-y-5">
                {groupedBySeller.map(({ seller, items: sellerItems }) => (
                  <div key={seller.id} className={`rounded-2xl border overflow-hidden ${cardBg}`}>
                    {/* En-tête vendeur */}
                    <div className={`flex items-center gap-2 px-4 py-3 border-b ${darkMode ? 'border-neutral-800 bg-neutral-950/40' : 'border-neutral-200 bg-neutral-50'}`}>
                      <Store className="w-3.5 h-3.5 text-orange-600" />
                      <span className="text-[11px] font-bold">{seller.name}</span>
                      <span className={`text-[10px] ${subtleText}`}>· vendeur indépendant sur CBF SOKO</span>
                    </div>

                    {/* Articles de ce vendeur */}
                    <div className="divide-y divide-neutral-800/50">
                      <AnimatePresence initial={false}>
                        {sellerItems.map((item) => (
                          <motion.div
                            key={item.id}
                            initial={{ opacity: 1 }}
                            exit={{ opacity: 0, height: 0 }}
                            className="flex items-center gap-3 px-4 py-3"
                          >
                            <img
                              src={getImageUrl(item.product.images?.[0])}
                              alt={item.product.title}
                              className="w-14 h-14 rounded-xl object-cover flex-shrink-0 bg-neutral-800"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold truncate">{item.product.title}</p>
                              <p className={`text-[11px] mt-0.5 ${subtleText}`}>
                                {formatUSD(item.product.priceUSD)} · {formatCDF(item.product.priceCDF)} / unité
                              </p>

                              {/* Quantité */}
                              <div className="flex items-center gap-2 mt-2">
                                <div className={`flex items-center border rounded-full overflow-hidden ${darkMode ? 'border-neutral-800' : 'border-neutral-200'}`}>
                                  <button
                                    type="button"
                                    disabled={updatingId === item.id || item.quantity <= 1}
                                    onClick={() => updateQuantity(item, item.quantity - 1)}
                                    className="p-1.5 disabled:opacity-40"
                                  >
                                    <Minus className="w-3 h-3" />
                                  </button>
                                  <span className="text-[11px] font-bold w-5 text-center">
                                    {updatingId === item.id ? <Loader2 className="w-3 h-3 animate-spin mx-auto" /> : item.quantity}
                                  </span>
                                  <button
                                    type="button"
                                    disabled={updatingId === item.id}
                                    onClick={() => updateQuantity(item, item.quantity + 1)}
                                    className="p-1.5 disabled:opacity-40"
                                  >
                                    <Plus className="w-3 h-3" />
                                  </button>
                                </div>
                                <button
                                  type="button"
                                  disabled={removingId === item.id}
                                  onClick={() => removeItem(item)}
                                  className="text-red-500 hover:text-red-600 p-1.5 disabled:opacity-40"
                                  title="Retirer du panier"
                                >
                                  {removingId === item.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                                </button>
                              </div>
                            </div>

                            {/* Sous-total ligne */}
                            <div className="text-right flex-shrink-0">
                              <p className="text-xs font-extrabold">{formatUSD(item.product.priceUSD * item.quantity)}</p>
                              <p className={`text-[10px] ${subtleText}`}>{formatCDF(item.product.priceCDF * item.quantity)}</p>
                            </div>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ===== Récapitulatif & paiement ===== */}
            {!loading && !loadError && items.length > 0 && (
              <div className={`rounded-2xl border p-4 sm:p-5 mt-6 ${cardBg}`}>
                <h3 className="text-xs font-extrabold mb-3 flex items-center gap-1.5">
                  <Wallet className="w-4 h-4 text-orange-600" /> Récapitulatif du paiement
                </h3>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className={subtleText}>Prix de la marchandise</span>
                    <span className="font-bold">{formatUSD(merchandiseUSD)} <span className={subtleText}>/ {formatCDF(merchandiseCDF)}</span></span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={subtleText}>Frais de service CBF SOKO (15%)</span>
                    <span className="font-bold text-orange-600">{formatUSD(serviceFeeUSD)} <span className={subtleText}>/ {formatCDF(serviceFeeCDF)}</span></span>
                  </div>
                  <div className={`flex items-center justify-between pt-2 mt-2 border-t ${darkMode ? 'border-neutral-800' : 'border-neutral-200'}`}>
                    <span className="font-extrabold text-sm">Total à payer</span>
                    <div className="text-right">
                      <p className="font-extrabold text-sm text-orange-600">{formatUSD(totalUSD)}</p>
                      <p className={`text-[11px] ${subtleText}`}>{formatCDF(totalCDF)}</p>
                    </div>
                  </div>
                </div>

                {checkoutError && <p className="text-red-500 text-[11px] mt-3">{checkoutError}</p>}

                <button
                  type="button"
                  disabled={checkingOut}
                  onClick={handleCheckout}
                  className="w-full mt-4 bg-orange-700 hover:bg-orange-800 disabled:opacity-60 text-white font-bold text-xs py-3 rounded-full transition flex items-center justify-center gap-2"
                >
                  {checkingOut ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Envoi de la commande…
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="w-4 h-4" /> Confirmer et payer {formatUSD(totalUSD)}
                    </>
                  )}
                </button>
                <p className={`text-[10px] text-center mt-2 ${subtleText}`}>
                  En confirmant, vous acceptez que CBF SOKO contacte les vendeurs concernés avant la livraison finale.
                </p>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}