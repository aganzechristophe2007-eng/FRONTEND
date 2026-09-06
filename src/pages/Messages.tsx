import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, LogOut, Send, Inbox, UserCheck, AlertCircle, UserPlus, CheckCircle, ShieldAlert, Trash2, Headphones, Lock, Unlock, Download, Sun, Moon, Mail, MessageCircle, Search, User as UserIcon } from 'lucide-react';
import { apiFetch } from '../api/client';

interface ContactUser {
  id: string;
  name: string;
  email: string;
  role?: string;
  avatar?: string;
  updatedAt?: string;
  contactStatus?: 'ACCEPTED' | 'PENDING' | 'REJECTED' | null;
}

interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  createdAt: string;
  sender?: {
    name: string;
  };
}

export default function MessagesPage() {
  const navigate = useNavigate();
  const [currentUserId, setCurrentUserId] = useState('');
  const [userName, setUserName] = useState('Utilisateur');
  const [userRole, setUserRole] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [acceptedContacts, setAcceptedContacts] = useState<ContactUser[]>([]);
  const [availableUsers, setAvailableUsers] = useState<ContactUser[]>([]);
  const [selectedContact, setSelectedContact] = useState<ContactUser | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'conversations' | 'discover' | 'support' | 'admin'>('conversations');

  const [isLightMode, setIsLightMode] = useState(false);
  const [isLocalEncrypted, setIsLocalEncrypted] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<string[]>([]);
  
  // Barre de recherche dans l'onglet "discover"
  const [searchQuery, setSearchQuery] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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

  // Synchronisation utilisateur et écoute des mises à jour d'avatar globales
  useEffect(() => {
    const handleAvatarUpdate = () => {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          if (user.name) setUserName(user.name);
        } catch {
          // ignore
        }
      }
    };
    window.addEventListener('avatar-updated', handleAvatarUpdate);

    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');

    if (!token || !userStr) {
      navigate('/login?redirect=/messages');
      return;
    }

    try {
      const user = JSON.parse(userStr);
      if (user.id) setCurrentUserId(user.id);
      if (user.name) setUserName(user.name);
      if (user.role) setUserRole(user.role);
    } catch {
      // Ignorer
    }

    loadInitialData(token);

    return () => {
      window.removeEventListener('avatar-updated', handleAvatarUpdate);
    };
  }, [navigate]);

  useEffect(() => {
    if (!selectedContact?.id) return;

    const interval = setInterval(() => {
      const currentToken = localStorage.getItem('token');
      if (currentToken) {
        fetchMessages(selectedContact.id, true);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [selectedContact?.id]);

  const handleUnauthorized = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const loadInitialData = async (token: string) => {
    setLoading(true);
    try {
      // 1. Récupérer d'abord les utilisateurs disponibles (qui contiennent l'avatar à jour)
      const resUsers = await fetch('https://cbfsoko-backend.onrender.com/api/messages/users/available', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const dataUsers = await resUsers.json();
      let usersList: ContactUser[] = [];
      if (dataUsers.success && Array.isArray(dataUsers.data)) {
        usersList = dataUsers.data;
        setAvailableUsers(usersList);
      }

      // 2. Récupérer les contacts acceptés
      const resContacts = await fetch('https://cbfsoko-backend.onrender.com/api/messages/contacts/accepted', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (resContacts.status === 401) {
        handleUnauthorized();
        return;
      }

      const dataContacts = await resContacts.json();
      const rawContactsList = dataContacts.success && Array.isArray(dataContacts.data) ? dataContacts.data : [];

      // 3. Fusionner les contacts acceptés avec les données de availableUsers pour injecter l'avatar s'il manque
      const contactsList = rawContactsList.map((contact: ContactUser) => {
        const matchingUser = usersList.find((u) => u.id === contact.id);
        return {
          ...contact,
          avatar: contact.avatar || matchingUser?.avatar || ''
        };
      });

      setAcceptedContacts(contactsList);

      if (contactsList.length > 0) {
        setSelectedContact(contactsList[0]);
        fetchMessages(contactsList[0].id, false);
      }

    } catch (err: any) {
      setError(err.message || "Erreur lors du chargement des données.");
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (otherId: string, isPolling = false) => {
    try {
      const currentToken = localStorage.getItem('token');
      if (!currentToken) return;

      const response = await fetch(`https://cbfsoko-backend.onrender.com/api/messages/${otherId}`, {
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentToken}`
        }
      });

      if (response.status === 401 && !isPolling) {
        handleUnauthorized();
        return;
      }

      const data = await response.json();
      if (data.success && Array.isArray(data.data)) {
        setMessages(data.data);
        localStorage.setItem(`cbfsoko_backup_${otherId}`, JSON.stringify(data.data));
      }
    } catch {
      const localBackup = localStorage.getItem(`cbfsoko_backup_${otherId}`);
      if (localBackup) {
        try {
          setMessages(JSON.parse(localBackup));
        } catch {
          // Ignorer
        }
      }
    }
  };

  const handleSendContactRequest = async (targetUserId: string) => {
    setError('');
    setSuccessMsg('');
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('https://cbfsoko-backend.onrender.com/api/messages/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ receiverId: targetUserId })
      });

      const data = await response.json();
      if (data.success) {
        setSuccessMsg("Demande de contact envoyée avec succès !");
        setPendingRequests(prev => [...prev, targetUserId]);
        setAvailableUsers(prev => 
          prev.map(u => u.id === targetUserId ? { ...u, contactStatus: 'PENDING' } : u)
        );
      } else {
        setError(data.message || "Erreur lors de l'envoi de la demande.");
      }
    } catch {
      setError("Erreur réseau lors de l'envoi de la demande.");
    }
  };

  const handleOpenSupportChat = async () => {
    setError('');
    setSuccessMsg('');
    try {
      const token = localStorage.getItem('token');
      
      let adminUser = availableUsers.find(u => u.email?.toLowerCase() === 'aganzechristophe2007@gmail.com' || u.role?.toUpperCase() === 'SUPER_ADMIN') || 
                      acceptedContacts.find(u => u.email?.toLowerCase() === 'aganzechristophe2007@gmail.com' || u.role?.toUpperCase() === 'SUPER_ADMIN');

      if (!adminUser) {
        adminUser = {
          id: 'super-admin-christophe-id',
          name: 'CBF Support',
          email: 'aganzechristophe2007@gmail.com',
          role: 'SUPER_ADMIN',
          contactStatus: 'ACCEPTED'
        };
      } else {
        adminUser.name = 'CBF Support';
      }

      const isAlreadyContact = acceptedContacts.some(c => c.id === adminUser?.id);

      if (!isAlreadyContact) {
        await fetch('https://cbfsoko-backend.onrender.com/api/messages/request', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ receiverId: adminUser.id })
        }).catch(() => {});
      }

      const updatedContactObj: ContactUser = {
        id: adminUser.id,
        name: 'CBF Support',
        email: 'aganzechristophe2007@gmail.com',
        role: 'SUPER_ADMIN',
        avatar: adminUser.avatar || '',
        contactStatus: 'ACCEPTED'
      };

      if (!acceptedContacts.some(c => c.id === adminUser?.id)) {
        setAcceptedContacts(prev => [updatedContactObj, ...prev]);
      }

      setSelectedContact(updatedContactObj);
      setActiveTab('conversations');
      setNewMessage('Bonjour je souhaite obtenir de l’aide concernant...');

      fetchMessages(adminUser.id, false);
      setSuccessMsg("Chat direct avec CBF Support ouvert.");

    } catch {
      setError("Erreur lors de l'ouverture automatique du chat support.");
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!newMessage.trim() || !selectedContact?.id) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('https://cbfsoko-backend.onrender.com/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          receiverId: selectedContact.id,
          content: newMessage
        })
      });

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      const data = await response.json();
      if (data.success && data.data) {
        const updatedMessages = [...messages, data.data];
        setMessages(updatedMessages);
        setNewMessage('');
        localStorage.setItem(`cbfsoko_backup_${selectedContact.id}`, JSON.stringify(updatedMessages));
      } else {
        setError(data.message || "Erreur d'envoi.");
      }
    } catch {
      setError("Erreur réseau lors de l'envoi du message.");
    }
  };

  const isAdmin = userRole.toUpperCase() === 'ADMIN' || userRole.toUpperCase() === 'SUPER_ADMIN';

  const renderUserStatus = (updatedAt?: string) => {
    if (!updatedAt) return <span className={`text-[11px] font-medium ${isLightMode ? 'text-slate-400' : 'text-zinc-500'}`}>Hors ligne</span>;
    const lastActive = new Date(updatedAt).getTime();
    const now = new Date().getTime();
    const diffMinutes = Math.floor((now - lastActive) / (1000 * 60));

    if (diffMinutes < 5) {
      return (
        <span className="flex items-center gap-1.5 text-[11px] text-amber-500 font-semibold">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" /> Actif
        </span>
      );
    } else {
      const lastTime = new Date(updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return <span className={`text-[11px] font-medium ${isLightMode ? 'text-slate-400' : 'text-zinc-500'}`}>Inactif depuis {lastTime}</span>;
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center font-sans ${isLightMode ? 'bg-slate-50 text-slate-800' : 'bg-zinc-950 text-zinc-100'}`}>
        <div className={`flex items-center gap-3 font-semibold text-sm px-6 py-4 rounded-2xl shadow-xl border ${isLightMode ? 'bg-white text-orange-600 border-orange-100 shadow-orange-100' : 'bg-zinc-900 text-orange-500 border-zinc-800'}`}>
          <span className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
          Chargement de la messagerie sécurisée...
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-colors duration-200 ${isLightMode ? 'bg-slate-100/70 text-slate-900' : 'bg-zinc-950 text-zinc-100'}`}>
      
      <header className={`border-b px-4 lg:px-8 py-3.5 sticky top-0 z-50 backdrop-blur-xl transition-colors duration-200 ${
        isLightMode 
          ? 'border-slate-200/80 bg-white/80 shadow-sm' 
          : 'border-zinc-800/80 bg-zinc-900/80 shadow-md shadow-black/40'
      }`}>
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 w-full">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 bg-gradient-to-tr from-orange-600 to-amber-500 rounded-xl flex items-center justify-center text-black font-black text-sm shadow-md shadow-orange-500/20 group-hover:scale-105 transition">
                CBF
              </div>
              <div>
                <span className={`font-bold text-sm tracking-tight block leading-none ${isLightMode ? 'text-slate-900' : 'text-zinc-100'}`}>CBFSOKO</span>
                <span className="text-[10px] text-orange-500 font-bold tracking-wider uppercase">Messagerie Sécurisée</span>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsLightMode(!isLightMode)}
              className="p-2 rounded-xl text-xs font-bold transition cursor-pointer border bg-zinc-900 text-amber-400 border-zinc-800 hover:bg-zinc-800"
              title="Basculer entre Mode Clair et Mode Sombre"
            >
              {isLightMode ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4 text-amber-400" />}
              <span className="hidden sm:inline">{isLightMode ? 'Sombre' : 'Clair'}</span>
            </button>

            <Link to="/" className={`text-xs font-semibold flex items-center gap-1.5 transition px-3 py-2 rounded-xl border ${
              isLightMode 
                ? 'bg-white text-slate-700 border-slate-200 hover:border-orange-200' 
                : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:border-orange-500/50 hover:text-white'
            }`}>
              <ArrowLeft className="w-3.5 h-3.5" /> Accueil
            </Link>

            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 bg-rose-500/10 text-rose-500 hover:bg-rose-600 hover:text-white px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer border border-rose-500/20 shadow-2xs"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Déconnexion</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex-1 flex flex-col">
        <div className="mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className={`text-2xl font-black tracking-tight flex items-center gap-2.5 ${isLightMode ? 'text-slate-900' : 'text-zinc-100'}`}>
              <div className="p-2 bg-orange-500/10 text-orange-500 rounded-xl border border-orange-500/20 shadow-2xs">
                <Inbox className="w-5 h-5" />
              </div>
              Messagerie & Support
            </h1>
            <p className={`text-xs sm:text-sm mt-1 ${isLightMode ? 'text-slate-500' : 'text-zinc-400'}`}>
              Discutez avec vos contacts ou contactez le service client dédié en toute sécurité.
            </p>
          </div>
          
          <div className={`border p-1.5 rounded-2xl shadow-sm flex flex-wrap gap-1 ${isLightMode ? 'bg-white border-slate-200/80' : 'bg-zinc-900 border-zinc-800'}`}>
            <button
              onClick={() => setActiveTab('conversations')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === 'conversations' 
                  ? 'bg-orange-600 text-black shadow-md shadow-orange-600/20 font-black' 
                  : isLightMode ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-50' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
              }`}
            >
              Discussions ({acceptedContacts.length})
            </button>
            <button
              onClick={() => setActiveTab('discover')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === 'discover' 
                  ? 'bg-orange-600 text-black shadow-md shadow-orange-600/20 font-black' 
                  : isLightMode ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-50' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
              }`}
            >
              Trouver un membre
            </button>
            <button
              onClick={() => setActiveTab('support')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'support' 
                  ? 'bg-orange-600 text-black shadow-md shadow-orange-600/20 font-black' 
                  : 'text-orange-500 hover:text-orange-400 hover:bg-orange-500/10'
              }`}
            >
              <Headphones className="w-3.5 h-3.5" /> Service Client
            </button>
            {isAdmin && (
              <button
                onClick={() => setActiveTab('admin')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'admin' 
                    ? 'bg-rose-600 text-white shadow-md shadow-rose-500/20' 
                    : 'text-rose-500 hover:text-rose-400 hover:bg-rose-500/10'
                }`}
              >
                <ShieldAlert className="w-3.5 h-3.5" /> Admin
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs sm:text-sm flex items-center gap-3 shadow-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span className="font-medium">{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-6 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs sm:text-sm flex items-center gap-3 shadow-sm">
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
            <span className="font-medium">{successMsg}</span>
          </div>
        )}

        {activeTab === 'conversations' ? (
          <div className={`border rounded-3xl overflow-hidden flex-1 shadow-sm grid grid-cols-1 md:grid-cols-12 min-h-[550px] ${isLightMode ? 'bg-white border-slate-200/80' : 'bg-zinc-900 border-zinc-800'}`}>
            
            {/* Panneau de gauche : Liste des conversations acceptées */}
            <div className={`md:col-span-4 border-r flex flex-col ${isLightMode ? 'border-slate-200/80 bg-slate-50/50' : 'border-zinc-800 bg-zinc-950/40'}`}>
              <div className={`p-4 border-b text-xs font-bold uppercase tracking-wider ${isLightMode ? 'border-slate-200/80 text-slate-500' : 'border-zinc-800 text-zinc-400'}`}>
                Discussions actives ({acceptedContacts.length})
              </div>
              
              <div className="overflow-y-auto flex-1 divide-y divide-slate-200/50 dark:divide-zinc-800/50">
                {acceptedContacts.length === 0 ? (
                  <div className="p-6 text-center">
                    <p className={`text-xs ${isLightMode ? 'text-slate-400' : 'text-zinc-500'}`}>Aucune discussion active.</p>
                    <button 
                      onClick={() => setActiveTab('discover')}
                      className="mt-3 text-xs font-bold text-orange-500 hover:underline"
                    >
                      Trouver des membres à contacter
                    </button>
                  </div>
                ) : (
                  acceptedContacts.map((contact) => {
                    const isSelected = selectedContact?.id === contact.id;
                    const avatarUrl = getAvatarUrl(contact.avatar);
                    return (
                      <div
                        key={contact.id}
                        onClick={() => {
                          setSelectedContact(contact);
                          fetchMessages(contact.id, false);
                        }}
                        className={`p-4 flex items-center gap-3.5 cursor-pointer transition ${
                          isSelected 
                            ? isLightMode ? 'bg-orange-50 border-l-4 border-orange-500' : 'bg-orange-500/10 border-l-4 border-orange-500'
                            : isLightMode ? 'hover:bg-slate-100/80' : 'hover:bg-zinc-900/80'
                        }`}
                      >
                        {/* Avatar dynamique du contact */}
                        <div className="w-11 h-11 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-500 flex items-center justify-center font-bold text-sm flex-shrink-0 overflow-hidden relative">
                          {avatarUrl ? (
                            <img 
                              src={avatarUrl} 
                              alt={contact.name} 
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.currentTarget as HTMLElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            contact.name ? contact.name.charAt(0).toUpperCase() : <UserIcon className="w-5 h-5" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={`text-xs font-bold truncate ${isLightMode ? 'text-slate-900' : 'text-zinc-100'}`}>{contact.name}</p>
                          <p className={`text-[11px] truncate ${isLightMode ? 'text-slate-500' : 'text-zinc-400'}`}>{contact.email}</p>
                          <div className="mt-0.5">{renderUserStatus(contact.updatedAt)}</div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Panneau de droite : Zone de discussion active */}
            <div className="md:col-span-8 flex flex-col h-[600px] md:h-auto">
              {selectedContact ? (
                <>
                  {/* En-tête du chat actif */}
                  <div className={`p-4 border-b flex items-center justify-between ${isLightMode ? 'border-slate-200/80 bg-white' : 'border-zinc-800 bg-zinc-900'}`}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-500 flex items-center justify-center font-bold text-sm flex-shrink-0 overflow-hidden relative">
                        {selectedContact.avatar ? (
                          <img 
                            src={getAvatarUrl(selectedContact.avatar)} 
                            alt={selectedContact.name} 
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.currentTarget as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          selectedContact.name ? selectedContact.name.charAt(0).toUpperCase() : <UserIcon className="w-5 h-5" />
                        )}
                      </div>
                      <div>
                        <h3 className={`text-xs sm:text-sm font-bold ${isLightMode ? 'text-slate-900' : 'text-zinc-100'}`}>
                          {selectedContact.name}
                        </h3>
                        {renderUserStatus(selectedContact.updatedAt)}
                      </div>
                    </div>
                  </div>

                  {/* Corps des messages */}
                  <div className={`flex-1 p-4 overflow-y-auto space-y-3 ${isLightMode ? 'bg-slate-50/40' : 'bg-zinc-950/30'}`}>
                    {messages.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-center p-6">
                        <MessageCircle className={`w-10 h-10 mb-2 ${isLightMode ? 'text-slate-300' : 'text-zinc-700'}`} />
                        <p className={`text-xs ${isLightMode ? 'text-slate-400' : 'text-zinc-500'}`}>Aucun message pour le moment. Envoyez le premier message !</p>
                      </div>
                    ) : (
                      messages.map((msg) => {
                        const isMe = msg.senderId === currentUserId;
                        return (
                          <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                            <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-xs sm:text-sm shadow-2xs ${
                              isMe 
                                ? 'bg-orange-600 text-black font-medium rounded-br-xs' 
                                : isLightMode 
                                  ? 'bg-white border border-slate-200 text-slate-800 rounded-bl-xs' 
                                  : 'bg-zinc-800 border border-zinc-700 text-zinc-100 rounded-bl-xs'
                            }`}>
                              <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                            </div>
                            <span className={`text-[10px] mt-1 px-1 ${isLightMode ? 'text-slate-400' : 'text-zinc-500'}`}>
                              {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        );
                      })
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Formulaire d'envoi */}
                  <form onSubmit={handleSendMessage} className={`p-3 sm:p-4 border-t flex items-center gap-2 ${isLightMode ? 'border-slate-200/80 bg-white' : 'border-zinc-800 bg-zinc-900'}`}>
                    <input
                      type="text"
                      placeholder="Écrivez votre message sécurisé..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      className={`flex-1 text-xs sm:text-sm px-4 py-3 rounded-xl border outline-none transition ${
                        isLightMode 
                          ? 'bg-slate-50 border-slate-200 text-slate-800 focus:border-orange-500' 
                          : 'bg-zinc-950 border-zinc-800 text-zinc-100 focus:border-orange-500'
                      }`}
                    />
                    <button
                      type="submit"
                      disabled={!newMessage.trim()}
                      className="bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-black p-3 rounded-xl transition cursor-pointer shadow-md shadow-orange-600/20 flex items-center justify-center"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </form>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                  <Inbox className={`w-12 h-12 mb-3 ${isLightMode ? 'text-slate-300' : 'text-zinc-700'}`} />
                  <p className={`text-xs ${isLightMode ? 'text-slate-400' : 'text-zinc-500'}`}>Sélectionnez une discussion dans la liste pour commencer à chatter.</p>
                </div>
              )}
            </div>
          </div>
        ) : activeTab === 'discover' ? (
          <div className={`border rounded-3xl p-6 sm:p-8 flex-1 shadow-sm ${isLightMode ? 'bg-white border-slate-200/80' : 'bg-zinc-900 border-zinc-800'}`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <h3 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${isLightMode ? 'text-slate-400' : 'text-zinc-400'}`}>
                <UserPlus className="w-4 h-4 text-orange-500" /> Membres disponibles sur la plateforme
              </h3>
              
              <div className="relative w-full sm:w-72">
                <Search className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 ${isLightMode ? 'text-slate-400' : 'text-zinc-500'}`} />
                <input
                  type="text"
                  placeholder="Rechercher par nom ou email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full text-xs pl-10 pr-4 py-2.5 rounded-xl border outline-none transition ${
                    isLightMode 
                      ? 'bg-slate-50 border-slate-200 text-slate-800 focus:border-orange-500' 
                      : 'bg-zinc-950 border-zinc-800 text-zinc-100 focus:border-orange-500'
                  }`}
                />
              </div>
            </div>
            
            <div className="flex flex-col gap-3">
              {availableUsers
                .filter(user => 
                  user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  user.email?.toLowerCase().includes(searchQuery.toLowerCase())
                )
                .length === 0 ? (
                  <p className={`text-center py-8 text-xs ${isLightMode ? 'text-slate-400' : 'text-zinc-500'}`}>
                    Aucun membre trouvé pour "{searchQuery}".
                  </p>
                ) : (
                  availableUsers
                    .filter(user => 
                      user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      user.email?.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    .map((user) => {
                      const avatarUrl = getAvatarUrl(user.avatar);
                      return (
                        <div key={user.id} className={`border p-4 rounded-2xl flex items-center justify-between gap-4 transition shadow-2xs w-full ${
                          isLightMode ? 'bg-slate-50/80 border-slate-200/70 hover:border-orange-200' : 'bg-zinc-950/60 border-zinc-800 hover:border-orange-500/40'
                        }`}>
                          <div className="flex items-center gap-3.5 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-500 flex items-center justify-center font-bold text-sm flex-shrink-0 overflow-hidden relative">
                              {avatarUrl ? (
                                <img 
                                  src={avatarUrl} 
                                  alt={user.name} 
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    (e.currentTarget as HTMLElement).style.display = 'none';
                                  }}
                                />
                              ) : (
                                user.name ? user.name.charAt(0).toUpperCase() : <UserIcon className="w-5 h-5" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className={`text-sm font-bold truncate ${isLightMode ? 'text-slate-900' : 'text-zinc-100'}`}>{user.name}</p>
                              <p className={`text-xs truncate ${isLightMode ? 'text-slate-500' : 'text-zinc-400'}`}>{user.email}</p>
                              <span className="inline-block mt-1 text-[10px] bg-orange-500/10 text-orange-500 border border-orange-500/20 font-bold px-2 py-0.5 rounded uppercase">{user.role || 'Membre'}</span>
                            </div>
                          </div>

                          <div className="flex-shrink-0">
                            {user.contactStatus === 'ACCEPTED' ? (
                              <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-default">
                                <CheckCircle className="w-3.5 h-3.5" /> En contact
                              </span>
                            ) : user.contactStatus === 'PENDING' || pendingRequests.includes(user.id) ? (
                              <span className="bg-amber-500/10 border border-amber-500/20 text-amber-500 px-3 py-2 rounded-xl text-xs font-bold cursor-default">
                                En attente
                              </span>
                            ) : (
                              <button
                                onClick={() => handleSendContactRequest(user.id)}
                                className="bg-orange-600 hover:bg-orange-500 text-black px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer shadow-md shadow-orange-600/20"
                              >
                                Ajouter
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                )}
            </div>
          </div>
        ) : activeTab === 'support' ? (
          <div className={`border rounded-3xl p-6 sm:p-8 flex-1 shadow-sm flex flex-col justify-between ${isLightMode ? 'bg-white border-orange-100' : 'bg-zinc-900 border-orange-500/30'}`}>
            <div>
              <div className="flex items-center gap-3 text-orange-500 mb-4">
                <div className="p-3 bg-orange-500/10 rounded-2xl border border-orange-500/20">
                  <Headphones className="w-6 h-6" />
                </div>
                <div>
                  <h3 className={`text-lg font-black ${isLightMode ? 'text-slate-900' : 'text-zinc-100'}`}>Centre de Support & Service Client CBFSOKO</h3>
                  <p className={`text-xs mt-0.5 ${isLightMode ? 'text-slate-500' : 'text-zinc-400'}`}>Assistance technique et commerciale dédiée</p>
                </div>
              </div>
              <p className={`text-xs sm:text-sm mb-6 leading-relaxed ${isLightMode ? 'text-slate-600' : 'text-zinc-300'}`}>
                Une question sur une commande, un problème technique ou besoin d'assistance ? Notre équipe de support est à votre disposition en direct.
              </p>
              
              <div className={`border p-5 rounded-2xl mb-6 space-y-3 ${isLightMode ? 'bg-slate-50 border-slate-200/80' : 'bg-zinc-950/60 border-zinc-800'}`}>
                <p className={`text-xs font-bold uppercase tracking-wider ${isLightMode ? 'text-slate-700' : 'text-zinc-400'}`}>Canaux d'assistance rapides :</p>
                <div className="flex flex-col gap-2.5">
                  <a 
                    href="mailto:cbfsoko@gmail.com" 
                    className={`flex items-center justify-between p-3.5 rounded-xl border text-xs shadow-2xs transition hover:border-orange-500 ${isLightMode ? 'bg-white border-slate-200/60 text-slate-600 hover:text-slate-900' : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white'}`}
                  >
                    <span className="font-medium flex items-center gap-2"><Mail className="w-4 h-4 text-orange-500" /> Support Technique Prioritaire (Email)</span>
                    <span className="text-orange-500 font-bold underline">cbfsoko@gmail.com</span>
                  </a>
                  
                  <a 
                    href="https://wa.me/243971658685?text=Bonjour,%20je%20souhaite%20obtenir%20de%20l'aide%20sur%20CBFSOKO" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className={`flex items-center justify-between p-3.5 rounded-xl border text-xs shadow-2xs transition hover:border-emerald-500 ${isLightMode ? 'bg-white border-slate-200/60 text-slate-600 hover:text-slate-900' : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white'}`}
                  >
                    <span className="font-medium flex items-center gap-2"><MessageCircle className="w-4 h-4 text-emerald-500" /> Assistance Téléphonique / WhatsApp</span>
                    <span className="text-emerald-500 font-bold underline">+243 971658685</span>
                  </a>
                </div>
              </div>
            </div>
            <div className={`p-4 sm:p-5 border rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 ${isLightMode ? 'bg-orange-50/70 border-orange-100 text-orange-900' : 'bg-orange-500/10 border-orange-500/20 text-orange-200'}`}>
              <span className="text-xs sm:text-sm font-medium">Besoin d'ouvrir un ticket d'incident instantané avec CBF Support ?</span>
              <button 
                onClick={handleOpenSupportChat}
                className="bg-orange-600 hover:bg-orange-500 text-black text-xs font-bold px-5 py-3 rounded-xl transition cursor-pointer shadow-md shadow-orange-600/20 whitespace-nowrap"
              >
                Ouvrir un chat support
              </button>
            </div>
          </div>
        ) : activeTab === 'admin' && isAdmin ? (
          <div className={`border rounded-3xl p-6 sm:p-8 flex-1 shadow-sm ${isLightMode ? 'bg-white border-rose-200' : 'bg-zinc-900 border-rose-900/50'}`}>
            <h3 className="text-xs font-bold uppercase tracking-wider text-rose-500 mb-6 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4" /> Panneau de Supervision Administrative
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className={`border p-5 rounded-2xl shadow-2xs ${isLightMode ? 'bg-slate-50 border-slate-200/80 text-slate-900' : 'bg-zinc-950 border-zinc-800 text-zinc-100'}`}>
                <p className={`text-xs font-medium ${isLightMode ? 'text-slate-500' : 'text-zinc-400'}`}>Total Contacts Globaux</p>
                <p className="text-2xl font-black mt-1">{acceptedContacts.length}</p>
              </div>
              <div className={`border p-5 rounded-2xl shadow-2xs ${isLightMode ? 'bg-slate-50 border-slate-200/80 text-slate-900' : 'bg-zinc-950 border-zinc-800 text-zinc-100'}`}>
                <p className={`text-xs font-medium ${isLightMode ? 'text-slate-500' : 'text-zinc-400'}`}>Membres Inscrits</p>
                <p className="text-2xl font-black mt-1">{availableUsers.length}</p>
              </div>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}