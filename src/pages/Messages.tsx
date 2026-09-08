import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, LogOut, Send, Inbox, AlertCircle, UserPlus, CheckCircle, Headphones, Sun, Moon, MessageCircle, Search, User as UserIcon } from 'lucide-react';

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
  const [isLightMode, setIsLightMode] = useState(true);
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
      
      {/* En-tête supérieur compact */}
      <header className={`border px-3 py-2.5 sticky top-0 z-50 transition-colors duration-200 ${
        isLightMode ? 'border-slate-200 bg-white shadow-sm' : 'border-zinc-800 bg-zinc-900 shadow-md'
      }`}>
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 w-full">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-500 flex items-center justify-center font-bold text-xs overflow-hidden relative shadow-sm">
              {currentUserAvatarUrl ? (
                <img 
                  src={currentUserAvatarUrl} 
                  alt={userName} 
                  className="w-full h-full object-cover bg-white dark:bg-zinc-900" 
                  onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }} 
                />
              ) : (
                <span className="font-bold text-orange-500">
                  {userName ? userName.charAt(0).toUpperCase() : <UserIcon className="w-3.5 h-3.5" />}
                </span>
              )}
            </div>
            <h1 className={`text-sm sm:text-base font-black tracking-tight ${isLightMode ? 'text-slate-900' : 'text-zinc-100'}`}>Chats</h1>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleOpenSupportChat}
              className={`p-2 rounded-lg border transition cursor-pointer flex items-center justify-center ${
                isLightMode ? 'bg-white text-orange-600 border-slate-200 hover:bg-orange-50' : 'bg-zinc-900 text-orange-400 border-zinc-800 hover:bg-zinc-800'
              }`}
              title="Support Client"
            >
              <Headphones className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => setIsLightMode(!isLightMode)}
              className={`p-2 rounded-lg text-xs font-bold transition cursor-pointer border ${
                isLightMode ? 'bg-white text-amber-500 border-slate-200 hover:bg-slate-50' : 'bg-zinc-900 text-amber-400 border-zinc-800 hover:bg-zinc-800'
              }`}
            >
              {isLightMode ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5 text-amber-400" />}
            </button>

            <Link to="/" className={`p-2 rounded-lg border transition ${
              isLightMode ? 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50' : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:bg-zinc-800'
            }`}>
              <ArrowLeft className="w-3.5 h-3.5" />
            </Link>

            <button
              onClick={handleLogout}
              className="p-2 rounded-lg bg-rose-500/10 text-rose-500 hover:bg-rose-600 hover:text-white transition cursor-pointer border border-rose-500/20"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl w-full mx-auto p-2 sm:p-4 lg:p-6 flex-1 flex flex-col pb-20">
        
        {error && (
          <div className="mb-3 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs flex items-center gap-2">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="font-semibold">{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-3 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs flex items-center gap-2">
            <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="font-semibold">{successMsg}</span>
          </div>
        )}

        {activeBottomTab === 'chats' ? (
          <div className={`border rounded-2xl overflow-hidden flex-1 shadow-sm grid grid-cols-1 md:grid-cols-12 min-h-[500px] ${
            isLightMode ? 'bg-white border-slate-200' : 'bg-zinc-900 border-zinc-800'
          }`}>
            
            <div className={`md:col-span-4 border-r flex flex-col ${showMobileChat ? 'hidden md:flex' : 'flex'} ${
              isLightMode ? 'border-slate-200 bg-slate-50' : 'border-zinc-800 bg-zinc-900'
            }`}>
              
              <div className="p-2.5 border-b border-slate-200 dark:border-zinc-800">
                <div className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl border ${
                  isLightMode ? 'bg-white border-slate-300' : 'bg-zinc-950 border-zinc-700'
                }`}>
                  <Search className={`w-3.5 h-3.5 ${isLightMode ? 'text-slate-400' : 'text-zinc-400'}`} />
                  <input
                    type="text"
                    placeholder="Rechercher..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-transparent text-xs font-medium outline-none"
                  />
                </div>
              </div>

              <div className="overflow-y-auto flex-1 divide-y divide-slate-200 dark:divide-zinc-800">
                {acceptedContacts.length === 0 ? (
                  <div className="p-6 text-center">
                    <p className={`text-xs font-medium ${isLightMode ? 'text-slate-500' : 'text-zinc-400'}`}>Aucune discussion.</p>
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
                          className={`p-2.5 sm:p-3 flex items-center gap-2.5 cursor-pointer transition ${
                            isSelected 
                              ? isLightMode ? 'bg-orange-50 border-l-3 border-orange-600' : 'bg-orange-500/15 border-l-3 border-orange-500'
                              : isLightMode ? 'hover:bg-slate-100' : 'hover:bg-zinc-800/80'
                          }`}
                        >
                          <div className="w-9 h-9 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-500 flex items-center justify-center font-bold text-xs flex-shrink-0 overflow-hidden relative shadow-xs">
                            {avatarUrl ? (
                              <img 
                                src={avatarUrl} 
                                alt={contact.name} 
                                className="w-full h-full object-cover bg-white dark:bg-zinc-900" 
                                onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }} 
                              />
                            ) : (
                              <span className="absolute inset-0 flex items-center justify-center font-bold text-orange-500">
                                {contact.name ? contact.name.charAt(0).toUpperCase() : <UserIcon className="w-3.5 h-3.5" />}
                              </span>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between">
                              <p className={`text-xs font-bold truncate ${isLightMode ? 'text-slate-900' : 'text-zinc-100'}`}>{contact.name}</p>
                              {hasUnread && (
                                <span className="w-2 h-2 bg-orange-600 rounded-full flex-shrink-0 ml-1.5"></span>
                              )}
                            </div>
                            <p className={`text-[11px] truncate mt-0.5 ${isLightMode ? 'text-slate-500' : 'text-zinc-400'}`}>{contact.email}</p>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <span className={`w-2 h-2 rounded-full ${online ? 'bg-emerald-500 ring-1 ring-emerald-500/20' : 'bg-slate-300 dark:bg-zinc-700'}`}></span>
                          </div>
                        </div>
                      );
                    })
                )}
              </div>
            </div>

            <div className={`md:col-span-8 flex flex-col h-[500px] md:h-auto ${!showMobileChat ? 'hidden md:flex' : 'flex'}`}>
              {selectedContact ? (
                <>
                  <div className={`p-2.5 sm:p-3 border-b flex items-center justify-between ${isLightMode ? 'border-slate-200 bg-white' : 'border-zinc-800 bg-zinc-900'}`}>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => setShowMobileChat(false)}
                        className="md:hidden p-1.5 rounded-lg text-orange-500 hover:bg-orange-500/10 transition"
                      >
                        <ArrowLeft className="w-4 h-4" />
                      </button>
                      <div className="w-8 h-8 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-500 flex items-center justify-center font-bold text-xs flex-shrink-0 overflow-hidden relative">
                        {selectedContact.avatar ? (
                          <img 
                            src={getAvatarUrl(selectedContact.avatar)} 
                            alt={selectedContact.name} 
                            className="w-full h-full object-cover bg-white dark:bg-zinc-900" 
                            onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }} 
                          />
                        ) : (
                          selectedContact.name ? selectedContact.name.charAt(0).toUpperCase() : <UserIcon className="w-3.5 h-3.5" />
                        )}
                      </div>
                      <div>
                        <h3 className={`text-xs sm:text-sm font-bold ${isLightMode ? 'text-slate-900' : 'text-zinc-100'}`}>
                          {selectedContact.name}
                        </h3>
                        <span className={`text-[10px] font-medium ${isUserOnline(selectedContact.updatedAt) ? 'text-emerald-500' : isLightMode ? 'text-slate-500' : 'text-zinc-400'}`}>
                          {isUserOnline(selectedContact.updatedAt) ? 'En ligne' : 'Hors ligne'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className={`flex-1 p-3 sm:p-4 overflow-y-auto space-y-2.5 ${isLightMode ? 'bg-slate-100' : 'bg-zinc-950'}`}>
                    {messages.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-center p-4">
                        <MessageCircle className={`w-8 h-8 mb-2 ${isLightMode ? 'text-slate-400' : 'text-zinc-600'}`} />
                        <p className={`text-[11px] font-medium ${isLightMode ? 'text-slate-500' : 'text-zinc-400'}`}>Aucun message.</p>
                      </div>
                    ) : (
                      messages.map((msg) => {
                        const isMe = msg.senderId === currentUserId;
                        return (
                          <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                            <div className={`max-w-[85%] sm:max-w-[75%] px-3 py-1.5 rounded-xl text-xs shadow-xs ${
                              isMe 
                                ? 'bg-orange-600 text-white font-medium rounded-br-xs' 
                                : isLightMode 
                                  ? 'bg-white border border-slate-200 text-slate-900 rounded-bl-xs' 
                                  : 'bg-zinc-800 border border-zinc-700 text-zinc-100 rounded-bl-xs'
                            }`}>
                              <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                            </div>
                            <span className={`text-[9px] mt-0.5 px-1 font-medium ${isLightMode ? 'text-slate-500' : 'text-zinc-400'}`}>
                              {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        );
                      })
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  <form onSubmit={handleSendMessage} className={`p-2.5 sm:p-3 border-t flex items-center gap-2 ${isLightMode ? 'border-slate-200 bg-white' : 'border-zinc-800 bg-zinc-900'}`}>
                    <input
                      type="text"
                      placeholder="Message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      className={`flex-1 text-xs px-3 py-2 rounded-xl border outline-none transition ${
                        isLightMode ? 'bg-slate-50 border-slate-300 text-slate-900 focus:border-orange-600' : 'bg-zinc-950 border-zinc-700 text-zinc-100 focus:border-orange-500'
                      }`}
                    />
                    <button
                      type="submit"
                      disabled={!newMessage.trim()}
                      className="bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white p-2 rounded-xl transition cursor-pointer shadow-sm flex items-center justify-center"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </form>
                </>
              ) : (
                <div className="flex-1 hidden md:flex flex-col items-center justify-center p-4 text-center">
                  <Inbox className={`w-10 h-10 mb-2 ${isLightMode ? 'text-slate-400' : 'text-zinc-600'}`} />
                  <p className={`text-xs font-semibold ${isLightMode ? 'text-slate-500' : 'text-zinc-400'}`}>Sélectionnez une discussion.</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className={`border rounded-2xl p-3 sm:p-5 flex-1 shadow-sm ${isLightMode ? 'bg-white border-slate-200' : 'bg-zinc-900 border-zinc-800'}`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h2 className={`text-sm sm:text-base font-bold ${isLightMode ? 'text-slate-900' : 'text-zinc-100'}`}>Ajouter des amis</h2>
                <p className={`text-[11px] mt-0.5 font-medium ${isLightMode ? 'text-slate-600' : 'text-zinc-300'}`}>
                  Amis en contact : <span className="font-bold text-orange-600 dark:text-orange-500">{acceptedContacts.length}</span>
                </p>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${isLightMode ? 'text-slate-400' : 'text-zinc-400'}`} />
                <input
                  type="text"
                  placeholder="Rechercher des membres..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full text-xs pl-9 pr-3 py-2 rounded-xl border outline-none transition ${
                    isLightMode ? 'bg-slate-50 border-slate-300 text-slate-900 focus:border-orange-600' : 'bg-zinc-950 border-zinc-700 text-zinc-100 focus:border-orange-500'
                  }`}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {availableUsers
                .filter(user => user.name?.toLowerCase().includes(searchQuery.toLowerCase()) || user.email?.toLowerCase().includes(searchQuery.toLowerCase()))
                .map((user) => {
                  const isContact = acceptedContacts.some(c => c.id === user.id);
                  const isPending = pendingRequests.includes(user.id) || user.contactStatus === 'PENDING';
                  const avatarUrl = getAvatarUrl(user.avatar);
                  return (
                    <div key={user.id} className={`p-2.5 border rounded-xl flex items-center justify-between gap-2.5 ${isLightMode ? 'border-slate-200 bg-slate-50' : 'border-zinc-800 bg-zinc-950'}`}>
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-500 flex items-center justify-center font-bold text-[11px] flex-shrink-0 overflow-hidden relative">
                          {avatarUrl ? (
                            <img 
                              src={avatarUrl} 
                              alt={user.name} 
                              className="w-full h-full object-cover bg-white dark:bg-zinc-900" 
                              onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }} 
                            />
                          ) : (
                            user.name ? user.name.charAt(0).toUpperCase() : <UserIcon className="w-3 h-3" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className={`text-xs font-bold truncate ${isLightMode ? 'text-slate-900' : 'text-zinc-100'}`}>{user.name}</p>
                          <p className={`text-[10px] truncate mt-0.5 ${isLightMode ? 'text-slate-500' : 'text-zinc-400'}`}>{user.email}</p>
                        </div>
                      </div>
                      
                      {isContact ? (
                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg">Amis</span>
                      ) : isPending ? (
                        <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-lg">En attente</span>
                      ) : (
                        <button
                          onClick={() => handleSendContactRequest(user.id)}
                          className="bg-orange-600 hover:bg-orange-500 text-white p-2 rounded-lg transition cursor-pointer shadow-sm flex items-center justify-center"
                          title="Ajouter comme ami"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </main>

      {/* Barre de navigation inférieure mobile compacte */}
      <nav className={`fixed bottom-0 left-0 right-0 border-t py-2 px-4 z-50 flex items-center justify-around transition-colors duration-200 ${
        isLightMode ? 'border-slate-200 bg-white shadow-xl' : 'border-zinc-800 bg-zinc-900 shadow-xl shadow-black/80'
      }`}>
        <button
          onClick={() => { setActiveBottomTab('chats'); setShowMobileChat(false); }}
          className={`flex flex-col items-center gap-1 p-1.5 rounded-xl transition ${
            activeBottomTab === 'chats' 
              ? 'text-orange-600 dark:text-orange-500 font-bold' 
              : isLightMode ? 'text-slate-500 hover:text-slate-800' : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <MessageCircle className="w-4 h-4" />
          <span className="text-[10px]">Discussions</span>
        </button>

        <button
          onClick={() => { setActiveBottomTab('people'); setShowMobileChat(false); }}
          className={`flex flex-col items-center gap-1 p-1.5 rounded-xl transition ${
            activeBottomTab === 'people' 
              ? 'text-orange-600 dark:text-orange-500 font-bold' 
              : isLightMode ? 'text-slate-500 hover:text-slate-800' : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <UserPlus className="w-4 h-4" />
          <span className="text-[10px]">Ajouter</span>
        </button>
      </nav>
    </div>
  );
}