import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import {
  Lock,
  Mail,
  User as UserIcon,
  Phone,
  ArrowRight,
  AlertCircle,
  ArrowLeft,
  Eye,
  EyeOff,
  FileText,
  ShieldCheck,
} from 'lucide-react';

const API_URL = 'https://cbfsoko-backend.onrender.com';

const CURRENT_TERMS_VERSION = '1.0';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [termsAccepted, setTermsAccepted] = useState(false);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);

  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (loading) return;

    setError('');

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phone.trim();

    /*
     * Validation locale.
     * Elle améliore l'expérience utilisateur mais ne remplace
     * absolument pas la validation côté backend.
     */

    if (!cleanName) {
      setError('Veuillez renseigner votre nom complet.');
      setShakeKey((prev) => prev + 1);
      return;
    }

    if (cleanName.length < 2) {
      setError('Le nom doit contenir au moins 2 caractères.');
      setShakeKey((prev) => prev + 1);
      return;
    }

    if (!cleanEmail) {
      setError('Veuillez renseigner votre adresse e-mail.');
      setShakeKey((prev) => prev + 1);
      return;
    }

    if (!password) {
      setError('Veuillez renseigner votre mot de passe.');
      setShakeKey((prev) => prev + 1);
      return;
    }

    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères.');
      setShakeKey((prev) => prev + 1);
      return;
    }

    if (!termsAccepted) {
      setError(
        "Vous devez accepter les Conditions générales d'utilisation et prendre connaissance de la Politique de confidentialité."
      );
      setShakeKey((prev) => prev + 1);
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          name: cleanName,
          email: cleanEmail,
          password,
          phone: cleanPhone || null,
          termsAccepted: true,
          termsVersion: CURRENT_TERMS_VERSION,
        }),
      });

      let data: any = null;

      try {
        data = await response.json();
      } catch {
        data = null;
      }

      if (!response.ok) {
        throw new Error(
          data?.message ||
            data?.error ||
            "Erreur lors de l'inscription."
        );
      }

      /*
       * Le rôle utilisé ici est EXCLUSIVEMENT celui renvoyé
       * par le backend.
       *
       * Le frontend ne détermine jamais ADMIN, ADMIN_FINANCE,
       * SUPER_ADMIN, etc.
       */

      const userObj = data?.data || data?.user;

      if (!userObj) {
        throw new Error(
          "Le serveur n'a pas renvoyé les informations du compte."
        );
      }

      /*
       * Le token est conservé comme dans ton système actuel.
       * Le backend reste responsable de sa signature et de sa validité.
       */
      if (data?.token) {
        localStorage.setItem('token', data.token);
      }

      const safeUser = {
        id: userObj.id,
        name: userObj.name,
        email: userObj.email,
        phone: userObj.phone ?? null,
        role: userObj.role ?? 'USER',
        avatar: userObj.avatar ?? null,
      };

      localStorage.setItem('user', JSON.stringify(safeUser));

      /*
       * IMPORTANT :
       * aucune comparaison d'adresse e-mail ici.
       *
       * Le frontend utilise uniquement le rôle fourni
       * par le backend.
       */

      const userRole = String(safeUser.role).toUpperCase();

      if (userRole === 'ADMIN') {
        navigate('/admin/seller-dashboard', { replace: true });
      } else if (userRole === 'ADMIN_FINANCE') {
        navigate('/admin/finances-dashboard', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    } catch (err: any) {
      setError(
        err?.message ||
          "Une erreur est survenue lors de l'inscription."
      );

      setShakeKey((prev) => prev + 1);
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = (provider: 'google' | 'facebook') => {
    if (loading) return;

    /*
     * OAuth est géré par le backend.
     *
     * L'acceptation des CGU pour OAuth doit idéalement être
     * vérifiée côté serveur avec un mécanisme OAuth "state".
     *
     * Le Register ne transmet donc pas arbitrairement
     * termsAccepted=true dans l'URL.
     */
    window.location.href = `${API_URL}/api/auth/${provider}`;
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center px-4 relative overflow-hidden py-8">
      <div className="absolute w-[500px] h-[500px] bg-orange-600/10 rounded-full blur-[140px] pointer-events-none" />

      <motion.div
        key={shakeKey}
        animate={
          error
            ? {
                x: [-15, 15, -15, 15, -10, 10, -5, 5, 0],
              }
            : {}
        }
        transition={{ duration: 0.6 }}
        className="max-w-md w-full relative z-10"
      >
        <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative">
          <div className="flex justify-between items-center mb-6">
            <Link
              to="/"
              className="text-neutral-400 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <ArrowLeft className="w-4 h-4" />
              Accueil
            </Link>

            <span className="text-orange-500 font-bold text-[10px] uppercase tracking-widest px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20">
              CBFSOKO Bukavu
            </span>
          </div>

          <div className="text-center mb-6">
            <h2 className="text-2xl font-black tracking-tight">
              Créer un compte
            </h2>

            <p className="text-neutral-400 text-xs mt-1.5">
              Inscrivez-vous pour publier et gérer vos boutiques
            </p>
          </div>

          {/* Connexion sociale */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <button
              type="button"
              onClick={() => handleSocialLogin('google')}
              disabled={loading}
              className="flex items-center justify-center gap-2 bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-xs font-semibold py-2.5 px-4 rounded-xl transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg
                className="w-4 h-4"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  fill="#EA4335"
                  d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.8 7.4l3.7 2.9C6.4 7.2 9 5 12 5z"
                />

                <path
                  fill="#4285F4"
                  d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
                />

                <path
                  fill="#FBBC05"
                  d="M5.5 14.7c-.2-.8-.4-1.7-.4-2.7s.2-1.9.4-2.7L1.8 6.4C.7 8.6 0 11.2 0 14s.7 5.4 1.8 7.6l3.7-2.9z"
                />

                <path
                  fill="#34A853"
                  d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.6-2.2-6.5-5.3L1.8 15.9C3.7 19.7 7.5 23 12 23z"
                />
              </svg>

              Google
            </button>

            <button
              type="button"
              onClick={() => handleSocialLogin('facebook')}
              disabled={loading}
              className="flex items-center justify-center gap-2 bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-xs font-semibold py-2.5 px-4 rounded-xl transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg
                className="w-4 h-4 fill-blue-500"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>

              Facebook
            </button>
          </div>

          <div className="flex items-center my-5">
            <div className="flex-grow border-t border-neutral-800" />

            <span className="px-3 text-[10px] text-neutral-500 uppercase tracking-widest font-semibold">
              ou par email
            </span>

            <div className="flex-grow border-t border-neutral-800" />
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-3"
              role="alert"
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}

          <form
            onSubmit={handleSubmit}
            className="space-y-4"
            noValidate
          >
            {/* Nom */}
            <div>
              <label
                htmlFor="register-name"
                className="block text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-1.5"
              >
                Nom complet
              </label>

              <div className="relative">
                <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />

                <input
                  id="register-name"
                  type="text"
                  required
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="ex: Benjamin Kulimushi"
                  maxLength={100}
                  disabled={loading}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-11 pr-4 py-3 text-white placeholder-neutral-600 focus:outline-none focus:border-orange-500 text-xs sm:text-sm transition disabled:opacity-50"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label
                htmlFor="register-email"
                className="block text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-1.5"
              >
                Adresse Email
              </label>

              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />

                <input
                  id="register-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nom@exemple.com"
                  maxLength={254}
                  disabled={loading}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-11 pr-4 py-3 text-white placeholder-neutral-600 focus:outline-none focus:border-orange-500 text-xs sm:text-sm transition disabled:opacity-50"
                />
              </div>
            </div>

            {/* Téléphone */}
            <div>
              <label
                htmlFor="register-phone"
                className="block text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-1.5"
              >
                Téléphone (Optionnel)
              </label>

              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />

                <input
                  id="register-phone"
                  type="tel"
                  autoComplete="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+243..."
                  maxLength={30}
                  disabled={loading}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-11 pr-4 py-3 text-white placeholder-neutral-600 focus:outline-none focus:border-orange-500 text-xs sm:text-sm transition disabled:opacity-50"
                />
              </div>
            </div>

            {/* Mot de passe */}
            <div>
              <label
                htmlFor="register-password"
                className="block text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-1.5"
              >
                Mot de passe
              </label>

              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />

                <input
                  id="register-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  minLength={8}
                  maxLength={128}
                  disabled={loading}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-11 pr-12 py-3 text-white placeholder-neutral-600 focus:outline-none focus:border-orange-500 text-xs sm:text-sm transition disabled:opacity-50"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  disabled={loading}
                  aria-label={
                    showPassword
                      ? 'Masquer le mot de passe'
                      : 'Afficher le mot de passe'
                  }
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white transition cursor-pointer disabled:opacity-50"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>

              <p className="text-[10px] text-neutral-500 mt-1.5">
                Minimum 8 caractères.
              </p>
            </div>

            {/* Acceptation des conditions */}
            <div className="rounded-xl border border-neutral-800 bg-neutral-950/60 p-3.5">
              <div className="flex items-start gap-3">
                <input
                  id="terms"
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  disabled={loading}
                  className="mt-1 h-4 w-4 shrink-0 rounded border-neutral-700 bg-neutral-950 text-orange-600 focus:ring-orange-500"
                />

                <label
                  htmlFor="terms"
                  className="text-[11px] leading-5 text-neutral-400 cursor-pointer"
                >
                  J’accepte les{' '}
                  <Link
                    to="/terms"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-orange-500 hover:underline font-semibold"
                  >
                    Conditions générales d’utilisation
                  </Link>{' '}
                  et j’ai pris connaissance de la{' '}
                  <Link
                    to="/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-orange-500 hover:underline font-semibold"
                  >
                    Politique de confidentialité
                  </Link>
                  .
                </label>
              </div>

              <div className="flex items-center gap-2 mt-3 text-[10px] text-neutral-500">
                <ShieldCheck className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                <span>
                  Version des conditions : {CURRENT_TERMS_VERSION}
                </span>
              </div>
            </div>

            {/* Bouton */}
            <button
              type="submit"
              disabled={loading || !termsAccepted}
              className="w-full mt-2 bg-orange-600 hover:bg-orange-700 text-white font-bold py-3.5 rounded-xl transition shadow-lg shadow-orange-600/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  S'inscrire et continuer
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center border-t border-neutral-800/80 pt-5">
            <p className="text-neutral-400 text-xs">
              Vous avez déjà un compte ?

              <Link
                to="/login"
                className="ml-1.5 text-orange-500 font-bold hover:underline cursor-pointer"
              >
                Se connecter
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}