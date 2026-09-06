import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Package, FileText } from 'lucide-react';

interface Order {
  id: string;
  status: string;
  totalCDF: number;
  totalUSD: number;
  createdAt: string;
  isDemande?: boolean;
  title?: string;
}

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrdersAndDemandes = async () => {
      try {
        const token = localStorage.getItem('token');
        const headers = { Authorization: `Bearer ${token}` };

        // Récupérer l'ID de l'utilisateur connecté depuis le localStorage
        let currentUserId = '';
        try {
          const userStr = localStorage.getItem('user');
          if (userStr) {
            const parsedUser = JSON.parse(userStr);
            currentUserId = parsedUser.id || parsedUser._id || '';
          }
        } catch {
          // Ignore parse error
        }

        // 1. Récupération des commandes classiques
        let ordersList: Order[] = [];
        try {
          const resOrders = await axios.get('https://cbfsoko-backend.onrender.com/api/orders', { headers });
          const rawOrders = resOrders.data;
          ordersList = Array.isArray(rawOrders) ? rawOrders : (rawOrders.data || rawOrders.orders || []);
        } catch {
          // Ignorer si la route des commandes échoue
        }

        // 2. Récupération des demandes depuis la table des produits (/api/products)
        let demandesList: Order[] = [];
        try {
          const resProducts = await axios.get('https://cbfsoko-backend.onrender.com/api/products', { headers });
          const rawProducts = resProducts.data;
          const productsList = Array.isArray(rawProducts) ? rawProducts : (rawProducts.data || rawProducts.products || []);
          
          // Filtrer les éléments qui sont des demandes (type === 'REQUEST' ou titre avec [DEMANDE]) postés par l'utilisateur
          demandesList = productsList
            .filter((p: any) => {
              const pSellerId = p.sellerId || p.userId || p.seller?.id || p.seller?._id;
              const matchesUser = currentUserId ? (pSellerId === currentUserId) : true;
              
              const typeStr = String(p.type || '').toUpperCase();
              const titleStr = String(p.title || '');
              const isDemandeType = typeStr === 'REQUEST' || titleStr.includes('[DEMANDE]') || p.isDemande === true;

              return matchesUser && isDemandeType;
            })
            .map((p: any) => ({
              id: p.id || p._id,
              status: p.state || p.status || 'DEMANDE ACTIVE',
              totalCDF: p.priceCDF || p.price || 0,
              totalUSD: p.priceUSD || 0,
              createdAt: p.createdAt || new Date().toISOString(),
              isDemande: true,
              title: p.title || p.name || 'Demande sans titre'
            }));
        } catch {
          // Ignorer si la récupération des produits échoue
        }

        setOrders([...demandesList, ...ordersList]);
      } catch (err: any) {
        setError("Impossible de charger vos données.");
      } finally {
        setLoading(false);
      }
    };

    fetchOrdersAndDemandes();
  }, []);

  if (loading) {
    return <div className="max-w-7xl mx-auto px-4 py-8 text-white">Chargement...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 text-white">
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <Package className="w-6 h-6 text-orange-500" /> Mes Commandes & Demandes
      </h1>
      
      {error && <p className="text-red-500 mb-4">{error}</p>}

      {orders.length === 0 ? (
        <p className="text-neutral-400">Vous n'avez passé aucune commande ni publié de demande pour le moment.</p>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order.id} className="bg-neutral-900 border border-neutral-800 p-4 rounded-xl flex justify-between items-center shadow-lg">
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${order.isDemande ? 'bg-orange-500/10 text-orange-500 border border-orange-500/20' : 'bg-neutral-800 text-neutral-300'}`}>
                  {order.isDemande ? <FileText className="w-5 h-5" /> : <Package className="w-5 h-5" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-white">
                      {order.isDemande ? `Demande : ${order.title}` : `Commande #${order.id.slice(0, 8)}`}
                    </p>
                    {order.isDemande && (
                      <span className="text-[10px] bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded font-bold uppercase tracking-wider border border-orange-500/30">
                        Poste Demande
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-neutral-400 mt-0.5">Date : {new Date(order.createdAt).toLocaleDateString()}</p>
                  <p className="text-sm mt-1">Statut : <span className="font-medium text-yellow-500">{order.status}</span></p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-orange-500">{order.totalUSD} USD</p>
                {order.totalCDF > 0 && <p className="text-xs text-neutral-400">({order.totalCDF.toLocaleString()} CDF)</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}