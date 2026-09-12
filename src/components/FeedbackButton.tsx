// src/components/FeedbackButton.tsx
import React, { useState, useEffect } from 'react';
import { MessageSquarePlus, X, Send } from 'lucide-react';

export default function FeedbackButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);

  useEffect(() => {
    // Vérifie si l'utilisateur a déjà vu le pop-up de bienvenue/feedback
    const hasSeenWelcomeFeedback = localStorage.getItem('cbf_welcome_feedback_seen');
    if (!hasSeenWelcomeFeedback) {
      // Ouvre automatiquement la modale après 1.5 seconde lors de la première visite sur Home
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    // Enregistre dans le stockage local pour ne plus l'afficher automatiquement
    localStorage.setItem('cbf_welcome_feedback_seen', 'true');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    // Logique d'envoi de ton message ici
    console.log("Feedback utilisateur :", message);

    setSent(true);
    setTimeout(() => {
      setSent(false);
      handleClose();
      setMessage('');
    }, 2000);
  };

  return (
    <>
      {/* Petit bouton discret permanent en bas à droite pour y revenir si besoin */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-16 right-4 sm:bottom-6 sm:right-6 z-40 bg-orange-600 hover:bg-orange-500 text-white p-3 rounded-full shadow-2xl flex items-center justify-center transition cursor-pointer border border-orange-400/30 group"
        title="Envoyer un avis ou un bug"
      >
        <MessageSquarePlus className="w-5 h-5 group-hover:scale-110 transition" />
      </button>

      {/* Modale automatique affichée une seule fois à l'accueil */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 text-neutral-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-4">
              <span className="bg-orange-500/10 text-orange-400 border border-orange-500/20 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider inline-block mb-2">
                Bienvenue sur CBF SOKO 🇨🇩
              </span>
              <h3 className="text-white font-extrabold text-xl">Une remarque ou un souci ?</h3>
              <p className="text-neutral-400 text-xs mt-1">
                Aide-nous à améliorer l'application en nous signalant ce qui ne marche pas ou ce qu'on devrait changer !
              </p>
            </div>

            {sent ? (
              <div className="bg-green-600/20 border border-green-500 text-green-400 text-sm p-4 rounded-xl text-center font-bold">
                Merci infiniment ! Ton message a bien été pris en compte 🚀
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3">
                <textarea
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Écris ton message ici (ex: Le bouton X ne fonctionne pas bien...)"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-white text-sm focus:outline-none focus:border-orange-500 resize-none"
                  required
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="w-1/3 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold text-xs rounded-xl transition cursor-pointer"
                  >
                    Plus tard
                  </button>
                  <button
                    type="submit"
                    className="w-2/3 py-2.5 bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-orange-600/20"
                  >
                    <Send className="w-4 h-4" />
                    <span>Envoyer mon avis</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}