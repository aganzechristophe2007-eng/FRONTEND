import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, Mail, User as UserIcon, Phone, ArrowRight, AlertCircle, ArrowLeft, Eye, EyeOff } from 'lucide-react';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);

  const navigate = useNavigate();

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setError('');
  setLoading(true);

  console.log("ENVOI INSCRIPTION VERS BACKEND:", { name, email, password, phone }); // <-- Ajoute ceci

  try {
    const response = await fetch('https://cbfsoko-backend.onrender.com/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, phone }),
    });
    // ...

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Erreur lors de l'inscription.");
      }

      // Enregistrement du token JWT
      if (data.token) {
        localStorage.setItem('token', data.token);
      }

      // Récupération des données utilisateur renvoyées par le backend
      const userObj = data.data || data.user || { name, email };
      let userRole = userObj.role ? userObj.role.toUpperCase() : 'USER';
      
      const cleanEmail = email.trim().toLowerCase();
      if (cleanEmail === 'benjaminkulimushi1@gmail.com') {
        userRole = 'ADMIN';
      } else if (cleanEmail === 'mambofelicien91@gmail.com') {
        userRole = 'ADMIN_FINANCE';
      }

      userObj.role = userRole;
      localStorage.setItem('user', JSON.stringify(userObj));

      // Redirection selon le rôle
      if (userRole === 'ADMIN') {
        navigate('/admin/seller-dashboard', { replace: true });
      } else if (userRole === 'ADMIN_FINANCE') {
        navigate('/admin/finances-dashboard', { replace: true });
      } else {
        navigate('/', { replace: true });
      }

    } catch (err: any) {
      setError(err.message || "Une erreur est survenue lors de l'inscription.");
      setShakeKey((prev) => prev + 1);
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = (provider: 'google' | 'facebook') => {
    window.location.href = `https://cbfsoko-backend.onrender.com/api/auth/${provider}`;
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center px-4 relative overflow-hidden py-8">
      <div className="absolute w-[500px] h-[500px] bg-orange-600/10 rounded-full blur-[140px] pointer-events-none" />

      <motion.div 
        key={shakeKey}
        animate={error ? { x: [-15, 15, -15, 15, -10, 10, -5, 5, 0] } : {}}
        transition={{ duration: 0.6 }}
        className="max-w-md w-full relative z-10"
      >
        <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative">
          <div className="flex justify-between items-center mb-6">
            <Link to="/" className="text-neutral-400 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition">
              <ArrowLeft className="w-4 h-4" /> Accueil
            </Link>
            <span className="text-orange-500 font-bold text-[10px] uppercase tracking-widest px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20">
              CBFSOKO Bukavu
            </span>
          </div>

          <div className="text-center mb-6">
            <h2 className="text-2xl font-black tracking-tight">Créer un compte</h2>
            <p className="text-neutral-400 text-xs mt-1.5">Inscrivez-vous pour publier et gérer vos boutiques</p>
          </div>

          {/* Boutons sociaux */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <button
              type="button"
              onClick={() => handleSocialLogin('google')}
              className="flex items-center justify-center gap-2 bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-xs font-semibold py-2.5 px-4 rounded-xl transition cursor-pointer"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.8 7.4l3.7 2.9C6.4 7.2 9 5 12 5z" />
                <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z" />
                <path fill="#FBBC05" d="M5.5 14.7c-.2-.8-.4-1.7-.4-2.7s.2-1.9.4-2.7L1.8 6.4C.7 8.6 0 11.2 0 14s.7 5.4 1.8 7.6l3.7-2.9z" />
                <path fill="#34A853" d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.6-2.2-6.5-5.3L1.8 15.9C3.7 19.7 7.5 23 12 23z" />
              </svg>
              Google
            </button>

            <button
              type="button"
              onClick={() => handleSocialLogin('facebook')}
              className="flex items-center justify-center gap-2 bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-xs font-semibold py-2.5 px-4 rounded-xl transition cursor-pointer"
            >
              <svg className="w-4 h-4 fill-blue-500" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              Facebook
            </button>
          </div>

          <div className="flex items-center my-5">
            <div className="flex-grow border-t border-neutral-800"></div>
            <span className="px-3 text-[10px] text-neutral-500 uppercase tracking-widest font-semibold">ou par email</span>
            <div className="flex-grow border-t border-neutral-800"></div>
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-3"
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-1.5">Nom complet</label>
              <div className="relative">
                <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                <input 
                  type="text" 
                  required 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  placeholder="ex: Benjamin Kulimushi"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-11 pr-4 py-3 text-white placeholder-neutral-600 focus:outline-none focus:border-orange-500 text-xs sm:text-sm transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-1.5">Adresse Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                <input 
                  type="email" 
                  required 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  placeholder="nom@exemple.com"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-11 pr-4 py-3 text-white placeholder-neutral-600 focus:outline-none focus:border-orange-500 text-xs sm:text-sm transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-1.5">Téléphone (Optionnel)</label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                <input 
                  type="tel" 
                  value={phone} 
                  onChange={(e) => setPhone(e.target.value)} 
                  placeholder="+243..."
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-11 pr-4 py-3 text-white placeholder-neutral-600 focus:outline-none focus:border-orange-500 text-xs sm:text-sm transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-1.5">Mot de passe</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                <input 
                  type={showPassword ? 'text' : 'password'} 
                  required 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  placeholder="••••••••"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-11 pr-12 py-3 text-white placeholder-neutral-600 focus:outline-none focus:border-orange-500 text-xs sm:text-sm transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white transition cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full mt-2 bg-orange-600 hover:bg-orange-700 text-white font-bold py-3.5 rounded-xl transition shadow-lg shadow-orange-600/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 text-xs sm:text-sm"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  S'inscrire et continuer <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center border-t border-neutral-800/80 pt-5">
            <p className="text-neutral-400 text-xs">
              Vous avez déjà un compte ?
              <Link to="/login" className="ml-1.5 text-orange-500 font-bold hover:underline cursor-pointer">
                Se connecter
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}