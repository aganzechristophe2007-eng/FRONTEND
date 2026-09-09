import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  Check, 
  X, 
  Clock, 
  Sparkles,
  Loader2
} from 'lucide-react';

interface NotificationItem {
  id: string;
  type: 'contact_request' | 'system' | 'message';
  title: string;
  message: string;
  createdAt: string;
  isRead: boolean;
  status?: 'pending' | 'accepted' | 'rejected' | 'ACCEPTED' | 'REJECTED';
  sender?: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  };
}

interface NotificationsProps {
  isLightMode: boolean;
  onAcceptContact?: (senderId: string, notificationId: string) => void;
  onRejectContact?: (senderId: string, notificationId: string) => void;
  apiUrl?: string; // URL de base de ton API (ex: 'http://localhost:5000/api')
}

export default function NotificationsPage({ 
  isLightMode, 
  onAcceptContact, 
  onRejectContact,
  apiUrl = '/api'
}: NotificationsProps) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Charger les notifications depuis le backend au montage
  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${apiUrl}/notifications`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setNotifications(result.data);
        }
      }
    } catch (error) {
      console.error("Erreur lors du chargement des notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  // Gérer l'acceptation d'une invitation via l'API messages/request
  const handleAccept = async (notifId: string, senderId?: string) => {
    if (!senderId) return;
    try {
      setActionLoading(notifId);
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${apiUrl}/messages/request/by-sender/${senderId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: 'ACCEPTED' })
      });

      if (response.ok) {
        // Mettre à jour l'état localement
        setNotifications(prev => prev.map(n => {
          if (n.id === notifId) {
            return { ...n, status: 'ACCEPTED', isRead: true };
          }
          return n;
        }));

        if (onAcceptContact) {
          onAcceptContact(senderId, notifId);
        }
      }
    } catch (error) {
      console.error("Erreur acceptation contact:", error);
    } finally {
      setActionLoading(null);
    }
  };

  // Gérer le refus d'une invitation via l'API messages/request
  const handleReject = async (notifId: string, senderId?: string) => {
    if (!senderId) return;
    try {
      setActionLoading(notifId);
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${apiUrl}/messages/request/by-sender/${senderId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: 'REJECTED' })
      });

      if (response.ok) {
        // Mettre à jour l'état localement
        setNotifications(prev => prev.map(n => {
          if (n.id === notifId) {
            return { ...n, status: 'REJECTED', isRead: true };
          }
          return n;
        }));

        if (onRejectContact) {
          onRejectContact(senderId, notifId);
        }
      }
    } catch (error) {
      console.error("Erreur refus contact:", error);
    } finally {
      setActionLoading(null);
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className={`flex flex-col h-full w-full p-4 md:p-6 overflow-y-auto font-sans transition-colors duration-300 ${
      isLightMode ? 'bg-slate-50 text-slate-800' : 'bg-zinc-950 text-zinc-100'
    }`}>
      
      {/* En-tête de la page */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-zinc-800/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/5">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <h1 className={`text-base font-bold ${isLightMode ? 'text-slate-900' : 'text-zinc-100'}`}>
              Notifications
            </h1>
            <p className="text-[11px] text-zinc-400">Gérez vos demandes de relations et alertes système</p>
          </div>
        </div>
        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-orange-600/10 text-orange-500 border border-orange-500/20">
          {unreadCount} non lues
        </span>
      </div>

      {/* Liste des notifications */}
      <div className="space-y-3 max-w-2xl mx-auto w-full pb-20">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-orange-500">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-16 text-zinc-500 text-xs">
            Aucune notification pour le moment.
          </div>
        ) : (
          notifications.map((notif) => {
            const isAccepted = notif.status === 'accepted' || notif.status === 'ACCEPTED';
            const isRejected = notif.status === 'rejected' || notif.status === 'REJECTED';
            const isProcessing = actionLoading === notif.id;

            return (
              <div
                key={notif.id}
                className={`relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl border transition-all duration-200 ${
                  isLightMode 
                    ? 'bg-white border-slate-200 hover:border-slate-300 shadow-xs' 
                    : 'bg-zinc-900 border-zinc-800/80 hover:border-zinc-700 shadow-sm'
                } ${!notif.isRead ? 'border-l-4 border-l-orange-500' : ''}`}
              >
                <div className="flex items-start gap-3.5 min-w-0 flex-1">
                  {/* Icône ou Avatar selon le type */}
                  <div className="w-10 h-10 rounded-xl bg-orange-600/10 border border-orange-500/20 text-orange-500 flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5 shadow-xs overflow-hidden">
                    {notif.sender?.avatar ? (
                      <img src={notif.sender.avatar} alt="" className="w-full h-full object-cover" />
                    ) : notif.sender?.name ? (
                      <span>{notif.sender.name.charAt(0).toUpperCase()}</span>
                    ) : (
                      <Sparkles className="w-4 h-4" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className={`text-xs font-bold truncate ${isLightMode ? 'text-slate-900' : 'text-zinc-100'}`}>
                        {notif.title || (notif.sender ? notif.sender.name : 'Notification')}
                      </h4>
                      <span className="text-[9px] text-zinc-500 flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" /> {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <p className="text-[11px] text-zinc-400 mt-0.5 leading-relaxed">
                      {notif.message}
                    </p>
                  </div>
                </div>

                {/* Actions interactives si c'est une demande de contact */}
                {notif.sender && (
                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-zinc-800/50">
                    {isAccepted ? (
                      <span className="text-[10px] font-bold px-3 py-1.5 bg-emerald-500/10 text-emerald-500 rounded-xl border border-emerald-500/20 flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5" /> Accepté
                      </span>
                    ) : isRejected ? (
                      <span className="text-[10px] font-bold px-3 py-1.5 bg-rose-500/10 text-rose-500 rounded-xl border border-rose-500/20 flex items-center gap-1.5">
                        <X className="w-3.5 h-3.5" /> Refusé
                      </span>
                    ) : (
                      <>
                        <button
                          onClick={() => handleAccept(notif.id, notif.sender?.id)}
                          disabled={isProcessing}
                          className="flex-1 sm:flex-none px-3 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-[11px] font-bold transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
                        >
                          {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} 
                          Accepter
                        </button>
                        <button
                          onClick={() => handleReject(notif.id, notif.sender?.id)}
                          disabled={isProcessing}
                          className={`flex-1 sm:flex-none px-3 py-1.5 rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-1.5 cursor-pointer border ${
                            isLightMode 
                              ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200' 
                              : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700'
                          } disabled:opacity-50`}
                        >
                          <X className="w-3.5 h-3.5" /> Refuser
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}