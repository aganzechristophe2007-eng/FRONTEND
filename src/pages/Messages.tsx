import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, LogOut, Send, Inbox, AlertCircle, UserPlus, CheckCircle, Headphones, Sun, Moon, MessageCircle, Search, User as UserIcon, CheckCheck, Smile, Paperclip } from 'lucide-react';

interface ContactUser {
  id: string;
  name: string;
  email: string;
  role?: string;
  avatar?: string;
  updatedAt?: string;
  contactStatus?: 'ACCEPTED' | 'PENDING' | 'REJECTED' | null;
  unreadCount?: number;
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
  const [userAvatar, setUserAvatar] = useState('');
  const [userRole, setUserRole] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [acceptedContacts, setAcceptedContacts] = useState<ContactUser[]>([]);
  const [availableUsers, setAvailableUsers] = useState<ContactUser[]>([]);
  const [selectedContact, setSelectedContact] = useState<ContactUser | null>(null);
  
  const [showMobileChat, setShowMobileChat] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  
  const [activeBottomTab, setActiveBottomTab] = useState<'chats' | 'people'>('chats');
  const [isLightMode, setIsLightMode] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const getAvatarUrl = (path?: string) => {
    if (!path || typeof path !== 'string') return '';
    const trimmed = path.trim();
    if (!trimmed) return '';
    if (trimmed.startsWith('http') || trimmed.startsWith('blob:') || trimmed.startsWith('data:')) {
      return trimmed;
    }
    const cleanPath = trimmed.replace(/\\/g, '/');
    const formattedPath = cleanPath.startsWith('/') ? cleanPath : `/${cleanPath}`;
    if (!formattedPath.includes('uploads')) {
      return `https://cbfsoko-backend.onrender.com/uploads${formattedPath}`;
    }
    return `https://cbfsoko-backend.onrender.com${formattedPath}`;
  };

  const isUserOnline = (updatedAt?: string) => {
    if (!updatedAt) return false;
    const lastActive = new Date(updatedAt).getTime();
    const now = new Date().getTime();
    const diffMinutes = (now - lastActive) / (1000 * 60);
    return diffMinutes <= 3;
  };

