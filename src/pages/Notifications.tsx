import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Bell, ArrowLeft, Check, X, User, Shield, Mail } from 'lucide-react';

interface SenderProfile {
  id: string;
  name: string;
  email: string;
  role?: string;
  avatar?: string;
  phone?: string;
  _count?: {
    products?: number;
  };
}

interface Notification {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  senderId?: string;
  sender?: SenderProfile;
  user?: SenderProfile;
}

interface NotificationsProps {
  isLightMode?: boolean;
}

export default function Notifications({ isLightMode = false }: NotificationsProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [selectedNotif, setSelectedNotif] = useState<Notification | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('https://cbfsoko-backend.onrender.com/api/notifications', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      
      if (data.success) {
        setNotifications(data.data);
      } else {
        setError(data.message || "Erreur lors du chargement.");
      }
    } catch {
      setError("Impossible de contacter le serveur.");
    } finally {
      setLoading(false);
    }
  };

  const handleContactResponse = async (notif: Notification, status: 'ACCEPTED' | 'REJECTED') => {
    setError(null);
    setSuccessMsg(null);

    const targetSenderId = notif.senderId || notif.sender?.id || notif.user?.id;

    if (!targetSenderId) {
      setError("Impossible de traiter cette demande : aucun expéditeur n'est associé.");
      return;
    }

    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(`https://cbfsoko-backend.onrender.com/api/messages/request/by-sender/${targetSenderId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });

      const data = await response.json();
      if (data.success) {
        setSuccessMsg(status === 'ACCEPTED' ? "Demande acceptée avec succès !" : "Demande refusée.");
        setSelectedNotif(null);
        fetchNotifications();
      } else {
        setError(data.message || "Erreur lors de la mise à jour.");
      }
    } catch {
      setError("Erreur réseau lors de la communication.");
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex flex-col selection:bg-orange-500 selection:text-white">
      {/* HEADER MOBILE OPTIMISÉ */}
      <header className="border-b border-neutral-800 bg-neutral-900/95 backdrop-blur-md px-3 sm:px-6 py-3 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3 w-full">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 sm:w-9 sm:h-9 bg-orange-600 rounded-xl flex items-center justify-center text-white font-black text-xs sm:text-sm shadow-lg shadow-orange-600/30 group-hover:scale-105 transition">
              CBF
            </div>
            <div>
              <span className="font-extrabold text-xs sm:text-sm tracking-tight block leading-none">CBFSOKO</span>
              <span className="text-[9px] sm:text-[10px] text-orange-500 font-bold tracking-widest uppercase">Notifications</span>
            </div>
          </Link>

          <Link to="/" className="text-xs text-neutral-400 hover:text-white flex items-center gap-1.5 transition bg-neutral-800/60 px-3 py-1.5 rounded-xl border border-neutral-700/50">
            <ArrowLeft className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Retour Accueil</span><span className="sm:hidden">Accueil</span>
          </Link>
        </div>
      </header>

      {/* MAIN CONTAINER AVEC ESPACEMENT MOBILE FLUIDE */}
      <main className="max-w-4xl w-full mx-auto px-3 sm:px-6 py-4 sm:py-8 flex-1 flex flex-col">
        <div className="mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2">
              <Bell className="w-5 h-5 sm:w-6 sm:h-6 text-orange-500" />
              Mes Notifications
            </h1>
            <p className="text-neutral-400 text-xs sm:text-sm mt-1">
              Appuyez sur une demande pour voir les détails du membre.
            </p>
          </div>
          <span className="self-start sm:self-auto text-xs text-neutral-300 bg-neutral-900 border border-neutral-800 px-3 py-1.5 rounded-xl font-bold shadow-sm">
            {notifications.length} notification(s)
          </span>
        </div>

        {error && <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">{error}</div>}
        {successMsg && <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">{successMsg}</div>}

        {loading && <div className="text-center py-16 text-orange-500 text-xs animate-pulse font-semibold">Chargement des notifications...</div>}

        {!loading && notifications.length === 0 && (
          <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-8 sm:p-12 text-center text-neutral-400 my-auto">
            <Bell className="w-10 h-10 mx-auto text-neutral-600 mb-2 stroke-1" />
            <p className="text-sm font-bold text-white mb-1">Aucune notification</p>
            <p className="text-xs text-neutral-500">Vous serez averti ici lors de vos nouvelles interactions.</p>
          </div>
        )}

        {/* LISTE DES NOTIFICATIONS (OPTIMISÉE TOUCH MOBILE) */}
        <div className="space-y-3">
          {notifications.map((notif) => {
            const titleLower = notif.title.toLowerCase();
            const isIncomingContactRequest = titleLower.includes("nouvelle demande") || (titleLower.includes("demande") && !titleLower.includes("accept") && !titleLower.includes("refus"));
            const isChatReady = titleLower.includes("accept") || titleLower.includes("succès");

            return (
              <div 
                key={notif.id}
                onClick={() => {
                  if (isIncomingContactRequest) {
                    const hasSender = notif.senderId || notif.sender?.id || notif.user?.id;
                    if (!hasSender) {
                      setError("Cette notification ne possède pas d'expéditeur rattaché.");
                      return;
                    }
                    setSelectedNotif(notif);
                  }
                }}
                className={`p-3.5 sm:p-4 rounded-2xl border transition-all active:scale-[0.99] ${
                  isIncomingContactRequest ? 'cursor-pointer hover:border-orange-500/60 active:bg-neutral-900/80' : ''
                } ${
                  notif.isRead 
                    ? 'bg-neutral-900/40 border-neutral-800/80 text-neutral-400' 
                    : 'bg-neutral-900 border-neutral-800 text-white shadow-md'
                }`}
              >
                <div className="flex flex-col gap-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-bold text-xs sm:text-sm flex items-center gap-2 leading-snug">
                      {!notif.isRead && <span className="w-2 h-2 rounded-full bg-orange-500 shrink-0 inline-block animate-pulse"></span>}
                      {notif.title}
                    </h3>
                    <span className="text-[10px] text-neutral-500 whitespace-nowrap shrink-0">
                      {new Date(notif.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-300 leading-relaxed">{notif.message}</p>
                </div>

                {isChatReady && (
                  <div className="mt-3 pt-3 border-t border-neutral-800 flex justify-end">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate('/messages');
                      }}
                      className="w-full sm:w-auto bg-orange-600 hover:bg-orange-500 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-orange-600/20 active:scale-95"
                    >
                      Discuter maintenant
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* MODALE DÉTAIL EXPÉDITEUR (PLEIN ÉCRAN SUR MOBILE POUR UN MEILLEUR CONFORT) */}
        {selectedNotif && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
            <div className="bg-neutral-900 border-t sm:border border-neutral-800 rounded-t-3xl sm:rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom duration-200">
              <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                <h3 className="text-sm sm:text-base font-black flex items-center gap-2 text-white">
                  <User className="w-5 h-5 text-orange-500" /> Détails de l'expéditeur
                </h3>
                <button 
                  onClick={() => setSelectedNotif(null)}
                  className="text-neutral-400 hover:text-white p-2 rounded-xl bg-neutral-800/50 hover:bg-neutral-800 transition"
                  aria-label="Fermer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {(() => {
                const senderData = selectedNotif.sender || selectedNotif.user;
                return (
                  <>
                    <div className="flex items-center gap-3.5 bg-neutral-950 p-3.5 sm:p-4 rounded-xl border border-neutral-800">
                      {senderData?.avatar ? (
                        <img 
                          src={senderData.avatar} 
                          alt={senderData.name} 
                          className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl object-cover border border-neutral-700 shadow-md shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-orange-600 flex items-center justify-center text-white font-black text-lg sm:text-xl shadow-lg shadow-orange-600/30 shrink-0">
                          {senderData?.name ? senderData.name.charAt(0).toUpperCase() : 'U'}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <h4 className="text-sm sm:text-base font-bold text-white truncate">{senderData?.name || "Utilisateur"}</h4>
                        <p className="text-xs text-neutral-400 flex items-center gap-1.5 mt-0.5 truncate">
                          <Mail className="w-3.5 h-3.5 text-orange-500 shrink-0" /> <span className="truncate">{senderData?.email || "Non renseigné"}</span>
                        </p>
                        <p className="text-[10px] text-orange-400 font-bold uppercase mt-1 flex items-center gap-1">
                          <Shield className="w-3 h-3 shrink-0" /> {senderData?.role || "Membre"}
                        </p>
                      </div>
                    </div>

                    <div className="text-xs space-y-2 text-neutral-300 bg-neutral-950/40 p-3.5 sm:p-4 rounded-xl border border-neutral-800">
                      <p><strong className="text-white">Téléphone :</strong> {senderData?.phone || "Non renseigné"}</p>
                      <p><strong className="text-white">Produits publiés :</strong> {senderData?._count?.products ?? 0}</p>
                    </div>
                  </>
                );
              })()}

              <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-2">
                <button 
                  onClick={() => handleContactResponse(selectedNotif, 'ACCEPTED')}
                  className="w-full sm:flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-3 rounded-xl text-xs font-bold transition shadow-lg shadow-emerald-600/20 active:scale-95"
                >
                  <Check className="w-4 h-4" /> Accepter la demande
                </button>
                <button 
                  onClick={() => handleContactResponse(selectedNotif, 'REJECTED')}
                  className="w-full sm:flex-1 flex items-center justify-center gap-2 bg-red-600/10 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/20 px-4 py-3 rounded-xl text-xs font-bold transition active:scale-95"
                >
                  <X className="w-4 h-4" /> Refuser
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}