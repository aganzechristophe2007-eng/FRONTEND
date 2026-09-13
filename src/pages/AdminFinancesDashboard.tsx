import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { DollarSign, MessageSquare, CheckCircle, AlertCircle, ArrowLeft, LogOut, ShieldCheck, Send, Wallet, TrendingUp, Users, Activity } from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

interface Order {
  id: string;
  status: string;
  totalUSD: number;
  totalCDF: number;
  createdAt: string;
  buyer?: {
    name: string;
    email: string;
  };
  agent?: {
    name: string;
    email: string;
  };
  payment?: {
    status: string;
  };
}

interface Message {
  id: string;
  senderId: string;
  content: string;
  createdAt: string;
  sender?: {
    name: string;
  };
}

interface UserWalletRow {
  id: string;
  name: string;
  email: string;
  role: string;
  balanceUSD: number;
  balanceCDF: number;
}

interface GlobalTransaction {
  id: string;
  type: string;
  status: string;
  provider?: string;
  amountUSD: number;
  amountCDF: number;
  createdAt: string;
  user?: { name: string; email: string; role: string } | null;
}

interface FinanceStats {
  totalCirculatingUSD: number;
  totalCirculatingCDF: number;
  totalDeposits: number;
  totalWithdrawals: number;
  platformEarnings: number;
  failureRate: number;
  totalUsers: number;
  chartData: { date: string; depots: number; retraits: number }[];
}

