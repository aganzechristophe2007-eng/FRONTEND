import React, { useState, useEffect } from 'react';
import { Settings, X, User as UserIcon, Save, ArrowDownLeft, ArrowUpRight, History, Camera, Upload, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import heic2any from 'heic2any';

interface Transaction {
  id: string;
  amountUSD: number;
  amountCDF: number;
  type: string;
  status: string;
  provider?: string;
  createdAt: string;
}

interface WalletData {
  balanceUSD: number;
  balanceCDF: number;
  transactions: Transaction[];
}

interface UserProfile {
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
}

export default function UserWallet() {
  const navigate = useNavigate();

  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // États pour le Dépôt
  const [depositAmount, setDepositAmount] = useState<string>('');
  const [depositCurrency, setDepositCurrency] = useState<string>('USD');
  const [depositProvider, setDepositProvider] = useState<string>('MPESA');
  const [depositPhone, setDepositPhone] = useState<string>('');
  const [depositing, setDepositing] = useState<boolean>(false);
  const [depositMsg, setDepositMsg] = useState<{ text: string; success: boolean } | null>(null);

  // États pour le Retrait
  const [withdrawAmount, setWithdrawAmount] = useState<string>('');
  const [withdrawCurrency, setWithdrawCurrency] = useState<string>('USD');
  const [withdrawProvider, setWithdrawProvider] = useState<string>('MPESA');
  const [withdrawPhone, setWithdrawPhone] = useState<string>('');
  const [withdrawing, setWithdrawing] = useState<boolean>(false);
  const [withdrawMsg, setWithdrawMsg] = useState<{ text: string; success: boolean } | null>(null);

  // États pour le Modal Paramètres & Profil
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [profile, setProfile] = useState<UserProfile>({ name: '', email: '', phone: '', avatar: '' });
  const [updatingProfile, setUpdatingProfile] = useState<boolean>(false);
  const [profileMsg, setProfileMsg] = useState<{ text: string; success: boolean } | null>(null);

  // États pour la gestion de l'image (Fichier local & Aperçu)
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>('');

  const token = localStorage.getItem('token');

  // Fonction utilitaire pour formater correctement l'URL de l'avatar
  const getAvatarUrl = (path?: string) => {
    if (!path) return '';
    if (path.startsWith('http') || path.startsWith('blob:') || path.startsWith('data:')) {
      return path;
    }
    const cleanPath = path.replace(/\\/g, '/');
    if (!cleanPath.includes('uploads')) {
      const formattedPath = cleanPath.startsWith('/') ? cleanPath : `/${cleanPath}`;
      return `https://cbfsoko-backend.onrender.com/uploads${formattedPath}`;
    }
    const formattedPath = cleanPath.startsWith('/') ? cleanPath : `/${cleanPath}`;
    return `https://cbfsoko-backend.onrender.com${formattedPath}`;
  };

  useEffect(() => {
    const cachedAvatar = localStorage.getItem('offline_avatar');
    const cachedUser = localStorage.getItem('user');

    if (cachedAvatar) {
      setAvatarPreview(cachedAvatar);
    }

    if (cachedUser) {
      try {
        const parsedUser = JSON.parse(cachedUser);
        setProfile(prev => ({
          ...prev,
          name: parsedUser.name || '',
          email: parsedUser.email || '',
          phone: parsedUser.phone || '',
          avatar: parsedUser.avatar || ''
        }));
        if (parsedUser.avatar) {
          setAvatarPreview(getAvatarUrl(parsedUser.avatar));
        }
      } catch (e) {
        console.error("Erreur de lecture du cache utilisateur", e);
      }
    }

    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      const response = await fetch('https://cbfsoko-backend.onrender.com/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      
      if (response.ok) {
        const userData = data.data || data;
        
        // Mise à jour du Wallet si les propriétés existent
        setWallet(userData);

        // Mise à jour du Profil
        setProfile({
          name: userData.name || '',
          email: userData.email || '',
          phone: userData.phone || '',
          avatar: userData.avatar || ''
        });

        if (userData.avatar) {
          const fullAvatarUrl = getAvatarUrl(userData.avatar);
          setAvatarPreview(fullAvatarUrl);
          localStorage.setItem('offline_avatar', fullAvatarUrl);
        }
        localStorage.setItem('user', JSON.stringify(userData));
      } else {
        setError(data.message || 'Erreur lors du chargement.');
      }
    } catch (err) {
      setError('Impossible de se connecter au serveur.');
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    let file = e.target.files?.[0];
    if (!file) return;

    if (file.type === "image/heic" || file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif')) {
      try {
        const convertedBlob = await heic2any({
          blob: file,
          toType: "image/jpeg",
          quality: 0.8
        });

        const convertedFile = new File(
          [Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob], 
          file.name.replace(/\.[^/.]+$/, "") + ".jpg", 
          { type: "image/jpeg" }
        );

        file = convertedFile;
      } catch (error) {
        console.error("Erreur lors de la conversion du fichier HEIC :", error);
      }
    }

    setAvatarFile(file);
    const objectUrl = URL.createObjectURL(file);
    setAvatarPreview(objectUrl);
    
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        localStorage.setItem('offline_avatar', reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDepositing(true);
    setDepositMsg(null);

    try {
      const response = await fetch('https://cbfsoko-backend.onrender.com/api/wallet/deposit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          amount: parseFloat(depositAmount),
          currency: depositCurrency,
          provider: depositProvider,
          phoneNumber: depositPhone
        })
      });

      const data = await response.json();
      if (response.ok) {
        setDepositMsg({ text: 'Dépôt initié avec succès. Vérifiez votre téléphone.', success: true });
        setDepositAmount('');
        setDepositPhone('');
        fetchUserData();
      } else {
        setDepositMsg({ text: data.message || 'Erreur lors du dépôt.', success: false });
      }
    } catch (err) {
      setDepositMsg({ text: 'Erreur réseau.', success: false });
    } finally {
      setDepositing(false);
    }
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    setWithdrawing(true);
    setWithdrawMsg(null);

    try {
      const response = await fetch('https://cbfsoko-backend.onrender.com/api/wallet/withdraw', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          amount: parseFloat(withdrawAmount),
          currency: withdrawCurrency,
          provider: withdrawProvider,
          phoneNumber: withdrawPhone
        })
      });

      const data = await response.json();
      if (response.ok) {
        setWithdrawMsg({ text: 'Demande de retrait envoyée avec succès.', success: true });
        setWithdrawAmount('');
        setWithdrawPhone('');
        fetchUserData();
      } else {
        setWithdrawMsg({ text: data.message || 'Erreur lors du retrait.', success: false });
      }
    } catch (err) {
      setWithdrawMsg({ text: 'Erreur réseau.', success: false });
    } finally {
      setWithdrawing(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdatingProfile(true);
    setProfileMsg(null);

    try {
      const formData = new FormData();
      formData.append('name', profile.name);
      formData.append('phone', profile.phone || '');
      
      if (avatarFile) {
        formData.append('avatar', avatarFile);
      }

      const response = await fetch('https://cbfsoko-backend.onrender.com/api/auth/update-profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();
      if (response.ok) {
        setProfileMsg({ text: 'Profil mis à jour avec succès.', success: true });
        const updatedUser = data.data || data;
        
        localStorage.setItem('user', JSON.stringify(updatedUser));
        if (updatedUser.avatar) {
          const fullAvatarUrl = getAvatarUrl(updatedUser.avatar);
          localStorage.setItem('offline_avatar', fullAvatarUrl);
          setAvatarPreview(fullAvatarUrl);
        }
        
        setProfile(prev => ({
          ...prev,
          name: updatedUser.name || prev.name,
          phone: updatedUser.phone || prev.phone,
          avatar: updatedUser.avatar || prev.avatar
        }));

        window.dispatchEvent(new Event('avatar-updated'));

        setTimeout(() => {
          setIsSettingsOpen(false);
          setProfileMsg(null);
        }, 1200);
      } else {
        setProfileMsg({ text: data.message || 'Erreur lors de la mise à jour.', success: false });
      }
    } catch (err) {
      setProfileMsg({ text: 'Erreur réseau.', success: false });
    } finally {
      setUpdatingProfile(false);
    }
  };

  if (loading && !wallet) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-neutral-950 text-neutral-400">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
          <span>Chargement de votre portefeuille...</span>
        </div>
      </div>
    );
  }

  if (error && !wallet) {
    return (
      <div className="p-6 bg-neutral-900 border border-neutral-800 rounded-2xl max-w-4xl mx-auto mt-12 text-neutral-200 shadow-xl">
        <p className="text-red-400 font-medium">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto relative p-6 bg-neutral-950 min-h-screen text-neutral-100 font-sans flex flex-col justify-between">
      
      <div className="space-y-6">
        
        {/* BOUTON RETOUR À L'ACCUEIL */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/accueil')} 
            className="flex items-center gap-2 text-sm text-neutral-400 hover:text-white bg-neutral-900 border border-neutral-800 px-4 py-2 rounded-xl transition-all shadow-sm hover:border-neutral-700 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Retour à l'accueil</span>
          </button>
        </div>

        {/* En-tête profil */}
        <div className="flex justify-between items-center bg-neutral-900/80 backdrop-blur-md border border-neutral-800/80 p-6 rounded-2xl shadow-xl">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-neutral-800 border border-orange-500/50 overflow-hidden flex items-center justify-center shadow-md">
              {avatarPreview ? (
                <img 
                  src={avatarPreview} 
                  alt="Avatar" 
                  className="w-full h-full object-cover" 
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                <UserIcon className="w-6 h-6 text-neutral-400" />
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                {profile.name ? `Bienvenue, ${profile.name}` : "Mon Portefeuille & Finances"}
              </h2>
              <p className="text-xs text-neutral-400 mt-0.5">{profile.email || "Gérez vos fonds et suivez vos transactions en toute sécurité."}</p>
            </div>
          </div>
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="p-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-white rounded-xl transition-all flex items-center justify-center cursor-pointer shadow-md border border-neutral-700/60 hover:border-orange-500/50 group"
            title="Paramètres du profil"
          >
            <Settings className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
          </button>
        </div>

        {/* Soldes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="bg-neutral-900/90 border border-neutral-800/80 p-6 rounded-2xl shadow-xl relative overflow-hidden group">
            <p className="text-xs uppercase tracking-wider text-neutral-400 font-semibold">Solde en Dollars (USD)</p>
            <p className="text-3xl font-black text-emerald-400 mt-3 tracking-tight">
              ${wallet?.balanceUSD?.toFixed(2) || '0.00'}
            </p>
          </div>
          <div className="bg-neutral-900/90 border border-neutral-800/80 p-6 rounded-2xl shadow-xl relative overflow-hidden group">
            <p className="text-xs uppercase tracking-wider text-neutral-400 font-semibold">Solde en Francs Congolais (CDF)</p>
            <p className="text-3xl font-black text-orange-400 mt-3 tracking-tight">
              {wallet?.balanceCDF?.toLocaleString() || '0'} <span className="text-lg font-bold text-neutral-400">CDF</span>
            </p>
          </div>
        </div>

        {/* Formulaires Dépôt / Retrait */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-neutral-900/90 border border-neutral-800/80 p-6 rounded-2xl shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2.5 mb-5 text-emerald-400 font-bold text-base border-b border-neutral-800 pb-3">
                <div className="p-2 bg-emerald-500/10 rounded-lg">
                  <ArrowDownLeft className="w-4 h-4" />
                </div>
                <span>Effectuer un Dépôt</span>
              </div>
              {depositMsg && (
                <div className={`mb-4 p-3.5 rounded-xl text-xs font-medium ${depositMsg.success ? 'bg-emerald-950/80 border border-emerald-800/80 text-emerald-300' : 'bg-red-950/80 border border-red-800/80 text-red-300'}`}>
                  {depositMsg.text}
                </div>
              )}
              <form onSubmit={handleDeposit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-400 mb-1.5">Montant</label>
                  <input 
                    type="number" 
                    value={depositAmount} 
                    onChange={(e) => setDepositAmount(e.target.value)} 
                    placeholder="Ex: 20" 
                    required
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-emerald-500 transition-all shadow-inner"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-400 mb-1.5">Devise</label>
                    <select 
                      value={depositCurrency} 
                      onChange={(e) => setDepositCurrency(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-emerald-500 transition-all"
                    >
                      <option value="USD">USD ($)</option>
                      <option value="CDF">CDF (FC)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-neutral-400 mb-1.5">Opérateur</label>
                    <select 
                      value={depositProvider} 
                      onChange={(e) => setDepositProvider(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-emerald-500 transition-all"
                    >
                      <option value="MPESA">M-Pesa</option>
                      <option value="ORANGE_MONEY">Orange Money</option>
                      <option value="AIRTEL_MONEY">Airtel Money</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-400 mb-1.5">Numéro de téléphone</label>
                  <input 
                    type="text" 
                    value={depositPhone} 
                    onChange={(e) => setDepositPhone(e.target.value)} 
                    placeholder="Ex: +243..." 
                    required
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-emerald-500 transition-all shadow-inner"
                  />
                </div>
                <button 
                  type="submit" 
                  disabled={depositing}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3 rounded-xl text-sm transition-all cursor-pointer disabled:opacity-50 mt-2 shadow-lg shadow-emerald-900/20"
                >
                  {depositing ? 'Traitement en cours...' : 'Valider le dépôt'}
                </button>
              </form>
            </div>
          </div>

          <div className="bg-neutral-900/90 border border-neutral-800/80 p-6 rounded-2xl shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2.5 mb-5 text-orange-400 font-bold text-base border-b border-neutral-800 pb-3">
                <div className="p-2 bg-orange-500/10 rounded-lg">
                  <ArrowUpRight className="w-4 h-4" />
                </div>
                <span>Effectuer un Retrait</span>
              </div>
              {withdrawMsg && (
                <div className={`mb-4 p-3.5 rounded-xl text-xs font-medium ${withdrawMsg.success ? 'bg-emerald-950/80 border border-emerald-800/80 text-emerald-300' : 'bg-red-950/80 border border-red-800/80 text-red-300'}`}>
                  {withdrawMsg.text}
                </div>
              )}
              <form onSubmit={handleWithdraw} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-400 mb-1.5">Montant</label>
                  <input 
                    type="number" 
                    value={withdrawAmount} 
                    onChange={(e) => setWithdrawAmount(e.target.value)} 
                    placeholder="Ex: 10" 
                    required
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-orange-500 transition-all shadow-inner"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-400 mb-1.5">Devise</label>
                    <select 
                      value={withdrawCurrency} 
                      onChange={(e) => setWithdrawCurrency(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-orange-500 transition-all"
                    >
                      <option value="USD">USD ($)</option>
                      <option value="CDF">CDF (FC)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-neutral-400 mb-1.5">Opérateur</label>
                    <select 
                      value={withdrawProvider} 
                      onChange={(e) => setWithdrawProvider(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-orange-500 transition-all"
                    >
                      <option value="MPESA">M-Pesa</option>
                      <option value="ORANGE_MONEY">Orange Money</option>
                      <option value="AIRTEL_MONEY">Airtel Money</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-400 mb-1.5">Numéro de téléphone</label>
                  <input 
                    type="text" 
                    value={withdrawPhone} 
                    onChange={(e) => setWithdrawPhone(e.target.value)} 
                    placeholder="Ex: +243..." 
                    required
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-orange-500 transition-all shadow-inner"
                  />
                </div>
                <button 
                  type="submit" 
                  disabled={withdrawing}
                  className="w-full bg-orange-600 hover:bg-orange-500 text-white font-semibold py-3 rounded-xl text-sm transition-all cursor-pointer disabled:opacity-50 mt-2 shadow-lg shadow-orange-900/20"
                >
                  {withdrawing ? 'Traitement en cours...' : 'Valider le retrait'}
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Historique */}
        <div className="bg-neutral-900/90 border border-neutral-800/80 p-6 rounded-2xl shadow-xl">
          <div className="flex items-center gap-2.5 mb-5 text-white font-bold text-base">
            <History className="w-5 h-5 text-orange-500" />
            <h3>Historique des transactions</h3>
          </div>
          {wallet?.transactions && wallet.transactions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-neutral-800 text-neutral-400 text-xs uppercase tracking-wider">
                    <th className="pb-3 font-semibold">Type</th>
                    <th className="pb-3 font-semibold">Montant USD</th>
                    <th className="pb-3 font-semibold">Montant CDF</th>
                    <th className="pb-3 font-semibold">Statut</th>
                    <th className="pb-3 font-semibold">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/60">
                  {wallet.transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-neutral-800/30 transition-colors">
                      <td className="py-4 font-medium text-white">{tx.type}</td>
                      <td className="py-4 text-emerald-400 font-semibold">${tx.amountUSD}</td>
                      <td className="py-4 text-orange-400 font-semibold">{tx.amountCDF} CDF</td>
                      <td className="py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          tx.status === 'SUCCESS' ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60' : 
                          tx.status === 'PENDING' ? 'bg-amber-950/80 text-amber-400 border border-amber-800/60' : 'bg-red-950/80 text-red-400 border border-red-800/60'
                        }`}>
                          {tx.status}
                        </span>
                      </td>
                      <td className="py-4 text-neutral-400">{new Date(tx.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-neutral-500 text-sm">
              Aucune transaction pour le moment.
            </div>
          )}
        </div>
      </div>

      <footer className="mt-12 border-t border-neutral-800/80 pt-6 pb-2 text-center text-xs text-neutral-500">
        <p>© {new Date().getFullYear()} Mon Portefeuille. Tous droits réservés. Sécurisé par chiffrement SSL.</p>
      </footer>

      {/* MODAL PARAMÈTRES */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="bg-neutral-900 border border-neutral-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            
            <div className="flex justify-between items-center p-5 border-b border-neutral-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Settings className="w-5 h-5 text-orange-500" /> Paramètres du Profil
              </h3>
              <button 
                onClick={() => setIsSettingsOpen(false)}
                className="text-neutral-400 hover:text-white p-1.5 rounded-xl hover:bg-neutral-800 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateProfile} className="p-6 space-y-4">
              {profileMsg && (
                <div className={`p-3.5 rounded-xl text-xs font-medium ${profileMsg.success ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-red-950 text-red-300 border border-red-800'}`}>
                  {profileMsg.text}
                </div>
              )}

              <div className="flex flex-col items-center justify-center gap-3 py-2">
                <label className="relative group cursor-pointer">
                  <div className="w-20 h-20 rounded-full bg-neutral-950 border-2 border-orange-500/80 overflow-hidden flex items-center justify-center shadow-lg transition-transform group-hover:scale-105">
                    {avatarPreview ? (
                      <img src={avatarPreview} alt="Aperçu Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <UserIcon className="w-10 h-10 text-neutral-400" />
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <Upload className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <input 
                    type="file" 
                    accept="image/*,.heic,.heif" 
                    onChange={handleAvatarChange} 
                    className="hidden" 
                  />
                </label>
                <span className="text-xs text-orange-400 font-semibold flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5" />
                  Cliquez sur l'avatar pour choisir une image
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-400 mb-1.5">Nom complet</label>
                <input 
                  type="text"
                  value={profile.name}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  required
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-orange-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-400 mb-1.5">Adresse e-mail (Non modifiable)</label>
                <input 
                  type="email"
                  value={profile.email}
                  disabled
                  className="w-full bg-neutral-950/40 border border-neutral-800/60 rounded-xl p-3 text-sm text-neutral-500 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-400 mb-1.5">Numéro de téléphone</label>
                <input 
                  type="text"
                  value={profile.phone || ''}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  placeholder="Ex: +243..."
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-orange-500 transition-all"
                />
              </div>

              <div className="pt-3 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsSettingsOpen(false)}
                  className="flex-1 bg-neutral-800 hover:bg-neutral-700 text-white font-semibold py-3 rounded-xl text-sm transition-all cursor-pointer"
                >
                  Fermer
                </button>
                <button
                  type="submit"
                  disabled={updatingProfile}
                  className="flex-1 bg-orange-600 hover:bg-orange-500 text-white font-semibold py-3 rounded-xl text-sm transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-orange-900/20"
                >
                  <Save className="w-4 h-4" />
                  {updatingProfile ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}