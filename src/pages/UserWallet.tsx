import React, { useState, useEffect } from 'react';
import { X, User as UserIcon, Home, ArrowDownLeft, ArrowUpRight, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';


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

  // Profil Utilisateur
  const [profile, setProfile] = useState({ name: '', email: '', phone: '', avatar: '' });
  const [avatarPreview, setAvatarPreview] = useState<string>('');

  // Assistant modal (Wizard Dépôt / Retrait)
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
      console.error("Erreur de chargement des données", err);
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
          // Redirection vers l'interface de paiement sécurisée de l'agrégateur si nécessaire
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
      alert("Erreur de communication avec le serveur.");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading && !wallet) {
    return <div className="flex items-center justify-center min-h-screen bg-neutral-950 text-neutral-400 text-sm">Chargement du portefeuille sécurisé...</div>;
  }

  const metrics = statsData?.metrics;
  const chartData = statsData?.chartData || [];

  return (
    <div className="space-y-6 max-w-5xl mx-auto relative p-6 pb-28 bg-neutral-950 text-neutral-100 min-h-screen font-sans">
      
      {/* En-tête des Soldes */}
      <div className="flex justify-between items-center bg-neutral-900/90 border border-neutral-800 p-5 rounded-2xl shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-full bg-neutral-800 border-2 border-orange-500 overflow-hidden flex items-center justify-center">
            {avatarPreview ? <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" /> : <UserIcon className="w-6 h-6 text-neutral-400" />}
          </div>
          <div>
            <span className="text-[10px] font-semibold text-orange-400 uppercase tracking-wider">Portefeuille Sécurisé</span>
            <h2 className="text-lg font-bold">{profile.name}</h2>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-neutral-400">Solde Actuel</p>
          <p className="text-sm font-black text-emerald-400">${wallet?.balanceUSD?.toFixed(2) || '0.00'}</p>
          <p className="text-xs font-bold text-orange-400">{wallet?.balanceCDF?.toLocaleString() || '0'} CDF</p>
        </div>
      </div>

      {/* Filtres de Période */}
      <div className="flex justify-between items-center bg-neutral-900/80 border border-neutral-800 p-3 rounded-2xl">
        <h3 className="text-xs font-bold text-teal-400 uppercase tracking-wider">Statistiques et Flux Financier</h3>
        <div className="flex gap-1 bg-neutral-950 p-1 rounded-xl border border-neutral-800">
          {['7d', '30d', '90d', '365d'].map((r) => (
            <button
              key={r}
              onClick={() => setStatsRange(r)}
              className={`px-3 py-1 text-[11px] font-semibold rounded-lg transition-all ${statsRange === r ? 'bg-teal-600 text-white' : 'text-neutral-400 hover:text-white'}`}
            >
              {r === '7d' ? '7 Jours' : r === '30d' ? '1 Mois' : r === '90d' ? '3 Mois' : '1 An'}
            </button>
          ))}
        </div>
      </div>

      {/* Graphique Recharts */}
      <div className="bg-gradient-to-b from-teal-950/40 to-neutral-900/90 border border-teal-900/40 p-6 rounded-2xl shadow-xl space-y-4">
        <div className="flex justify-between items-center text-xs text-neutral-400">
          <span className="flex items-center gap-1.5 text-emerald-400 font-semibold"><span className="w-2.5 h-2.5 bg-emerald-500 rounded-full"></span> Entrées (Dépôts)</span>
          <span className="flex items-center gap-1.5 text-rose-400 font-semibold"><span className="w-2.5 h-2.5 bg-rose-500 rounded-full"></span> Sorties (Retraits)</span>
        </div>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <XAxis dataKey="date" stroke="#737373" fontSize={11} tickLine={false} />
              <YAxis stroke="#737373" fontSize={11} tickLine={false} />
              <Tooltip contentStyle={{ backgroundColor: '#171717', borderColor: '#262626', borderRadius: '12px', fontSize: '12px', color: '#fff' }} />
              <Area type="monotone" dataKey="total_montant" stroke="#10b981" strokeWidth={2.5} fill="#10b981" fillOpacity={0.2} name="Montant ($)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Cartes Analytiques */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-neutral-900 border border-neutral-800 p-5 rounded-2xl space-y-2">
          <span className="text-[10px] font-semibold text-neutral-400 uppercase">Total Déposé (Ce mois)</span>
          <p className="text-2xl font-black text-emerald-400">${metrics?.totalDepot?.toLocaleString() || '0.00'}</p>
          <p className={`text-xs font-semibold ${metrics?.evolutionPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {metrics?.evolutionPercent >= 0 ? `+${metrics?.evolutionPercent}%` : `${metrics?.evolutionPercent}%`} vs mois dernier
          </p>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 p-5 rounded-2xl space-y-2">
          <span className="text-[10px] font-semibold text-neutral-400 uppercase">Frais / Commissions Opérateurs</span>
          <p className="text-2xl font-black text-orange-400">${metrics?.totalFrais?.toFixed(2) || '0.00'}</p>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 p-5 rounded-2xl space-y-2">
          <span className="text-[10px] font-semibold text-neutral-400 uppercase">Bénéfice Net</span>
          <p className={`text-2xl font-black ${metrics?.beneficeNet >= 0 ? 'text-teal-400' : 'text-rose-400'}`}>
            ${metrics?.beneficeNet?.toFixed(2) || '0.00'}
          </p>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 p-5 rounded-2xl space-y-2">
          <span className="text-[10px] font-semibold text-neutral-400 uppercase">Taux d'Échec</span>
          <p className="text-2xl font-black text-rose-400">{metrics?.failureRate || '0'}%</p>
        </div>
      </div>

      {/* Barre de Navigation Fixe (Accès Dépôt / Retrait) */}
      <div className="fixed bottom-0 left-0 right-0 bg-neutral-900/95 border-neutral-800 border-t py-2.5 px-4 flex justify-around items-center z-40 max-w-5xl mx-auto rounded-t-2xl shadow-2xl">
        <button onClick={() => navigate('/accueil')} className="p-2 text-neutral-400 hover:text-orange-500 flex flex-col items-center gap-1">
          <Home className="w-5 h-5" /><span className="text-[10px]">Accueil</span>
        </button>
        <button onClick={() => startWizard('depot')} className="p-2 text-neutral-400 hover:text-emerald-500 flex flex-col items-center gap-1">
          <ArrowUpRight className="w-5 h-5 text-emerald-400" /><span className="text-[10px]">Dépôt</span>
        </button>
        <button onClick={() => startWizard('retrait')} className="p-2 text-neutral-400 hover:text-orange-500 flex flex-col items-center gap-1">
          <ArrowDownLeft className="w-5 h-5 text-orange-400" /><span className="text-[10px]">Retrait</span>
        </button>
        <button onClick={() => navigate('/profile')} className="p-2 text-neutral-400 hover:text-orange-500 flex flex-col items-center gap-1">
          <UserIcon className="w-5 h-5" /><span className="text-[10px]">Profil</span>
        </button>
      </div>

      {/* Assistant Modal Dépôt / Retrait Mobile Money */}
      {activeModal !== 'none' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="bg-neutral-900 border border-neutral-800 text-white w-full max-w-md rounded-2xl shadow-2xl p-5 space-y-4">
            <div className="flex justify-between items-center border-b border-neutral-800 pb-3">
              <h3 className="text-sm font-bold flex items-center gap-2">
                {activeModal === 'depot' ? 'Nouveau Dépôt Mobile Money' : 'Nouveau Retrait'} (Étape {wizardStep}/3)
              </h3>
              <button onClick={() => setActiveModal('none')} className="text-neutral-400 hover:text-white"><X className="w-4 h-4" /></button>
            </div>

            <form onSubmit={handleNextStep} className="space-y-4">
              {wizardStep === 1 && (
                <div>
                  <label className="block text-xs font-semibold text-neutral-400 mb-1">Montant à transférer</label>
                  <div className="flex gap-2">
                    <input type="number" value={actionAmount} onChange={(e) => setActionAmount(e.target.value)} placeholder="Ex: 20" required autoFocus className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-2.5 text-xs text-white" />
                    <select value={actionCurrency} onChange={(e) => setActionCurrency(e.target.value)} className="bg-neutral-950 border border-neutral-800 rounded-xl px-3 text-xs text-white">
                      <option value="USD">USD</option>
                      <option value="CDF">CDF</option>
                    </select>
                  </div>
                </div>
              )}

              {wizardStep === 2 && (
                <div className="space-y-2">
                  <p className="text-xs text-neutral-400">Sélectionnez l'agrégateur de paiement :</p>
                  {['M-Pesa', 'Orange Money', 'Airtel Money', 'Visa / Mastercard'].map((prov) => (
                    <button type="button" key={prov} onClick={() => setPaymentProvider(prov)} className={`w-full p-3 rounded-xl border text-left text-xs font-semibold flex justify-between ${paymentProvider === prov ? 'border-orange-500 bg-orange-950/40' : 'border-neutral-800 bg-neutral-950 text-neutral-300'}`}>
                      <span>{prov}</span>
                      {paymentProvider === prov && <CheckCircle className="w-4 h-4 text-orange-500" />}
                    </button>
                  ))}
                </div>
              )}

              {wizardStep === 3 && (
                <div>
                  <label className="block text-xs font-semibold text-neutral-400 mb-1">Numéro Mobile Money ({paymentProvider})</label>
                  <input type="text" value={paymentPhone} onChange={(e) => setPaymentPhone(e.target.value)} placeholder="Ex: +243990000000" required className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-2.5 text-xs text-white" />
                  <p className="text-[10px] text-neutral-500 mt-1.5">Un message USSD va s'afficher sur ce téléphone pour confirmer la transaction en entrant votre code secret.</p>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                {wizardStep > 1 && <button type="button" onClick={() => setWizardStep(wizardStep - 1)} className="bg-neutral-800 text-white py-2 px-4 rounded-xl text-xs">Retour</button>}
                <button type="submit" disabled={actionLoading} className="flex-1 bg-orange-600 hover:bg-orange-500 text-white font-semibold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1">
                  {actionLoading ? 'Traitement...' : wizardStep === 3 ? 'Confirmer le Paiement' : 'Suivant'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}