  useEffect(() => {
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
      if (user.avatar) setUserAvatar(user.avatar);
    } catch {
      // Ignorer
    }

    loadInitialData(token);
  }, [navigate]);

  useEffect(() => {
    if (!selectedContact?.id) return;

    const interval = setInterval(() => {
      const currentToken = localStorage.getItem('token');
      if (currentToken) {
        fetchMessages(selectedContact.id, true);
      }
    }, 4000);

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
      const resUsers = await fetch('https://cbfsoko-backend.onrender.com/api/messages/users/available', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const dataUsers = await resUsers.json();
      let usersList: ContactUser[] = [];
      if (dataUsers.success && Array.isArray(dataUsers.data)) {
        usersList = dataUsers.data;
        setAvailableUsers(usersList);
      }

      const resContacts = await fetch('https://cbfsoko-backend.onrender.com/api/messages/contacts/accepted', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (resContacts.status === 401) {
        handleUnauthorized();
        return;
      }

      const dataContacts = await resContacts.json();
      const rawContactsList = dataContacts.success && Array.isArray(dataContacts.data) ? dataContacts.data : [];

      const contactsList = rawContactsList.map((contact: ContactUser) => {
        const matchingUser = usersList.find((u) => u.id === contact.id);
        return {
          ...contact,
          avatar: contact.avatar || matchingUser?.avatar || '',
          updatedAt: matchingUser?.updatedAt || contact.updatedAt,
          unreadCount: contact.unreadCount || 0
        };
      });

      setAcceptedContacts(contactsList);

      if (contactsList.length > 0 && window.innerWidth >= 768) {
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
        setAcceptedContacts(prev => prev.map(c => c.id === otherId ? { ...c, unreadCount: 0 } : c));
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
        setSuccessMsg("Demande envoyée !");
        setPendingRequests(prev => [...prev, targetUserId]);
        setAvailableUsers(prev => 
          prev.map(u => u.id === targetUserId ? { ...u, contactStatus: 'PENDING' } : u)
        );
      } else {
        setError(data.message || "Erreur lors de l'envoi.");
      }
    } catch {
      setError("Erreur réseau.");
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
      setActiveBottomTab('chats');
      setShowMobileChat(true);
      setNewMessage('Bonjour je souhaite obtenir de l’aide...');

      fetchMessages(adminUser.id, false);
      setSuccessMsg("Support ouvert.");
    } catch {
      setError("Erreur ouverture support.");
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
      setError("Erreur réseau.");
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
        <div className="flex items-center gap-1.5 p-4">
          <div className="w-2.5 h-2.5 bg-orange-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
          <div className="w-2.5 h-2.5 bg-orange-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
          <div className="w-2.5 h-2.5 bg-orange-500 rounded-full animate-bounce"></div>
        </div>
      </div>
    );
  }

  const currentUserAvatarUrl = getAvatarUrl(userAvatar);

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-colors duration-200 text-xs sm:text-sm ${isLightMode ? 'bg-slate-100 text-slate-900' : 'bg-zinc-950 text-zinc-100'}`}>
      
      {/* En-tête supérieur moderne */}
      <header className={`border-b px-3.5 py-3 sticky top-0 z-50 backdrop-blur-md transition-colors duration-200 ${
        isLightMode ? 'border-slate-200 bg-white/90 shadow-xs' : 'border-zinc-800/80 bg-zinc-900/90 shadow-md'
      }`}>
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 w-full">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-orange-500/15 border border-orange-500/30 text-orange-500 flex items-center justify-center font-bold text-xs overflow-hidden relative shadow-xs">
              {currentUserAvatarUrl ? (
                <img 
                  src={currentUserAvatarUrl} 
                  alt={userName} 
                  className="w-full h-full object-cover bg-white dark:bg-zinc-900" 
                  onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }} 
                />
              ) : (
                <span className="font-bold text-orange-500">
                  {userName ? userName.charAt(0).toUpperCase() : <UserIcon className="w-4 h-4" />}
                </span>
              )}
            </div>
            <div>
              <h1 className={`text-sm sm:text-base font-black tracking-tight ${isLightMode ? 'text-slate-900' : 'text-zinc-100'}`}>Messagerie</h1>
              <p className="text-[10px] text-orange-500 font-semibold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> En ligne
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenSupportChat}
              className={`p-2 rounded-xl border transition cursor-pointer flex items-center justify-center gap-1 font-semibold ${
                isLightMode ? 'bg-orange-50 text-orange-600 border-orange-200 hover:bg-orange-100' : 'bg-orange-500/10 text-orange-400 border-orange-500/20 hover:bg-orange-500/20'
              }`}
              title="Support Client"
            >
              <Headphones className="w-4 h-4" />
              <span className="hidden sm:inline text-xs">Support</span>
            </button>

            <button
              onClick={() => setIsLightMode(!isLightMode)}
              className={`p-2 rounded-xl text-xs font-bold transition cursor-pointer border ${
                isLightMode ? 'bg-slate-100 text-amber-600 border-slate-200 hover:bg-slate-200' : 'bg-zinc-800 text-amber-400 border-zinc-700 hover:bg-zinc-700'
              }`}
              title="Changer de thème"
            >
              {isLightMode ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4 text-amber-400" />}
            </button>

            <Link to="/" className={`p-2 rounded-xl border transition flex items-center justify-center ${
              isLightMode ? 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200' : 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700'
            }`} title="Retour à l'accueil">
              <ArrowLeft className="w-4 h-4" />
            </Link>

            <button
              onClick={handleLogout}
              className="p-2 rounded-xl bg-rose-500/15 text-rose-500 hover:bg-rose-600 hover:text-white transition cursor-pointer border border-rose-500/30 flex items-center justify-center"
              title="Déconnexion"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl w-full mx-auto p-2 sm:p-4 lg:p-6 flex-1 flex flex-col pb-20">
        
        {error && (
          <div className="mb-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs flex items-center gap-2.5 shadow-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span className="font-semibold">{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs flex items-center gap-2.5 shadow-sm">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            <span className="font-semibold">{successMsg}</span>
          </div>
        )}

        {activeBottomTab === 'chats' ? (
          <div className={`border rounded-2xl overflow-hidden flex-1 shadow-md grid grid-cols-1 md:grid-cols-12 min-h-[550px] ${
            isLightMode ? 'bg-white border-slate-200' : 'bg-zinc-900 border-zinc-800'
          }`}>
            
            {/* Liste des discussions (Style WhatsApp moderne) */}
            <div className={`md:col-span-4 border-r flex flex-col ${showMobileChat ? 'hidden md:flex' : 'flex'} ${
              isLightMode ? 'border-slate-200 bg-slate-50/50' : 'border-zinc-800 bg-zinc-900/50'
            }`}>
              
              <div className="p-3 border-b border-slate-200/80 dark:border-zinc-800">
                <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition ${
                  isLightMode ? 'bg-white border-slate-300 focus-within:border-orange-500' : 'bg-zinc-950 border-zinc-700/80 focus-within:border-orange-500'
                }`}>
                  <Search className={`w-4 h-4 ${isLightMode ? 'text-slate-400' : 'text-zinc-400'}`} />
                  <input
                    type="text"
                    placeholder="Rechercher une discussion..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-transparent text-xs font-medium outline-none"
                  />
                </div>
              </div>

              <div className="overflow-y-auto flex-1 divide-y divide-slate-200/60 dark:divide-zinc-800/60">
                {acceptedContacts.length === 0 ? (
                  <div className="p-8 text-center flex flex-col items-center justify-center h-full">
                    <MessageCircle className={`w-10 h-10 mb-2 ${isLightMode ? 'text-slate-300' : 'text-zinc-700'}`} />
                    <p className={`text-xs font-medium ${isLightMode ? 'text-slate-500' : 'text-zinc-400'}`}>Aucune discussion active.</p>
                    <button 
                      onClick={() => setActiveBottomTab('people')}
                      className="mt-3 bg-orange-600 hover:bg-orange-500 text-white text-[11px] font-bold px-3 py-1.5 rounded-xl transition cursor-pointer"
                    >
                      Trouver des contacts
                    </button>
                  </div>
                ) : (
                  acceptedContacts
                    .filter(c => c.name?.toLowerCase().includes(searchQuery.toLowerCase()))
                    .map((contact) => {
                      const isSelected = selectedContact?.id === contact.id;
                      const avatarUrl = getAvatarUrl(contact.avatar);
                      const online = isUserOnline(contact.updatedAt);
                      const hasUnread = (contact.unreadCount || 0) > 0;
                      return (
                        <div
                          key={contact.id}
                          onClick={() => {
                            setSelectedContact(contact);
                            setShowMobileChat(true);
                            fetchMessages(contact.id, false);
                          }}
                          className={`p-3 sm:p-3.5 flex items-center gap-3 cursor-pointer transition ${
                            isSelected 
                              ? isLightMode ? 'bg-orange-50 border-l-4 border-orange-600 shadow-inner' : 'bg-orange-500/15 border-l-4 border-orange-500 shadow-inner'
                              : isLightMode ? 'hover:bg-slate-100/80' : 'hover:bg-zinc-800/60'
                          }`}
                        >
                          <div className="w-11 h-11 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-500 flex items-center justify-center font-bold text-xs flex-shrink-0 overflow-hidden relative shadow-xs">
                            {avatarUrl ? (
                              <img 
                                src={avatarUrl} 
                                alt={contact.name} 
                                className="w-full h-full object-cover bg-white dark:bg-zinc-900" 
                                onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }} 
                              />
                            ) : (
                              <span className="absolute inset-0 flex items-center justify-center font-bold text-orange-500">
                                {contact.name ? contact.name.charAt(0).toUpperCase() : <UserIcon className="w-4 h-4" />}
                              </span>
                            )}
                            {online && (
                              <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white dark:border-zinc-900 rounded-full"></span>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between mb-0.5">
                              <p className={`text-xs sm:text-sm font-bold truncate ${isLightMode ? 'text-slate-900' : 'text-zinc-100'}`}>{contact.name}</p>
                              {hasUnread && (
                                <span className="bg-orange-600 text-white text-[9px] font-bold px-1.5 py-0.2 rounded-full flex-shrink-0 ml-1.5 shadow-sm">
                                  {contact.unreadCount}
                                </span>
                              )}
                            </div>
                            <p className={`text-[11px] truncate ${isLightMode ? 'text-slate-500' : 'text-zinc-400'}`}>{contact.email}</p>
                          </div>
                        </div>
                      );
                    })
                )}
              </div>
            </div>

            {/* Fenêtre de chat active */}
            <div className={`md:col-span-8 flex flex-col h-[550px] md:h-auto ${!showMobileChat ? 'hidden md:flex' : 'flex'}`}>
              {selectedContact ? (
                <>
                  {/* Entête du chat */}
                  <div className={`p-3 sm:p-3.5 border-b flex items-center justify-between ${isLightMode ? 'border-slate-200 bg-white' : 'border-zinc-800 bg-zinc-900'}`}>
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => setShowMobileChat(false)}
                        className="md:hidden p-1.5 rounded-xl text-orange-500 hover:bg-orange-500/10 transition cursor-pointer"
                      >
                        <ArrowLeft className="w-5 h-5" />
                      </button>
                      <div className="w-10 h-10 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-500 flex items-center justify-center font-bold text-xs flex-shrink-0 overflow-hidden relative shadow-xs">
                        {selectedContact.avatar ? (
                          <img 
                            src={getAvatarUrl(selectedContact.avatar)} 
                            alt={selectedContact.name} 
                            className="w-full h-full object-cover bg-white dark:bg-zinc-900" 
                            onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }} 
                          />
                        ) : (
                          selectedContact.name ? selectedContact.name.charAt(0).toUpperCase() : <UserIcon className="w-4 h-4" />
                        )}
                      </div>
                      <div>
                        <h3 className={`text-xs sm:text-sm font-bold ${isLightMode ? 'text-slate-900' : 'text-zinc-100'}`}>
                          {selectedContact.name}
                        </h3>
                        <span className={`text-[10px] font-semibold flex items-center gap-1 ${isUserOnline(selectedContact.updatedAt) ? 'text-emerald-500' : isLightMode ? 'text-slate-500' : 'text-zinc-400'}`}>
                          <span className={`w-2 h-2 rounded-full ${isUserOnline(selectedContact.updatedAt) ? 'bg-emerald-500' : 'bg-zinc-500'}`}></span>
                          {isUserOnline(selectedContact.updatedAt) ? 'En ligne' : 'Hors ligne'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Corps des messages (Arrière-plan WhatsApp / Tonalité pro) */}
                  <div className={`flex-1 p-3.5 sm:p-5 overflow-y-auto space-y-3 ${
                    isLightMode 
                      ? 'bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:20px_20px] bg-slate-100' 
                      : 'bg-[radial-gradient(#27272a_1px,transparent_1px)] [background-size:20px_20px] bg-zinc-950'
                  }`}>
                    {messages.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-center p-4">
                        <MessageCircle className={`w-12 h-12 mb-2 opacity-50 ${isLightMode ? 'text-slate-400' : 'text-zinc-600'}`} />
                        <p className={`text-xs font-medium ${isLightMode ? 'text-slate-500' : 'text-zinc-400'}`}>Envoyez votre premier message pour démarrer la conversation.</p>
                      </div>
                    ) : (
                      messages.map((msg) => {
                        const isMe = msg.senderId === currentUserId;
                        return (
                          <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                            <div className={`max-w-[85%] sm:max-w-[70%] px-3.5 py-2.5 rounded-2xl text-xs shadow-sm ${
                              isMe 
                                ? 'bg-orange-600 text-white font-medium rounded-br-xs shadow-orange-600/10' 
                                : isLightMode 
                                  ? 'bg-white border border-slate-200 text-slate-900 rounded-bl-xs shadow-xs' 
                                  : 'bg-zinc-900 border border-zinc-800 text-zinc-100 rounded-bl-xs shadow-xs'
                            }`}>
                              <p className="whitespace-pre-wrap break-words leading-relaxed">{msg.content}</p>
                              <div className={`flex items-center gap-1 justify-end mt-1 text-[9px] font-medium ${
                                isMe ? 'text-orange-200' : isLightMode ? 'text-slate-400' : 'text-zinc-500'
                              }`}>
                                <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                {isMe && <CheckCheck className="w-3.5 h-3.5 text-emerald-300" />}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Barre d'envoi de message (Expérience WhatsApp complète) */}
                  <form onSubmit={handleSendMessage} className={`p-3 border-t flex items-center gap-2.5 ${isLightMode ? 'border-slate-200 bg-white' : 'border-zinc-800 bg-zinc-900'}`}>
                    <button type="button" className={`p-2 rounded-xl transition cursor-pointer ${isLightMode ? 'text-slate-500 hover:bg-slate-100' : 'text-zinc-400 hover:bg-zinc-800'}`} title="Emojis">
                      <Smile className="w-5 h-5" />
                    </button>
                    <button type="button" className={`p-2 rounded-xl transition cursor-pointer ${isLightMode ? 'text-slate-500 hover:bg-slate-100' : 'text-zinc-400 hover:bg-zinc-800'}`} title="Joindre un fichier">
                      <Paperclip className="w-5 h-5" />
                    </button>
                    <input
                      type="text"
                      placeholder="Tapez votre message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      className={`flex-1 text-xs px-4 py-2.5 rounded-xl border outline-none transition ${
                        isLightMode ? 'bg-slate-50 border-slate-300 text-slate-900 focus:border-orange-600' : 'bg-zinc-950 border-zinc-700 text-zinc-100 focus:border-orange-500'
                      }`}
                    />
                    <button
                      type="submit"
                      disabled={!newMessage.trim()}
                      className="bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white p-2.5 rounded-xl transition cursor-pointer shadow-md flex items-center justify-center"
                      title="Envoyer"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </form>
                </>
              ) : (
                <div className="flex-1 hidden md:flex flex-col items-center justify-center p-6 text-center">
                  <Inbox className={`w-12 h-12 mb-3 opacity-40 ${isLightMode ? 'text-slate-400' : 'text-zinc-600'}`} />
                  <p className={`text-xs font-bold ${isLightMode ? 'text-slate-600' : 'text-zinc-300'}`}>Sélectionnez une discussion pour commencer à échanger.</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className={`border rounded-2xl p-4 sm:p-6 flex-1 shadow-md ${isLightMode ? 'bg-white border-slate-200' : 'bg-zinc-900 border-zinc-800'}`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
              <div>
                <h2 className={`text-sm sm:text-base font-bold ${isLightMode ? 'text-slate-900' : 'text-zinc-100'}`}>Annuaire des membres</h2>
                <p className={`text-[11px] mt-0.5 font-medium ${isLightMode ? 'text-slate-600' : 'text-zinc-300'}`}>
                  Amis en contact : <span className="font-bold text-orange-600 dark:text-orange-500">{acceptedContacts.length}</span>
                </p>
              </div>
              <div className="relative w-full sm:w-72">
                <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isLightMode ? 'text-slate-400' : 'text-zinc-400'}`} />
                <input
                  type="text"
                  placeholder="Rechercher des membres..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full text-xs pl-9 pr-3.5 py-2.5 rounded-xl border outline-none transition ${
                    isLightMode ? 'bg-slate-50 border-slate-300 text-slate-900 focus:border-orange-600' : 'bg-zinc-950 border-zinc-700 text-zinc-100 focus:border-orange-500'
                  }`}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {availableUsers
                .filter(user => user.name?.toLowerCase().includes(searchQuery.toLowerCase()) || user.email?.toLowerCase().includes(searchQuery.toLowerCase()))
                .map((user) => {
                  const isContact = acceptedContacts.some(c => c.id === user.id);
                  const isPending = pendingRequests.includes(user.id) || user.contactStatus === 'PENDING';
                  const avatarUrl = getAvatarUrl(user.avatar);
                  return (
                    <div key={user.id} className={`p-3 border rounded-xl flex items-center justify-between gap-3 shadow-xs transition hover:border-orange-500/50 ${isLightMode ? 'border-slate-200 bg-slate-50/60' : 'border-zinc-800 bg-zinc-950'}`}>
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-500 flex items-center justify-center font-bold text-xs flex-shrink-0 overflow-hidden relative shadow-xs">
                          {avatarUrl ? (
                            <img 
                              src={avatarUrl} 
                              alt={user.name} 
                              className="w-full h-full object-cover bg-white dark:bg-zinc-900" 
                              onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }} 
                            />
                          ) : (
                            user.name ? user.name.charAt(0).toUpperCase() : <UserIcon className="w-4 h-4" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className={`text-xs font-bold truncate ${isLightMode ? 'text-slate-900' : 'text-zinc-100'}`}>{user.name}</p>
                          <p className={`text-[10px] truncate mt-0.5 ${isLightMode ? 'text-slate-500' : 'text-zinc-400'}`}>{user.email}</p>
                        </div>
                      </div>
                      
                      {isContact ? (
                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg">Amis</span>
                      ) : isPending ? (
                        <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg">En attente</span>
                      ) : (
                        <button
                          onClick={() => handleSendContactRequest(user.id)}
                          className="bg-orange-600 hover:bg-orange-500 text-white p-2 rounded-xl transition cursor-pointer shadow-sm flex items-center justify-center"
                          title="Ajouter comme ami"
                        >
                          <UserPlus className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </main>

      {/* Barre de navigation inférieure mobile moderne */}
      <nav className={`fixed bottom-0 left-0 right-0 border-t py-2.5 px-6 z-50 flex items-center justify-around transition-colors duration-200 ${
        isLightMode ? 'border-slate-200 bg-white/95 shadow-xl' : 'border-zinc-800 bg-zinc-900/95 shadow-xl shadow-black/80 backdrop-blur-md'
      }`}>
        <button
          onClick={() => { setActiveBottomTab('chats'); setShowMobileChat(false); }}
          className={`flex flex-col items-center gap-1 p-1.5 rounded-xl transition cursor-pointer ${
            activeBottomTab === 'chats' 
              ? 'text-orange-600 dark:text-orange-500 font-bold scale-105' 
              : isLightMode ? 'text-slate-500 hover:text-slate-800' : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <MessageCircle className="w-5 h-5" />
          <span className="text-[10px]">Discussions</span>
        </button>

        <button
          onClick={() => setActiveBottomTab('people')}
          className={`flex flex-col items-center gap-1 p-1.5 rounded-xl transition cursor-pointer ${
            activeBottomTab === 'people' 
              ? 'text-orange-600 dark:text-orange-500 font-bold scale-105' 
              : isLightMode ? 'text-slate-500 hover:text-slate-800' : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <UserPlus className="w-5 h-5" />
          <span className="text-[10px]">Membres</span>
        </button>
      </nav>

    </div>
  );
}