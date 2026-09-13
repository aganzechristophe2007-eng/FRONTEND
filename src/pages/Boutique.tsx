import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Store, MapPin, Phone, Image as ImageIcon, CheckCircle2, Clock, XCircle,
  ArrowLeft, Wallet, Home as HomeIcon, MessageSquare, User as UserIcon,
  Camera, Package, ShieldCheck, Sparkles, Loader2
} from 'lucide-react';
import { apiFetch } from '../api/client';

// Frais de certification boutique — À AJUSTER selon votre grille tarifaire réelle
const CERTIFICATION_FEE_USD = 10;

interface User {
  id?: string;
  _id?: string;
  name: string;
  balance: number;
}

interface BoutiqueStatus {
  status: 'none' | 'pending' | 'approved' | 'rejected';
  name?: string;
  location?: string;
  category?: string;
  phone?: string;
  description?: string;
  photos?: string[];
  rejectionReason?: string;
}

export default function Boutique() {
  const navigate = useNavigate();
  const location = useLocation();

  const [darkMode] = useState<boolean>(() => localStorage.getItem('cbfsoko-theme-mode') === 'light' ? false : true);
  const [token] = useState<string | null>(() => localStorage.getItem('token'));
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('user');
    try { return saved ? JSON.parse(saved) : null; } catch { return null; }
  });

  const [loading, setLoading] = useState(true);
  const [boutique, setBoutique] = useState<BoutiqueStatus>({ status: 'none' });
  const [showForm, setShowForm] = useState(false);

  // Champs du formulaire de candidature
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [city, setCity] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState<(File | null)[]>([null, null, null]);
  const [photoPreviews, setPhotoPreviews] = useState<(string | null)[]>([null, null, null]);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleProtectedAction = (destination: string) => {
    if (!token) navigate(`/login?redirect=${destination}`);
    else navigate(destination);
  };

  // Récupère le statut de certification boutique de l'utilisateur
  useEffect(() => {
    if (!token) { setLoading(false); return; }
    apiFetch('/boutiques/me')
      .then((data: any) => {
        if (data && data.status) setBoutique(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  const handlePhotoChange = (index: number, file: File | null) => {
    setPhotos(prev => { const next = [...prev]; next[index] = file; return next; });
    setPhotoPreviews(prev => {
      const next = [...prev];
      next[index] = file ? URL.createObjectURL(file) : null;
      return next;
    });
  };

  const isFormValid =
    name.trim().length > 1 &&
    city.trim().length > 1 &&
    phone.trim().length > 5 &&
    photos.every(p => p !== null);

  const hasEnoughBalance = (user?.balance ?? 0) >= CERTIFICATION_FEE_USD;

  const handleSubmitApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) { navigate('/login?redirect=/boutique'); return; }
    if (!isFormValid) { setSubmitError('Merci de remplir tous les champs obligatoires et d\'ajouter les 3 photos.'); return; }
    if (!hasEnoughBalance) { setSubmitError('Solde insuffisant pour couvrir les frais de certification.'); return; }

    setSubmitting(true);
    setSubmitError(null);
    try {
      const formData = new FormData();
      formData.append('name', name.trim());
      formData.append('category', category.trim());
      formData.append('city', city.trim());
      formData.append('neighborhood', neighborhood.trim());
      formData.append('address', address.trim());
      formData.append('phone', phone.trim());
      formData.append('description', description.trim());
      photos.forEach((file, i) => { if (file) formData.append(`photo${i + 1}`, file); });

      // NOTE BACKEND : cette route doit (1) débiter CERTIFICATION_FEE_USD du wallet,
      // (2) enregistrer la candidature en statut "pending", (3) notifier l'admin
      // (dashboard SUPER_ADMIN + email) pour validation manuelle.
      const res: any = await apiFetch('/boutiques/apply', { method: 'POST', body: formData });

      setBoutique({
        status: 'pending',
        name: name.trim(),
        location: `${city.trim()}${neighborhood ? ', ' + neighborhood.trim() : ''}`,
        category: category.trim(),
        phone: phone.trim(),
        description: description.trim(),
      });
      if (res?.balance !== undefined && user) {
        const updatedUser = { ...user, balance: res.balance };
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
      }
      setShowForm(false);
    } catch (err) {
      console.error('Erreur envoi candidature boutique', err);
      setSubmitError('Échec de l\'envoi de votre candidature. Réessayez dans un instant.');
    } finally {
      setSubmitting(false);
    }
  };

  const cardBase = darkMode ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-neutral-200';
  const inputBase = `w-full px-4 py-2.5 rounded-xl border text-xs outline-none focus:border-orange-600 ${darkMode ? 'bg-neutral-950 border-neutral-800 text-white placeholder-neutral-500' : 'bg-neutral-100 border-neutral-300 placeholder-neutral-400'}`;

  return (
    <div className={`min-h-screen flex flex-col transition-colors ${darkMode ? 'bg-neutral-950 text-white' : 'bg-neutral-50 text-neutral-900'}`}>

      {/* HEADER */}
      <header className={`sticky top-0 z-40 border-b backdrop-blur-md ${darkMode ? 'bg-neutral-950/95 border-neutral-800' : 'bg-white/95 border-neutral-200'}`}>
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate('/')} className={`p-2 rounded-full transition ${darkMode ? 'hover:bg-neutral-800' : 'hover:bg-neutral-100'}`}>
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="w-8 h-8 bg-orange-700 rounded-lg flex items-center justify-center flex-shrink-0">
            <Store className="w-4 h-4 text-white" />
          </div>
          <h1 className="font-extrabold text-sm sm:text-base">Boutique CBF</h1>
        </div>
      </header>

      {/* CONTENU */}
      <main className="flex-1 pb-24 sm:pb-10">
        <div className="max-w-4xl mx-auto px-4 py-6">

          {!token ? (
            <div className={`text-center py-10 rounded-2xl border ${cardBase}`}>
              <ShieldCheck className="w-8 h-8 text-orange-600 mx-auto mb-3" />
              <p className="text-sm font-bold mb-1">Connectez-vous pour accéder à la Boutique CBF</p>
              <p className="text-[11px] text-neutral-500 mb-4">Devenez vendeur ou agent certifié et vendez les produits officiels CBF.</p>
              <Link to="/login?redirect=/boutique" className="inline-block bg-orange-700 hover:bg-orange-800 text-white font-bold text-xs px-5 py-2.5 rounded-full transition">
                Se connecter
              </Link>
            </div>
          ) : loading ? (
            <div className="text-center py-16 text-neutral-500 text-xs flex flex-col items-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-orange-600" />
              Vérification de votre statut...
            </div>
          ) : boutique.status === 'approved' ? (
            <div className={`rounded-2xl border p-6 text-center ${cardBase}`}>
              <CheckCircle2 className="w-9 h-9 text-green-500 mx-auto mb-3" />
              <h2 className="font-extrabold text-base mb-1">Boutique certifiée ✅</h2>
              <p className="text-[11px] text-neutral-500 mb-4">{boutique.name} — {boutique.location}</p>
              <p className="text-xs text-neutral-400 mb-5">La gestion de votre boutique (produits CBF, commandes, statistiques) arrive très bientôt sur cette page.</p>
              <button onClick={() => handleProtectedAction('/create-product')} className="bg-orange-700 hover:bg-orange-800 text-white font-bold text-xs px-5 py-2.5 rounded-full transition">
                Poster un produit
              </button>
            </div>
          ) : boutique.status === 'pending' ? (
            <div className={`rounded-2xl border p-6 text-center ${cardBase}`}>
              <Clock className="w-9 h-9 text-orange-500 mx-auto mb-3" />
              <h2 className="font-extrabold text-base mb-1">Candidature envoyée</h2>
              <p className="text-[11px] text-neutral-500 mb-1">{boutique.name} — {boutique.location}</p>
              <p className="text-xs text-neutral-400">Votre dossier est en cours d'examen par l'administration CBF. Vous recevrez une notification dès validation.</p>
            </div>
          ) : (
            <>
              {boutique.status === 'rejected' && (
                <div className={`rounded-2xl border p-4 mb-4 flex items-start gap-3 ${darkMode ? 'bg-red-950/30 border-red-900' : 'bg-red-50 border-red-200'}`}>
                  <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-red-500">Candidature refusée</p>
                    <p className="text-[11px] text-neutral-500">{boutique.rejectionReason || 'Aucun motif communiqué.'} Vous pouvez soumettre un nouveau dossier.</p>
                  </div>
                </div>
              )}

              {!showForm ? (
                <div className={`rounded-2xl border p-6 text-center ${darkMode ? 'bg-gradient-to-b from-orange-900/20 to-neutral-900 border-orange-800/40' : 'bg-gradient-to-b from-orange-50 to-white border-orange-200'}`}>
                  <Sparkles className="w-8 h-8 text-orange-600 mx-auto mb-3" />
                  <h2 className="font-extrabold text-base mb-2">Devenez vendeur ou agent certifié CBF</h2>
                  <p className="text-xs text-neutral-500 mb-4 max-w-md mx-auto">
                    Gagnez de l'argent en vendant les produits officiels CBF. L'accès est réservé aux boutiques certifiées par la plateforme après vérification du dossier.
                  </p>
                  <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold mb-5 ${darkMode ? 'bg-neutral-900 border border-neutral-800' : 'bg-white border border-neutral-200'}`}>
                    <Wallet className="w-3.5 h-3.5 text-orange-600" /> Frais de certification : {CERTIFICATION_FEE_USD} $
                  </div>
                  <div>
                    <button onClick={() => setShowForm(true)} className="bg-orange-700 hover:bg-orange-800 text-white font-bold text-xs px-6 py-3 rounded-full transition">
                      Faire ma demande de certification
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmitApplication} className={`rounded-2xl border p-5 sm:p-6 space-y-4 ${cardBase}`}>
                  <h2 className="font-extrabold text-sm mb-1">Dossier de certification boutique</h2>
                  <p className="text-[11px] text-neutral-500 mb-4">Tous les champs sont obligatoires. Votre dossier sera transmis à l'administration CBF pour validation.</p>

                  <div>
                    <label className="text-[11px] font-bold block mb-1.5">Nom de la boutique *</label>
                    <input value={name} onChange={e => setName(e.target.value)} placeholder="Ex : Boutique Chris Electronics" className={inputBase} required />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold block mb-1.5">Catégorie d'activité</label>
                      <input value={category} onChange={e => setCategory(e.target.value)} placeholder="Ex : Électronique, Mode, Alimentation..." className={inputBase} />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold block mb-1.5">Téléphone de contact *</label>
                      <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+243 ..." className={inputBase} required />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold block mb-1.5 flex items-center gap-1"><MapPin className="w-3 h-3 text-orange-600" /> Ville *</label>
                      <input value={city} onChange={e => setCity(e.target.value)} placeholder="Ex : Bukavu" className={inputBase} required />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold block mb-1.5">Quartier / Commune</label>
                      <input value={neighborhood} onChange={e => setNeighborhood(e.target.value)} placeholder="Ex : Ibanda" className={inputBase} />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold block mb-1.5">Adresse / emplacement précis *</label>
                    <input value={address} onChange={e => setAddress(e.target.value)} placeholder="Avenue, numéro, point de repère..." className={inputBase} required />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold block mb-1.5">Description de la boutique</label>
                    <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="Décrivez brièvement votre activité..." className={inputBase} />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold block mb-2">Photos de la boutique (3 obligatoires) *</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[0, 1, 2].map(i => (
                        <label key={i} className={`aspect-square rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer overflow-hidden relative ${darkMode ? 'border-neutral-700 hover:border-orange-600' : 'border-neutral-300 hover:border-orange-600'}`}>
                          {photoPreviews[i] ? (
                            <img src={photoPreviews[i]!} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                          ) : (
                            <>
                              <Camera className="w-5 h-5 text-neutral-400 mb-1" />
                              <span className="text-[9px] text-neutral-400">Photo {i + 1}</span>
                            </>
                          )}
                          <input type="file" accept="image/*" className="hidden" onChange={e => handlePhotoChange(i, e.target.files?.[0] || null)} />
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className={`flex items-center justify-between rounded-xl px-4 py-3 text-xs ${darkMode ? 'bg-neutral-950 border border-neutral-800' : 'bg-neutral-100 border border-neutral-200'}`}>
                    <span className="flex items-center gap-1.5"><Wallet className="w-3.5 h-3.5 text-orange-600" /> Frais de certification</span>
                    <span className="font-black">{CERTIFICATION_FEE_USD} $</span>
                  </div>
                  {!hasEnoughBalance && (
                    <p className="text-[11px] text-red-500">
                      Solde insuffisant ({user?.balance ?? 0} $). <Link to="/wallet" className="underline">Rechargez votre portefeuille</Link>.
                    </p>
                  )}

                  {submitError && <p className="text-[11px] text-red-500">{submitError}</p>}

                  <div className="flex items-center gap-2 pt-2">
                    <button type="button" onClick={() => setShowForm(false)} className={`flex-1 py-2.5 rounded-full text-xs font-bold border transition ${darkMode ? 'border-neutral-700 hover:bg-neutral-800' : 'border-neutral-300 hover:bg-neutral-100'}`}>
                      Annuler
                    </button>
                    <button
                      type="submit"
                      disabled={submitting || !isFormValid || !hasEnoughBalance}
                      className="flex-1 py-2.5 rounded-full text-xs font-bold bg-orange-700 hover:bg-orange-800 disabled:opacity-50 text-white transition flex items-center justify-center gap-1.5"
                    >
                      {submitting ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Envoi...</> : 'Envoyer ma candidature'}
                    </button>
                  </div>
                </form>
              )}
            </>
          )}
        </div>
      </main>

      {/* BARRE D'ONGLETS MOBILE — cohérente avec Home.tsx */}
      <div className={`sm:hidden fixed bottom-0 left-0 right-0 z-50 border-t flex items-center justify-around py-2 px-1 backdrop-blur-md transition-colors ${
        darkMode ? 'bg-neutral-900/95 border-neutral-800 text-neutral-400' : 'bg-white/95 border-neutral-200 text-neutral-600'
      }`}>
        <Link to="/" className="flex flex-col items-center justify-center flex-1 py-1 transition hover:text-orange-600">
          <HomeIcon className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">Accueil</span>
        </Link>
        <Link to="/boutique" className="flex flex-col items-center justify-center flex-1 py-1 transition text-orange-600 font-bold">
          <Store className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">Boutique</span>
        </Link>
        <div className="flex flex-col items-center justify-center flex-1 -mt-4">
          <button onClick={() => handleProtectedAction('/create-product')} className="w-12 h-12 bg-orange-700 hover:bg-orange-800 text-white rounded-full flex items-center justify-center shadow-lg shadow-orange-700/40 border-4 border-neutral-950 transition transform active:scale-95">
            <Camera className="w-6 h-6" />
          </button>
          <span className="text-[10px] font-bold text-orange-600 mt-0.5">Poster</span>
        </div>
        <button onClick={() => handleProtectedAction('/messages')} className="flex flex-col items-center justify-center flex-1 py-1 transition hover:text-orange-600 bg-transparent border-none">
          <MessageSquare className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">Messages</span>
        </button>
        <button onClick={() => handleProtectedAction('/wallet')} className="flex flex-col items-center justify-center flex-1 py-1 transition hover:text-orange-600 bg-transparent border-none">
          <UserIcon className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">Profil</span>
        </button>
      </div>
    </div>
  );
}
