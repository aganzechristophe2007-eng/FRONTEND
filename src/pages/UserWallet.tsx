import React, { useState, useEffect } from 'react';
import { X, User as UserIcon, Home, ArrowDownLeft, ArrowUpRight, CheckCircle, Wallet, TrendingUp, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface Transaction {
  id: string;
  montant: number;
  type: string;
  statut: string;
  agregateur: string;
  createdAt: string;
}

interface WalletData {
  balanceUSD: number;
  balanceCDF: number;
  transactions: Transaction[];
}

export default function UserWallet() {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [statsData, setStatsData] = useState<any>(null);
  const [statsRange, setStatsRange] = useState<string>('30d');
  const [loading, setLoading] = useState<boolean>(true);

  const [profile, setProfile] = useState({ name: '', email: '', phone: '', avatar: '' });
  const [avatarPreview, setAvatarPreview] = useState<string>('');

  const [activeModal, setActiveModal] = useState<'none' | 'depot' | 'retrait'>('none');
  const [wizardStep, setWizardStep] = useState<number>(1);
  const [actionType, setActionType] = useState<'depot' | 'retrait'>('depot');
  const [actionAmount, setActionAmount] = useState<string>('');
  const [actionCurrency, setActionCurrency] = useState<string>('USD');
  const [paymentProvider, setPaymentProvider] = useState<string>('M-Pesa');
  const [paymentPhone, setPaymentPhone] = useState<string>('');
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  useEffect(() => {
    fetchWalletAndStats();
  }, [statsRange]);

  const fetchWalletAndStats = async () => {
    try {
      setLoading(true);
      const resWallet = await fetch('https://cbfsoko-backend.onrender.com/api/wallet/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const dataWallet = await resWallet.json();
      if (resWallet.ok && dataWallet.success) {
        setWallet(dataWallet.data);
        setProfile({
          name: dataWallet.data.name || 'Utilisateur',
          email: dataWallet.data.email || '',
          phone: dataWallet.data.phone || '',
          avatar: dataWallet.data.avatar || ''
        });
        if (dataWallet.data.avatar) setAvatarPreview(dataWallet.data.avatar);
      }

      const resStats = await fetch(`https://cbfsoko-backend.onrender.com/api/wallet/statistics?range=${statsRange}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const dataStats = await resStats.json();
      if (resStats.ok && dataStats.success) {
        setStatsData(dataStats.data);
      }
    } catch (err) {
      console.error("Erreur de chargement", err);
    } finally {
      setLoading(false);
    }
  };

  const startWizard = (type: 'depot' | 'retrait') => {
    setActionType(type);
    setActiveModal(type);
    setWizardStep(1);
    setActionAmount('');
    setPaymentProvider('M-Pesa');
    setPaymentPhone(profile.phone || '');
  };

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (wizardStep === 1 && Number(actionAmount) > 0) setWizardStep(2);
    else if (wizardStep === 2) setWizardStep(3);
    else if (wizardStep === 3) executeTransaction();
  };

  const executeTransaction = async () => {
    setActionLoading(true);
    try {
      const response = await fetch('https://cbfsoko-backend.onrender.com/api/wallet/transaction', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          type: actionType,
          montant: Number(actionAmount),
          currency: actionCurrency,
          provider: paymentProvider,
          phone: paymentPhone
        })
      });

      const result = await response.json();
      if (response.ok && result.success) {
        if (result.paymentUrl) {
          window.location.href = result.paymentUrl;
        } else {
          alert(result.message);
          setActiveModal('none');
          fetchWalletAndStats();
        }
      } else {
        alert(result.message || "Échec de l'opération.");
      }
    } catch (err) {
      console.error(err);
      alert("Erreur de communication.");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading && !wallet) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-zinc-400 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 bg-orange-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
          <div className="w-2.5 h-2.5 bg-orange-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
          <div className="w-2.5 h-2.5 bg-orange-500 rounded-full animate-bounce"></div>
        </div>
      </div>
    );
  }

  const metrics = statsData?.metrics;
  const rawChartData = statsData?.chartData || [];

  const chartData = {
    labels: rawChartData.map((item: any) => item.date),
    datasets: [
      {
        fill: true,
        label: 'Montant ($)',
        data: rawChartData.map((item: any) => item.total_montant),
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.15)',
        borderWidth: 2,
        tension: 0.3,
        pointRadius: 2,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: '#18181b',
        borderColor: '#27272a',
        borderWidth: 1,
        titleFont: { size: 11 },
        bodyFont: { size: 11 },
        callbacks: {
          label: (context: any) => ` Montant: $${context.raw}`,
        }
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#737373', font: { size: 10 } }
      },
      y: {
        grid: { color: '#27272a', lineWidth: 0.5 },
        ticks: { color: '#737373', font: { size: 10 } }
      }
    }
  };

  return (
    <div className="space-y-4 max-w-4xl mx-auto relative p-3 sm:p-6 pb-24 bg-zinc-950 text-zinc-100 min-h-screen font-sans text-xs sm:text-sm">
      <div className="flex justify-between items-center bg-zinc-900 border border-zinc-800 p-4 rounded-2xl shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-zinc-800 border-2 border-orange-500 overflow-hidden flex items-center justify-center flex-shrink-0">
            {avatarPreview ? <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" /> : <UserIcon className="w-5 h-5 text-zinc-400" />}
          </div>
          <div>
            <span className="text-[9px] sm:text-[10px] font-bold text-orange-400 uppercase tracking-wider flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" /> Portefeuille Sécurisé
            </span>
            <h2 className="text-xs sm:text-base font-bold truncate max-w-[140px] sm:max-w-xs">{profile.name}</h2>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] sm:text-xs text-zinc-400">Solde Actuel</p>
          <p className="text-sm sm:text-base font-black text-emerald-400">${wallet?.balanceUSD?.toFixed(2) || '0.00'}</p>
          <p className="text-[11px] sm:text-xs font-bold text-orange-400">{wallet?.balanceCDF?.toLocaleString() || '0'} CDF</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 bg-zinc-900 border border-zinc-800 p-3 rounded-2xl">
        <h3 className="text-xs font-bold text-teal-400 uppercase tracking-wider flex items-center gap-1.5">
          <TrendingUp className="w-3.5 h-3.5" /> Statistiques et Flux
        </h3>
        <div className="flex gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800 w-full sm:w-auto justify-between">
          {['7d', '30d', '90d', '365d'].map((r) => (
            <button
              key={r}
              onClick={() => setStatsRange(r)}
              className={`flex-1 sm:flex-none px-2.5 py-1 text-[10px] sm:text-xs font-semibold rounded-lg transition-all ${statsRange === r ? 'bg-teal-600 text-white' : 'text-zinc-400 hover:text-white'}`}
            >
              {r === '7d' ? '7J' : r === '30d' ? '1M' : r === '90d' ? '3M' : '1A'}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-zinc-900 border border-teal-900/30 p-4 rounded-2xl shadow-lg space-y-3">
        <div className="flex justify-between items-center text-[10px] sm:text-xs text-zinc-400">
          <span className="flex items-center gap-1 text-emerald-400 font-semibold"><span className="w-2 h-2 bg-emerald-500 rounded-full"></span> Entrées</span>
          <span className="flex items-center gap-1 text-rose-400 font-semibold"><span className="w-2 h-2 bg-rose-500 rounded-full"></span> Sorties</span>
        </div>
        <div className="h-56 sm:h-64 w-full relative">
          <Line data={chartData} options={chartOptions} />
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-zinc-900 border border-zinc-800 p-3.5 rounded-2xl space-y-1">
          <span className="text-[9px] font-semibold text-zinc-400 uppercase">Total Déposé</span>
          <p className="text-base sm:text-lg font-black text-emerald-400">${metrics?.totalDepot?.toLocaleString() || '0.00'}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 p-3.5 rounded-2xl space-y-1">
          <span className="text-[9px] font-semibold text-zinc-400 uppercase">Frais / Comm.</span>
          <p className="text-base sm:text-lg font-black text-orange-400">${metrics?.totalFrais?.toFixed(2) || '0.00'}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 p-3.5 rounded-2xl space-y-1">
          <span className="text-[9px] font-semibold text-zinc-400 uppercase">Bénéfice Net</span>
          <p className={`text-base sm:text-lg font-black ${metrics?.beneficeNet >= 0 ? 'text-teal-400' : 'text-rose-400'}`}>
            ${metrics?.beneficeNet?.toFixed(2) || '0.00'}
          </p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 p-3.5 rounded-2xl space-y-1">
          <span className="text-[9px] font-semibold text-zinc-400 uppercase">Taux d'Échec</span>
          <p className="text-base sm:text-lg font-black text-rose-400">{metrics?.failureRate || '0'}%</p>
        </div>
      </div>

      <nav className="fixed bottom-0 left-0 right-0 bg-zinc-900 border-t border-zinc-800 py-2 px-4 flex justify-around items-center z-40 max-w-4xl mx-auto shadow-2xl">
        <button onClick={() => navigate('/accueil')} className="p-1.5 text-zinc-400 hover:text-orange-500 flex flex-col items-center gap-0.5 cursor-pointer">
          <Home className="w-4 h-4" /><span className="text-[9px]">Accueil</span>
        </button>
        <button onClick={() => startWizard('depot')} className="p-1.5 text-zinc-400 hover:text-emerald-500 flex flex-col items-center gap-0.5 cursor-pointer">
          <ArrowUpRight className="w-4 h-4 text-emerald-400" /><span className="text-[9px]">Dépôt</span>
        </button>
        <button onClick={() => startWizard('retrait')} className="p-1.5 text-zinc-400 hover:text-orange-500 flex flex-col items-center gap-0.5 cursor-pointer">
          <ArrowDownLeft className="w-4 h-4 text-orange-400" /><span className="text-[9px]">Retrait</span>
        </button>
        <button onClick={() => navigate('/profile')} className="p-1.5 text-zinc-400 hover:text-orange-500 flex flex-col items-center gap-0.5 cursor-pointer">
          <UserIcon className="w-4 h-4" /><span className="text-[9px]">Profil</span>
        </button>
      </nav>

      {activeModal !== 'none' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3">
          <div className="bg-zinc-900 border border-zinc-800 text-white w-full max-w-sm rounded-2xl shadow-2xl p-4 space-y-3">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-2.5">
              <h3 className="text-xs font-bold flex items-center gap-1.5">
                <Wallet className="w-3.5 h-3.5 text-orange-500" />
                {activeModal === 'depot' ? 'Dépôt' : 'Retrait'} ({wizardStep}/3)
              </h3>
              <button onClick={() => setActiveModal('none')} className="text-zinc-400 hover:text-white cursor-pointer"><X className="w-4 h-4" /></button>
            </div>

            <form onSubmit={handleNextStep} className="space-y-3">
              {wizardStep === 1 && (
                <div>
                  <label className="block text-[10px] font-semibold text-zinc-400 mb-1">Montant</label>
                  <div className="flex gap-2">
                    <input type="number" value={actionAmount} onChange={(e) => setActionAmount(e.target.value)} placeholder="Ex: 20" required autoFocus className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2 text-xs text-white outline-none focus:border-orange-500" />
                    <select value={actionCurrency} onChange={(e) => setActionCurrency(e.target.value)} className="bg-zinc-950 border border-zinc-800 rounded-xl px-2 text-xs text-white outline-none">
                      <option value="USD">USD</option>
                      <option value="CDF">CDF</option>
                    </select>
                  </div>
                </div>
              )}

              {wizardStep === 2 && (
                <div className="space-y-1.5">
                  <p className="text-[10px] text-zinc-400">Agrégateur de paiement :</p>
                  {['M-Pesa', 'Orange Money', 'Airtel Money', 'Visa / Mastercard'].map((prov) => (
                    <button type="button" key={prov} onClick={() => setPaymentProvider(prov)} className={`w-full p-2.5 rounded-xl border text-left text-xs font-semibold flex justify-between items-center cursor-pointer ${paymentProvider === prov ? 'border-orange-500 bg-orange-950/30' : 'border-zinc-800 bg-zinc-950 text-zinc-300'}`}>
                      <span>{prov}</span>
                      {paymentProvider === prov && <CheckCircle className="w-3.5 h-3.5 text-orange-500" />}
                    </button>
                  ))}
                </div>
              )}

              {wizardStep === 3 && (
                <div>
                  <label className="block text-[10px] font-semibold text-zinc-400 mb-1">Numéro ({paymentProvider})</label>
                  <input type="text" value={paymentPhone} onChange={(e) => setPaymentPhone(e.target.value)} placeholder="Ex: +243990000000" required className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2 text-xs text-white outline-none focus:border-orange-500" />
                  <p className="text-[9px] text-zinc-500 mt-1">Un message USSD s'affichera pour confirmer.</p>
                </div>
              )}

              <div className="flex gap-2 pt-1">
                {wizardStep > 1 && <button type="button" onClick={() => setWizardStep(wizardStep - 1)} className="bg-zinc-800 hover:bg-zinc-700 text-white py-2 px-3 rounded-xl text-xs cursor-pointer">Retour</button>}
                <button type="submit" disabled={actionLoading} className="flex-1 bg-orange-600 hover:bg-orange-500 text-white font-semibold py-2 rounded-xl text-xs flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50">
                  {actionLoading ? 'Patientez...' : wizardStep === 3 ? 'Confirmer' : 'Suivant'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}