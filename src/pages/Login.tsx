import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { ArrowRight, ArrowLeft, Mail, Lock, User as UserIcon, Phone, Eye, EyeOff, CheckCircle, AlertCircle, Share2, Users, Search, HelpCircle } from 'lucide-react';

export default function Login() {
  const [step, setStep] = useState<'welcome' | 'intent' | 'method' | 'referral' | 'name' | 'phone' | 'email' | 'password'>('welcome');
  
  const [isFirstTime, setIsFirstTime] = useState<boolean | null>(null);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [forgotStep, setForgotStep] = useState<'request' | 'verify' | 'reset'>('request');

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [referralSource, setReferralSource] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectUrl = searchParams.get('redirect') || '/';

  const referralOptions = [
    { id: 'social', label: 'Réseaux sociaux (Facebook, WhatsApp...)', icon: Share2 },
    { id: 'friend', label: "Un ami ou un proche m'en a parlé", icon: Users },
    { id: 'search', label: 'Recherche Google / Internet', icon: Search },
    { id: 'other', label: 'Autre', icon: HelpCircle },
  ];

  const handleSocialLogin = (provider: 'google' | 'facebook') => {
    window.location.href = `https://cbfsoko-backend.onrender.com/api/auth/${provider}`;
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      if (forgotStep === 'request') {
        const res = await fetch('https://cbfsoko-backend.onrender.com/api/auth/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Erreur lors de l'envoi du code.");
        
        setSuccessMsg("Un code PIN de vérification a été envoyé à votre email.");
        setForgotStep('verify');
      } else if (forgotStep === 'verify') {
        const res = await fetch('https://cbfsoko-backend.onrender.com/api/auth/verify-pin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, pin: pinCode }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Code PIN invalide.");
        
        setSuccessMsg("Code vérifié avec succès. Entrez votre nouveau mot de passe.");
        setForgotStep('reset');
      } else if (forgotStep === 'reset') {
        const res = await fetch('https://cbfsoko-backend.onrender.com/api/auth/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, pin: pinCode, newPassword }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Erreur lors de la réinitialisation.");

        setSuccessMsg("Mot de passe modifié avec succès ! Connectez-vous.");
        setTimeout(() => {
          setIsForgotPassword(false);
          setForgotStep('request');
          setStep('welcome');
          setSuccessMsg('');
        }, 2000);
      }
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue.');
      setShakeKey(prev => prev + 1);
    } finally {
      setLoading(false);
    }
  };

  const handleFinalSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      const endpoint = isFirstTime 
        ? 'https://cbfsoko-backend.onrender.com/api/auth/register' 
        : 'https://cbfsoko-backend.onrender.com/api/auth/login';
      
      const payload = isFirstTime 
        ? { name, email, password, phone, referralSource } 
        : { email, password };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      
      if (!response.ok) {
        if (isFirstTime && response.status === 400 && (result.message?.toLowerCase().includes('existe') || result.message?.toLowerCase().includes('already'))) {
          throw new Error("Cet e-mail possède déjà un compte. Veuillez vous connecter.");
        }
        throw new Error(result.message || (isFirstTime ? "Erreur lors de l'inscription." : 'Email ou mot de passe incorrect.'));
      }

      if (!result.token) {
        throw new Error("Token d'authentification manquant.");
      }

      localStorage.setItem('token', result.token);
      localStorage.setItem('user', JSON.stringify(result.data || result.user));

      const userObj = result.data || result.user;
      let userRole = userObj?.role ? userObj.role.toUpperCase() : 'USER';
      
      const cleanEmail = email.trim().toLowerCase();
      if (cleanEmail === 'benjaminkulimushi1@gmail.com') userRole = 'ADMIN';
      else if (cleanEmail === 'mambofelicien91@gmail.com') userRole = 'ADMIN_FINANCE';

      if (userRole === 'SUPER_ADMIN') {
        window.location.href = '/admin/dashboard';
      } else if (userRole === 'ADMIN') {
        window.location.href = '/admin/seller-dashboard';
      } else if (userRole === 'ADMIN_FINANCE') {
        window.location.href = '/admin/finances-dashboard';
      } else {
        navigate(redirectUrl === '/' ? '/' : redirectUrl, { replace: true });
      }

    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue.');
      setShakeKey(prev => prev + 1);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex flex-col justify-between px-5 py-6 sm:px-8 md:p-16 relative overflow-x-hidden">
      <div className="absolute w-[350px] md:w-[500px] h-[350px] md:h-[500px] bg-orange-600/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="flex justify-between items-center z-10 max-w-2xl w-full mx-auto">
        {step !== 'welcome' || isForgotPassword ? (
          <button 
            onClick={() => {
              if (isForgotPassword) {
                if (forgotStep === 'verify') setForgotStep('request');
                else if (forgotStep === 'reset') setForgotStep('verify');
                else { setIsForgotPassword(false); setStep('welcome'); }
              } else {
                if (step === 'intent') setStep('welcome');
                else if (step === 'method') setStep('intent');
                else if (step === 'referral') setStep('method');
                else if (step === 'name') setStep('referral');
                else if (step === 'phone') setStep('name');
                else if (step === 'email') setStep(isFirstTime ? 'phone' : 'intent');
                else if (step === 'password') setStep('email');
              }
              setError('');
              setSuccessMsg('');
            }}
            className="text-neutral-400 hover:text-white text-xs font-medium flex items-center gap-2 transition cursor-pointer py-2"
          >
            <ArrowLeft className="w-4 h-4" /> Retour
          </button>
        ) : (
          <Link to="/" className="text-neutral-500 hover:text-neutral-300 text-xs font-medium transition py-2">
            ← Accueil
          </Link>
        )}
      </div>

      <motion.div 
        key={shakeKey}
        animate={error ? { x: [-12, 12, -12, 12, -8, 8, -4, 4, 0] } : {}}
        transition={{ duration: 0.5 }}
        className="max-w-xl w-full mx-auto z-10 my-auto py-4 flex flex-col items-center text-center"
      >
        <div className="w-full text-left">
          {error && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-3">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span className="leading-relaxed">{error}</span>
            </motion.div>
          )}

          {successMsg && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-5 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-3">
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              <span className="leading-relaxed">{successMsg}</span>
            </motion.div>
          )}

          <AnimatePresence mode="wait">
            {isForgotPassword ? (
              <motion.div key="forgot" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} className="space-y-5">
                <h1 className="text-2xl sm:text-3xl md:text-5xl font-extrabold tracking-tight leading-tight">
                  Récupération de mot de passe
                </h1>
                <p className="text-neutral-400 text-xs sm:text-sm">
                  {forgotStep === 'request' && "Entrez votre email pour recevoir votre code PIN de vérification."}
                  {forgotStep === 'verify' && "Entrez le code à 6 chiffres envoyé à votre adresse email."}
                  {forgotStep === 'reset' && "Choisissez un nouveau mot de passe sécurisé."}
                </p>

                <form onSubmit={handleForgotPasswordSubmit} className="space-y-5">
                  {forgotStep === 'request' && (
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                      <input 
                        type="email" autoFocus required value={email} onChange={e => setEmail(e.target.value)}
                        placeholder="nom@exemple.com"
                        className="w-full bg-neutral-900 border border-neutral-800 rounded-xl pl-11 pr-4 py-3.5 text-white placeholder-neutral-600 focus:outline-none focus:border-orange-500 text-sm sm:text-base transition"
                      />
                    </div>
                  )}

                  {forgotStep === 'verify' && (
                    <input 
                      type="text" autoFocus required value={pinCode} onChange={e => setPinCode(e.target.value)}
                      placeholder="Code à 6 chiffres"
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3.5 text-white tracking-widest text-center placeholder-neutral-600 focus:outline-none focus:border-orange-500 text-sm sm:text-base transition"
                    />
                  )}

                  {forgotStep === 'reset' && (
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                      <input 
                        type={showPassword ? 'text' : 'password'} autoFocus required value={newPassword} onChange={e => setNewPassword(e.target.value)}
                        placeholder="Nouveau mot de passe"
                        className="w-full bg-neutral-900 border border-neutral-800 rounded-xl pl-11 pr-12 py-3.5 text-white placeholder-neutral-600 focus:outline-none focus:border-orange-500 text-sm sm:text-base transition"
                      />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white transition cursor-pointer p-1">
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  )}

                  <button type="submit" disabled={loading} className="w-full py-3.5 sm:py-4 rounded-xl border border-orange-500 bg-orange-600 text-white font-bold hover:bg-orange-700 transition cursor-pointer text-xs sm:text-sm uppercase tracking-wider disabled:opacity-40 flex items-center justify-center gap-2 shadow-lg shadow-orange-600/20">
                    {loading ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : (
                      <>
                        {forgotStep === 'request' && 'Envoyer le code PIN'}
                        {forgotStep === 'verify' && 'Vérifier le code'}
                        {forgotStep === 'reset' && 'Mettre à jour'}
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              </motion.div>
            ) : (
              <>
                {step === 'welcome' && (
                  <motion.div key="welcome" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} className="space-y-6 sm:space-y-8">
                    <h1 className="text-2xl sm:text-4xl md:text-5xl font-extrabold tracking-tight leading-tight">
                      Bienvenue sur notre site.
                    </h1>
                    <p className="text-neutral-400 text-xs sm:text-sm md:text-base font-light">
                      Commençons par faire connaissance. Êtes-vous ici pour la toute première fois ?
                    </p>
                    <div className="flex flex-col gap-3.5 pt-1">
                      <button
                        onClick={() => { setIsFirstTime(true); setStep('intent'); }}
                        className="text-left py-3.5 sm:py-4 px-4 sm:px-5 rounded-2xl text-sm sm:text-base md:text-lg font-semibold text-white transition flex items-center justify-between group cursor-pointer border border-neutral-800 hover:border-orange-500 bg-neutral-900/60 hover:bg-neutral-900"
                      >
                        <span>Oui, c'est ma première fois</span>
                        <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 opacity-0 group-hover:opacity-100 transition text-orange-500" />
                      </button>
                      <button
                        onClick={() => { setIsFirstTime(false); setStep('intent'); }}
                        className="text-left py-3.5 sm:py-4 px-4 sm:px-5 rounded-2xl text-sm sm:text-base md:text-lg font-semibold text-neutral-300 transition flex items-center justify-between group cursor-pointer border border-neutral-800 hover:border-neutral-500 bg-neutral-900/60 hover:bg-neutral-900"
                      >
                        <span>Non, j'ai déjà un compte</span>
                        <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 opacity-0 group-hover:opacity-100 transition text-white" />
                      </button>
                    </div>
                  </motion.div>
                )}

                {step === 'intent' && (
                  <motion.div key="intent" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} className="space-y-6 sm:space-y-8">
                    <h1 className="text-2xl sm:text-4xl md:text-5xl font-extrabold tracking-tight leading-tight">
                      {isFirstTime ? "Comment souhaitez-vous créer votre compte ?" : "Comment souhaitez-vous vous connecter ?"}
                    </h1>
                    
                    <div className="space-y-3 pt-1">
                      <button
                        onClick={() => handleSocialLogin('google')}
                        className="w-full text-left py-3.5 sm:py-4 px-4 sm:px-5 rounded-2xl text-sm sm:text-base font-medium text-white transition flex items-center justify-between border border-neutral-800 hover:border-orange-500 bg-neutral-900/60 hover:bg-neutral-900 cursor-pointer group"
                      >
                        <div className="flex items-center gap-3">
                          <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                            <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.8 7.4l3.7 2.9C6.4 7.2 9 5 12 5z" />
                            <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z" />
                            <path fill="#FBBC05" d="M5.5 14.7c-.2-.8-.4-1.7-.4-2.7s.2-1.9.4-2.7L1.8 6.4C.7 8.6 0 11.2 0 14s.7 5.4 1.8 7.6l3.7-2.9z" />
                            <path fill="#34A853" d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.6-2.2-6.5-5.3L1.8 15.9C3.7 19.7 7.5 23 12 23z" />
                          </svg>
                          <span className="truncate">Continuer avec Google</span>
                        </div>
                        <span className="text-[10px] bg-orange-500/10 text-orange-400 px-2.5 py-1 rounded-full font-semibold flex-shrink-0">Recommandé</span>
                      </button>

                      <button
                        onClick={() => handleSocialLogin('facebook')}
                        className="w-full text-left py-3.5 sm:py-4 px-4 sm:px-5 rounded-2xl text-sm sm:text-base font-medium text-white transition flex items-center justify-between border border-neutral-800 hover:border-blue-500 bg-neutral-900/60 hover:bg-neutral-900 cursor-pointer group"
                      >
                        <div className="flex items-center gap-3">
                          <svg className="w-5 h-5 fill-blue-500 flex-shrink-0" viewBox="0 0 24 24">
                            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                          </svg>
                          <span className="truncate">Continuer avec Facebook</span>
                        </div>
                        <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition text-blue-400 flex-shrink-0" />
                      </button>

                      <button
                        onClick={() => setStep(isFirstTime ? 'referral' : 'email')}
                        className="w-full text-left py-3.5 sm:py-4 px-4 sm:px-5 rounded-2xl text-sm sm:text-base font-medium text-white transition flex items-center justify-between border border-neutral-800 hover:border-orange-500 bg-neutral-900/60 hover:bg-neutral-900 cursor-pointer group"
                      >
                        <div className="flex items-center gap-3">
                          <Mail className="w-5 h-5 text-orange-500 flex-shrink-0" />
                          <span className="truncate">Continuer avec une adresse Email</span>
                        </div>
                        <ArrowRight className="w-4 h-4 text-orange-500 flex-shrink-0" />
                      </button>
                    </div>
                  </motion.div>
                )}

                {step === 'referral' && (
                  <motion.div key="referral" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} className="space-y-5">
                    <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight">Comment avez-vous connu CBFSOKO ?</h1>
                    <p className="text-neutral-400 text-xs">Sélectionnez l'option qui correspond le mieux.</p>
                    
                    <div className="space-y-2.5 pt-1">
                      {referralOptions.map((opt) => {
                        const IconComp = opt.icon;
                        const isSelected = referralSource === opt.label;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => {
                              setReferralSource(opt.label);
                              setStep('name');
                            }}
                            className={`w-full text-left py-3 px-4 rounded-xl text-xs sm:text-sm font-medium transition flex items-center justify-between border cursor-pointer ${
                              isSelected 
                                ? 'border-orange-500 bg-orange-500/10 text-orange-400' 
                                : 'border-neutral-800 bg-neutral-900/60 text-white hover:border-orange-500/50'
                            }`}
                          >
                            <div className="flex items-center gap-3 truncate">
                              <IconComp className="w-4 h-4 text-orange-500 flex-shrink-0" />
                              <span className="truncate">{opt.label}</span>
                            </div>
                            <ArrowRight className="w-4 h-4 text-neutral-500 flex-shrink-0" />
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}

                {step === 'name' && (
                  <motion.div key="name" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} className="space-y-5">
                    <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight">Quel est votre nom complet ?</h1>
                    <form onSubmit={(e) => { e.preventDefault(); if (name.trim()) setStep('phone'); }} className="space-y-5">
                      <div className="relative">
                        <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                        <input 
                          type="text" autoFocus required value={name} onChange={e => setName(e.target.value)}
                          placeholder="ex: Benjamin Kulimushi"
                          className="w-full bg-neutral-900 border border-neutral-800 rounded-xl pl-11 pr-4 py-3.5 text-white placeholder-neutral-600 focus:outline-none focus:border-orange-500 text-sm sm:text-base transition"
                        />
                      </div>
                      <button type="submit" className="px-6 py-3 rounded-xl border border-orange-500 text-orange-500 font-bold hover:bg-orange-500 hover:text-white transition cursor-pointer text-xs uppercase tracking-wider flex items-center gap-2">
                        Continuer <ArrowRight className="w-4 h-4" />
                      </button>
                    </form>
                  </motion.div>
                )}

                {step === 'phone' && (
                  <motion.div key="phone" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} className="space-y-5">
                    <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight">Quel est votre numéro de téléphone ?</h1>
                    <p className="text-neutral-400 text-xs">Nécessaire pour vos livraisons et communications.</p>
                    <form onSubmit={(e) => { e.preventDefault(); if (phone.trim()) setStep('email'); }} className="space-y-5">
                      <div className="relative">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                        <input 
                          type="tel" autoFocus required value={phone} onChange={e => setPhone(e.target.value)}
                          placeholder="+243..."
                          className="w-full bg-neutral-900 border border-neutral-800 rounded-xl pl-11 pr-4 py-3.5 text-white placeholder-neutral-600 focus:outline-none focus:border-orange-500 text-sm sm:text-base transition"
                        />
                      </div>
                      <button type="submit" className="px-6 py-3 rounded-xl border border-orange-500 text-orange-500 font-bold hover:bg-orange-500 hover:text-white transition cursor-pointer text-xs uppercase tracking-wider flex items-center gap-2">
                        Continuer <ArrowRight className="w-4 h-4" />
                      </button>
                    </form>
                  </motion.div>
                )}

                {step === 'email' && (
                  <motion.div key="email" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} className="space-y-5">
                    <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight">Quelle est votre adresse email ?</h1>
                    <form onSubmit={(e) => { e.preventDefault(); if (email.trim()) setStep('password'); }} className="space-y-5">
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                        <input 
                          type="email" autoFocus required value={email} onChange={e => setEmail(e.target.value)}
                          placeholder="nom@exemple.com"
                          className="w-full bg-neutral-900 border border-neutral-800 rounded-xl pl-11 pr-4 py-3.5 text-white placeholder-neutral-600 focus:outline-none focus:border-orange-500 text-sm sm:text-base transition"
                        />
                      </div>
                      <button type="submit" className="px-6 py-3 rounded-xl border border-orange-500 text-orange-500 font-bold hover:bg-orange-500 hover:text-white transition cursor-pointer text-xs uppercase tracking-wider flex items-center gap-2">
                        Continuer <ArrowRight className="w-4 h-4" />
                      </button>
                    </form>
                  </motion.div>
                )}

                {step === 'password' && (
                  <motion.div key="password" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} className="space-y-5">
                    <div className="flex justify-between items-center flex-wrap gap-2">
                      <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight">
                        {isFirstTime ? "Choisissez un mot de passe" : "Entrez votre mot de passe"}
                      </h1>
                      {!isFirstTime && (
                        <button 
                          type="button" 
                          onClick={() => { setIsForgotPassword(true); setForgotStep('request'); setError(''); setSuccessMsg(''); }}
                          className="text-xs text-orange-500 hover:underline cursor-pointer font-semibold"
                        >
                          Mot de passe oublié ?
                        </button>
                      )}
                    </div>

                    <form onSubmit={handleFinalSubmit} className="space-y-5">
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                        <input 
                          type={showPassword ? 'text' : 'password'} autoFocus required value={password} onChange={e => setPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full bg-neutral-900 border border-neutral-800 rounded-xl pl-11 pr-12 py-3.5 text-white placeholder-neutral-600 focus:outline-none focus:border-orange-500 text-sm sm:text-base transition"
                        />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white transition cursor-pointer p-1">
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>

                      <button type="submit" disabled={loading} className="w-full py-3.5 sm:py-4 rounded-xl border border-orange-500 bg-orange-600 text-white font-bold hover:bg-orange-700 transition cursor-pointer text-xs sm:text-sm uppercase tracking-wider disabled:opacity-40 flex items-center justify-center gap-2 shadow-lg shadow-orange-600/20">
                        {loading ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : (
                          <>
                            {isFirstTime ? "Terminer l'inscription" : "Se connecter"} <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    </form>
                  </motion.div>
                )}
              </>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      <div className="z-10 max-w-2xl w-full mx-auto text-neutral-600 text-[11px] flex justify-between items-center pt-4">
        <span>Bukavu, RDC • CBFSOKO</span>
        {!isForgotPassword && step === 'welcome' && (
          <button 
            type="button" 
            onClick={() => { setIsForgotPassword(true); setForgotStep('request'); }}
            className="text-neutral-500 hover:text-orange-500 transition py-1"
          >
            Mot de passe oublié ?
          </button>
        )}
      </div>
    </div>
  );
}