export default function AdminFinancesDashboard() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [financeName, setFinanceName] = useState('Félicien');
  const [currentUserId, setCurrentUserId] = useState('');
  const [logisticsAdminId, setLogisticsAdminId] = useState('');
  
  const [activeTab, setActiveTab] = useState<'orders' | 'chat' | 'wallets'>('orders');
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');

  // --- NOUVEAU : vue d'ensemble des portefeuilles / transactions / circulation d'argent ---
  const [walletRows, setWalletRows] = useState<UserWalletRow[]>([]);
  const [globalTransactions, setGlobalTransactions] = useState<GlobalTransaction[]>([]);
  const [financeStats, setFinanceStats] = useState<FinanceStats | null>(null);
  const [financeLoading, setFinanceLoading] = useState(true);

  const API_URL = 'https://cbfsoko-backend.onrender.com/api';

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');

    if (!token || !userStr) {
      navigate('/login?redirect=/admin/finances-dashboard');
      return;
    }

    try {
      const user = JSON.parse(userStr);
      if (user.id) setCurrentUserId(user.id);
      if (user.name) setFinanceName(user.name);
    } catch {
      // Ignore parse error
    }

    fetchAllOrders(token);
    fetchLogisticsAdmin(token);
    fetchFinanceOverview(token);
  }, [navigate]);

  const fetchFinanceOverview = async (token: string) => {
    setFinanceLoading(true);
    try {
      const [walletsRes, txRes, statsRes] = await Promise.all([
        fetch(`${API_URL}/admin/wallets`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_URL}/admin/transactions`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_URL}/admin/finance-stats`, { headers: { 'Authorization': `Bearer ${token}` } }),
      ]);

      const walletsData = await walletsRes.json();
      if (walletsData.success) setWalletRows(walletsData.data);

      const txData = await txRes.json();
      if (txData.success) setGlobalTransactions(txData.data);

      const statsData = await statsRes.json();
      if (statsData.success) setFinanceStats(statsData.data);
    } catch (err) {
      console.error('Erreur chargement des données financières globales', err);
    } finally {
      setFinanceLoading(false);
    }
  };

  useEffect(() => {
    if (!logisticsAdminId) return;

    const interval = setInterval(() => {
      const currentToken = localStorage.getItem('token');
      if (currentToken) {
        fetchMessages(currentToken, logisticsAdminId, true);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [logisticsAdminId, activeTab]);

  const fetchAllOrders = async (token: string) => {
    try {
      const response = await fetch(`${API_URL}/orders`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setOrders(data.data);
      } else {
        setError(data.message || "Erreur lors de la récupération des commandes.");
      }
    } catch (err: any) {
      setError(err.message || "Erreur de connexion au serveur.");
    } finally {
      setLoading(false);
    }
  };

  const fetchLogisticsAdmin = async (token: string) => {
    try {
      const response = await fetch(`${API_URL}/admin/logistics-user`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success && data.data?.id) {
        setLogisticsAdminId(data.data.id);
        fetchMessages(token, data.data.id, false);
      } else {
        setError("Impossible de trouver l'administrateur logistique dans la base de données.");
      }
    } catch {
      setError("Erreur réseau lors de la liaison avec le service logistique.");
    }
  };

  const fetchMessages = async (token: string, otherId: string, checkNew: boolean) => {
    try {
      const response = await fetch(`${API_URL}/messages/${otherId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setMessages(prev => {
          const latestMsg = data.data[data.data.length - 1];
          const isFromOther = latestMsg && latestMsg.senderId !== currentUserId;

          if (data.data.length > prev.length) {
            if (checkNew && activeTab !== 'chat' && isFromOther) {
              setHasNewMessage(true);
            }
          }

          if (!checkNew && activeTab !== 'chat' && isFromOther) {
            setHasNewMessage(true);
          }

          return data.data;
        });
      }
    } catch {
      // Gestion silencieuse
    }
  };

  const handleValidateEscrow = async (orderId: string) => {
    setError('');
    setSuccessMessage('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/orders/${orderId}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (data.success) {
        setSuccessMessage("Paiement validé avec succès ! Fonds libérés de l'escrow vers le portefeuille.");
        setOrders(orders.map(order => order.id === orderId ? { ...order, status: 'DELIVERED', payment: { status: 'SUCCESS' } } : order));
      } else {
        setError(data.message || "Impossible de valider le paiement.");
      }
    } catch (err: any) {
      setError(err.message || "Erreur réseau.");
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!newMessage.trim()) return;

    if (!logisticsAdminId) {
      setError("Erreur : L'ID de l'administrateur logistique n'est pas chargé.");
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          receiverId: logisticsAdminId,
          content: newMessage
        })
      });

      const data = await response.json();
      if (data.success) {
        setMessages(prev => [...prev, data.data]);
        setNewMessage('');
      } else {
        setError(data.message || "Erreur lors de l'envoi du message.");
      }
    } catch {
      setError("Erreur réseau lors de l'envoi du message.");
    }
  };

  const handleTabChange = (tab: 'orders' | 'chat' | 'wallets') => {
    setActiveTab(tab);
    if (tab === 'chat') {
      setHasNewMessage(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center">
        <div className="flex items-center gap-3 text-orange-500 font-semibold text-xs">
          <span className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
          Chargement du tableau de bord financier...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <header className="border-b border-neutral-800 bg-neutral-900/90 backdrop-blur-md px-4 lg:px-8 py-3 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="w-9 h-9 bg-orange-600 rounded-xl flex items-center justify-center text-white font-black text-sm shadow-lg shadow-orange-600/30">
                CBF
              </div>
              <div>
                <span className="font-extrabold text-sm tracking-tight block leading-none">CBFSOKO</span>
                <span className="text-[10px] text-orange-500 font-bold tracking-widest uppercase">Espace Finances & Escrow</span>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <Link to="/" className="text-xs text-neutral-400 hover:text-white flex items-center gap-1.5 transition">
              <ArrowLeft className="w-4 h-4" /> Accueil
            </Link>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 bg-red-600/10 text-red-400 hover:bg-red-600 hover:text-white px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer border border-red-500/20"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Déconnexion</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto p-4 sm:p-8">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
              <DollarSign className="w-6 h-6 text-orange-500" />
              Supervision Financière - {financeName}
            </h1>
            <p className="text-neutral-400 text-xs sm:text-sm mt-1">
              Supervisez les transactions, libérez les fonds en séquestre et communiquez avec l'équipe logistique.
            </p>
          </div>

          <div className="flex bg-neutral-900 p-1.5 rounded-2xl border border-neutral-800 self-start">
            <button
              onClick={() => handleTabChange('orders')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === 'orders' ? 'bg-orange-600 text-white shadow-md shadow-orange-600/30' : 'text-neutral-400 hover:text-white'
              }`}
            >
              <ShieldCheck className="w-4 h-4" /> Commandes & Escrow
            </button>
            <button
              onClick={() => handleTabChange('chat')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer relative ${
                activeTab === 'chat' ? 'bg-orange-600 text-white shadow-md shadow-orange-600/30' : 'text-neutral-400 hover:text-white'
              }`}
            >
              <MessageSquare className="w-4 h-4" /> Discussion Interne
              {hasNewMessage && (
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 absolute top-2 right-2 animate-ping" />
              )}
              {hasNewMessage && (
                <span className="w-2 h-2 rounded-full bg-red-500 absolute top-2.5 right-2.5" />
              )}
            </button>
            <button
              onClick={() => handleTabChange('wallets')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === 'wallets' ? 'bg-orange-600 text-white shadow-md shadow-orange-600/30' : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Wallet className="w-4 h-4" /> Portefeuilles
            </button>
          </div>
        </div>

        {successMessage && (
          <div className="mb-6 p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-xs flex items-center gap-3">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-3">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {hasNewMessage && activeTab !== 'chat' && (
          <div className="mb-6 p-4 rounded-xl bg-orange-500/10 border border-orange-500/30 text-orange-400 text-xs flex items-center justify-between shadow-lg animate-pulse">
            <div className="flex items-center gap-3">
              <MessageSquare className="w-5 h-5 flex-shrink-0 text-orange-500" />
              <span>Vous avez reçu un nouveau message de l'équipe logistique !</span>
            </div>
            <button
              onClick={() => handleTabChange('chat')}
              className="bg-orange-600 hover:bg-orange-500 text-white font-bold px-3 py-1.5 rounded-lg transition cursor-pointer"
            >
              Voir la discussion
            </button>
          </div>
        )}

        {activeTab === 'orders' && (
          <div>
            {orders.length === 0 ? (
              <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-12 text-center text-neutral-400 text-xs">
                Aucune commande enregistrée dans le système financier.
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map((order) => (
                  <div key={order.id} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow-xl transition">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-neutral-800 pb-4 mb-4 gap-2">
                      <div>
                        <span className="text-xs font-semibold text-neutral-400">Commande ID :</span>
                        <span className="text-xs font-mono text-white ml-1.5 font-bold">{order.id}</span>
                        <div className="text-[11px] text-neutral-500 mt-0.5">
                          Date : {new Date(order.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-neutral-800 text-neutral-300 border border-neutral-700">
                          Statut : {order.status}
                        </span>
                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          order.payment?.status === 'SUCCESS' 
                            ? 'bg-green-500/10 text-green-400 border border-green-500/20' 
                            : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                        }`}>
                          Paiement : {order.payment?.status || 'PENDING'}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5 text-xs">
                      <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800">
                        <span className="text-neutral-500 block mb-1">Acheteur</span>
                        <span className="font-semibold text-white">{order.buyer?.name || 'Inconnu'}</span>
                        <span className="text-neutral-400 block text-[11px]">{order.buyer?.email}</span>
                      </div>
                      <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800">
                        <span className="text-neutral-500 block mb-1">Agent / Vendeur Assigné</span>
                        <span className="font-semibold text-white">{order.agent?.name || 'Non assigné'}</span>
                        <span className="text-neutral-400 block text-[11px]">{order.agent?.email}</span>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-neutral-950 p-4 rounded-xl border border-neutral-800 gap-3">
                      <div>
                        <span className="text-neutral-400 text-xs block">Montant Total en Séquestre (Escrow)</span>
                        <span className="font-bold text-orange-500 text-base">{order.totalUSD} $</span>
                        <span className="text-neutral-400 ml-1.5 text-xs">({order.totalCDF?.toLocaleString()} CDF)</span>
                      </div>
                      
                      {order.payment?.status !== 'SUCCESS' && (
                        <button 
                          onClick={() => handleValidateEscrow(order.id)}
                          className="bg-green-600 hover:bg-green-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition cursor-pointer flex items-center gap-2 shadow-lg shadow-green-600/20"
                        >
                          <ShieldCheck className="w-4 h-4" /> Libérer l'Escrow
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'chat' && (
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow-xl flex flex-col h-[550px]">
            <div className="border-b border-neutral-800 pb-3 mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-orange-500" /> Canal de communication direct avec la Logistique
                </h3>
                <p className="text-[11px] text-neutral-400">Échangez avec l'équipe logistique pour valider les expéditions.</p>
              </div>
              <span className="text-[10px] bg-orange-500/10 text-orange-400 border border-orange-500/20 px-2.5 py-1 rounded-full font-bold">Sécurisé & Privé</span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-2 mb-4">
              {messages.length === 0 ? (
                <div className="text-center text-neutral-500 text-xs py-20">
                  Aucun message dans cette conversation pour le moment.
                </div>
              ) : (
                messages.map((msg) => {
                  const isMe = msg.senderId === currentUserId;
                  return (
                    <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                      <span className="text-[10px] text-neutral-500 mb-1 px-1">
                        {msg.sender?.name || (isMe ? financeName : 'Logistique')} • {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <div className={`p-3 rounded-2xl text-xs max-w-md ${
                        isMe ? 'bg-orange-600 text-white rounded-tr-none' : 'bg-neutral-800 text-neutral-200 border border-neutral-700/60 rounded-tl-none'
                      }`}>
                        {msg.content}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <form onSubmit={handleSendMessage} className="flex items-center gap-2 pt-2 border-t border-neutral-800">
              <input 
                type="text" 
                placeholder="Écrivez un message à l'administrateur logistique..." 
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="flex-1 bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-orange-500 transition"
              />
              <button 
                type="submit" 
                className="bg-orange-600 hover:bg-orange-500 text-white px-5 py-3 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 shadow-lg shadow-orange-600/30"
              >
                <Send className="w-4 h-4" /> Envoyer
              </button>
            </form>
          </div>
        )}

        {activeTab === 'wallets' && (
          <div>
            {financeLoading ? (
              <div className="flex items-center justify-center py-24 text-orange-500 text-xs font-semibold gap-2">
                <span className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                Chargement des données financières...
              </div>
            ) : (
              <>
                {/* Cartes résumé */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                  <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4">
                    <span className="text-[10px] text-neutral-500 flex items-center gap-1"><Activity className="w-3 h-3" /> Circulation (USD)</span>
                    <p className="text-base font-black text-orange-500 mt-1">{financeStats?.totalCirculatingUSD.toFixed(2) || '0'} $</p>
                    <span className="text-[10px] text-neutral-500">{financeStats?.totalCirculatingCDF.toLocaleString() || 0} CDF</span>
                  </div>
                  <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4">
                    <span className="text-[10px] text-neutral-500 flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Total dépôts</span>
                    <p className="text-base font-black text-emerald-400 mt-1">{financeStats?.totalDeposits.toFixed(2) || '0'} $</p>
                  </div>
                  <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4">
                    <span className="text-[10px] text-neutral-500 flex items-center gap-1"><TrendingUp className="w-3 h-3 rotate-180" /> Total retraits</span>
                    <p className="text-base font-black text-rose-400 mt-1">{financeStats?.totalWithdrawals.toFixed(2) || '0'} $</p>
                  </div>
                  <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4">
                    <span className="text-[10px] text-neutral-500 flex items-center gap-1"><DollarSign className="w-3 h-3" /> Gains plateforme</span>
                    <p className="text-base font-black text-orange-400 mt-1">{financeStats?.platformEarnings.toFixed(2) || '0'} $</p>
                  </div>
                </div>

                {/* Graphique circulation */}
                <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 mb-6">
                  <h3 className="text-xs font-bold text-white mb-3 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-orange-500" /> Circulation de l'argent (30 derniers jours)
                  </h3>
                  {financeStats && financeStats.chartData.length > 0 ? (
                    <Line
                      data={{
                        labels: financeStats.chartData.map((d) => d.date),
                        datasets: [
                          {
                            label: 'Dépôts',
                            data: financeStats.chartData.map((d) => d.depots),
                            borderColor: '#34d399',
                            backgroundColor: 'rgba(52,211,153,0.15)',
                            tension: 0.3,
                            fill: true,
                          },
                          {
                            label: 'Retraits',
                            data: financeStats.chartData.map((d) => d.retraits),
                            borderColor: '#fb7185',
                            backgroundColor: 'rgba(251,113,133,0.15)',
                            tension: 0.3,
                            fill: true,
                          },
                        ],
                      }}
                      options={{
                        responsive: true,
                        plugins: { legend: { labels: { color: '#a3a3a3', font: { size: 10 } } } },
                        scales: {
                          x: { ticks: { color: '#737373', font: { size: 9 } }, grid: { display: false } },
                          y: { ticks: { color: '#737373', font: { size: 9 } }, grid: { color: '#262626' } },
                        },
                      }}
                      height={90}
                    />
                  ) : (
                    <p className="text-neutral-500 text-xs text-center py-8">Aucune donnée sur la période.</p>
                  )}
                </div>

                {/* Portefeuilles des utilisateurs */}
                <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 mb-6">
                  <h3 className="text-xs font-bold text-white mb-3 flex items-center gap-2">
                    <Users className="w-4 h-4 text-orange-500" /> Portefeuilles des utilisateurs ({walletRows.length})
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-[11px]">
                      <thead>
                        <tr className="text-neutral-500 border-b border-neutral-800">
                          <th className="text-left py-2 pr-3 font-semibold">Utilisateur</th>
                          <th className="text-left py-2 pr-3 font-semibold">Rôle</th>
                          <th className="text-right py-2 pr-3 font-semibold">Solde USD</th>
                          <th className="text-right py-2 font-semibold">Solde CDF</th>
                        </tr>
                      </thead>
                      <tbody>
                        {walletRows.length === 0 ? (
                          <tr><td colSpan={4} className="text-center text-neutral-500 py-6">Aucun utilisateur trouvé.</td></tr>
                        ) : (
                          walletRows.map((u) => (
                            <tr key={u.id} className="border-b border-neutral-800/60">
                              <td className="py-2 pr-3">
                                <span className="font-semibold text-white block">{u.name}</span>
                                <span className="text-neutral-500 block">{u.email}</span>
                              </td>
                              <td className="py-2 pr-3 text-neutral-400">{u.role}</td>
                              <td className="py-2 pr-3 text-right font-bold text-orange-500">{u.balanceUSD.toFixed(2)} $</td>
                              <td className="py-2 text-right text-neutral-300">{u.balanceCDF.toLocaleString()} CDF</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Toutes les transactions */}
                <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
                  <h3 className="text-xs font-bold text-white mb-3 flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-orange-500" /> Transactions de tous les utilisateurs ({globalTransactions.length})
                  </h3>
                  <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                    <table className="w-full text-[11px]">
                      <thead className="sticky top-0 bg-neutral-900">
                        <tr className="text-neutral-500 border-b border-neutral-800">
                          <th className="text-left py-2 pr-3 font-semibold">Utilisateur</th>
                          <th className="text-left py-2 pr-3 font-semibold">Type</th>
                          <th className="text-left py-2 pr-3 font-semibold">Statut</th>
                          <th className="text-right py-2 pr-3 font-semibold">Montant</th>
                          <th className="text-right py-2 font-semibold">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {globalTransactions.length === 0 ? (
                          <tr><td colSpan={5} className="text-center text-neutral-500 py-6">Aucune transaction enregistrée.</td></tr>
                        ) : (
                          globalTransactions.map((t) => (
                            <tr key={t.id} className="border-b border-neutral-800/60">
                              <td className="py-2 pr-3">
                                <span className="font-semibold text-white block">{t.user?.name || 'Inconnu'}</span>
                                <span className="text-neutral-500 block">{t.user?.email}</span>
                              </td>
                              <td className="py-2 pr-3">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${t.type === 'DEPOSIT' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                                  {t.type}
                                </span>
                              </td>
                              <td className="py-2 pr-3 text-neutral-400">{t.status}</td>
                              <td className="py-2 pr-3 text-right font-bold text-orange-500">
                                {t.amountUSD > 0 ? `${t.amountUSD.toFixed(2)} $` : `${t.amountCDF.toLocaleString()} CDF`}
                              </td>
                              <td className="py-2 text-right text-neutral-500">{new Date(t.createdAt).toLocaleDateString()}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}