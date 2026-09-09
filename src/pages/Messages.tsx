import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageCircle, 
  Send, 
  Search, 
  UserPlus, 
  Check, 
  CheckCheck, 
  Sun, 
  Moon, 
  ArrowLeft, 
  MoreVertical, 
  ShieldAlert,
  Users,
  Clock,
  X
} from 'lucide-react';

interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role?: string;
}

interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  createdAt: string;
  read?: boolean;
}

interface ContactRequest {
  id: string;
  senderId: string;
  receiverId: string;
  status: 'pending' | 'accepted' | 'rejected';
  sender?: User;
  receiver?: User;
}

export default function MessagingPage() {
  // États de l'utilisateur connecté
  const [currentUserId] = useState<string>(() => localStorage.getItem('userId') || 'user-1');
  const [userName] = useState<string>(() => localStorage.getItem('userName') || 'Utilisateur');
  
  // États d'interface
  const [isLightMode, setIsLightMode] = useState<boolean>(false);
  const [activeBottomTab, setActiveBottomTab] = useState<'chats' | 'people' | 'requests'>('chats');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Données de l'application
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [acceptedContacts, setAcceptedContacts] = useState<User[]>([]);
  const [pendingRequests, setPendingRequests] = useState<ContactRequest[]>([]);
  const [selectedContact, setSelectedContact] = useState<User | null>(null);
  
  // Messages et saisie
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fonction utilitaire pour normaliser les URL des avatars
  const getAvatarUrl = (path?: string) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    return `http://localhost:5000/${path.replace(/^\/+/, '')}`;
  };

  // Chargement initial des données et synchronisation (Polling global)
  useEffect(() => {
    const fetchAppData = async () => {
      try {
        // Exemple d'appels API réels à adapter selon ton backend :
        /*
        const [usersRes, contactsRes, requestsRes] = await Promise.all([
          fetch('/api/users'),
          fetch('/api/contacts/accepted'),
          fetch('/api/contacts/requests')
        ]);
        if (usersRes.ok) setAvailableUsers(await usersRes.json());
        if (contactsRes.ok) setAcceptedContacts(await contactsRes.json());
        if (requestsRes.ok) setPendingRequests(await requestsRes.json());
        */
      } catch (err) {
        console.error("Erreur lors du chargement des données", err);
      }
    };

    fetchAppData();
    const interval = setInterval(fetchAppData, 5000);
    return () => clearInterval(interval);
  }, []);

  // Gestion du polling pour les messages du contact actif
  useEffect(() => {
    if (!selectedContact) return;

    const fetchMessages = async () => {
      try {
        // const res = await fetch(`/api/messages/${selectedContact.id}`);
        // if (res.ok) {
        //   const data = await res.json();
        //   setMessages(data);
        // }
      } catch (err) {
        console.error("Erreur de synchronisation des messages", err);
      }
    };

    fetchMessages();
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, [selectedContact]);

  // Scroll automatique vers le bas lors d'un nouveau message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Envoyer un message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedContact) return;

    const messagePayload = {
      id: Date.now().toString(),
      senderId: currentUserId,
      receiverId: selectedContact.id,
      content: newMessage.trim(),
      createdAt: new Date().toISOString(),
    };

    // Mise à jour optimiste de l'UI
    setMessages((prev) => [...prev, messagePayload]);
    setNewMessage('');

    try {
      /*
      await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(messagePayload)
      });
      */
    } catch (err) {
      console.error("Erreur d'envoi du message", err);
    }
  };

  // Envoyer une demande de contact
  const handleSendContactRequest = async (userId: string) => {
    try {
      /*
      const res = await fetch('/api/contacts/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiverId: userId })
      });
      if (res.ok) {
        alert("Demande de contact envoyée avec succès !");
      }
      */
     alert("Demande de contact envoyée avec succès !");
    } catch (err) {
      console.error("Erreur lors de l'envoi de la demande", err);
    }
  };

  // Répondre à une demande de contact (Accepter / Rejeter)
  const handleRespondToRequest = async (requestId: string, status: 'accepted' | 'rejected') => {
    try {
      /*
      await fetch(`/api/contacts/request/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      */
      // Mise à jour locale pour un retour immédiat
      setPendingRequests(prev => prev.filter(req => req.id !== requestId));
    } catch (err) {
      console.error("Erreur lors de la mise à jour de la requête", err);
    }
  };

  // Filtrage des éléments selon la barre de recherche
  const filteredChats = acceptedContacts.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredUsers = availableUsers.filter(u => u.name.toLowerCase().includes(searchQuery.toLowerCase()) || u.email.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className={`flex h-screen w-screen overflow-hidden font-sans transition-colors duration-300 ${
      isLightMode ? 'bg-slate-100 text-slate-800' : 'bg-zinc-950 text-zinc-100'
    }`}>
      
      {/* SIDEBAR DES DISCUSSIONS */}
      <aside className={`w-full md:w-85 lg:w-96 flex flex-col border-r transition-all duration-300 ${
        isLightMode ? 'bg-white border-slate-200' : 'bg-zinc-900 border-zinc-800'
      } ${selectedContact ? 'hidden md:flex' : 'flex'}`}>
        
        {/* En-tête de la Sidebar */}
        <div className={`p-4 border-b flex items-center justify-between ${
          isLightMode ? 'border-slate-200' : 'border-zinc-800'
        }`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-orange-600 text-white font-bold flex items-center justify-center shadow-md">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-sm font-bold truncate">{userName}</h2>
              <span className="text-[10px] text-emerald-500 font-medium flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> En ligne
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsLightMode(!isLightMode)}
              className={`p-2 rounded-xl transition cursor-pointer ${
                isLightMode ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
              }`}
              title="Changer le thème"
            >
              {isLightMode ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Barre de recherche et Onglets de navigation */}
        <div className="p-4 space-y-3">
          <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition ${
            isLightMode ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-zinc-950 border-zinc-800 text-zinc-200'
          }`}>
            <Search className="w-4 h-4 text-zinc-400 flex-shrink-0" />
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent text-xs focus:outline-none"
            />
          </div>

          <div className="flex gap-1.5">
            <button
              onClick={() => setActiveBottomTab('chats')}
              className={`flex-1 py-2 text-[11px] font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 ${
                activeBottomTab === 'chats'
                  ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/20'
                  : isLightMode ? 'bg-slate-200 text-slate-600' : 'bg-zinc-800 text-zinc-400'
              }`}
            >
              <MessageCircle className="w-3.5 h-3.5" /> Discussions
            </button>
            <button
              onClick={() => setActiveBottomTab('people')}
              className={`flex-1 py-2 text-[11px] font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 ${
                activeBottomTab === 'people'
                  ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/20'
                  : isLightMode ? 'bg-slate-200 text-slate-600' : 'bg-zinc-800 text-zinc-400'
              }`}
            >
              <Users className="w-3.5 h-3.5" /> Annuaire
            </button>
            <button
              onClick={() => setActiveBottomTab('requests')}
              className={`flex-1 py-2 text-[11px] font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 relative ${
                activeBottomTab === 'requests'
                  ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/20'
                  : isLightMode ? 'bg-slate-200 text-slate-600' : 'bg-zinc-800 text-zinc-400'
              }`}
            >
              <Clock className="w-3.5 h-3.5" /> Requêtes
              {pendingRequests.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                  {pendingRequests.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Liste dynamique selon l'onglet actif */}
        <div className="flex-1 overflow-y-auto px-4 pb-20 md:pb-4 space-y-2">
          {activeBottomTab === 'chats' ? (
            filteredChats.length === 0 ? (
              <div className="text-center py-12 text-zinc-500 text-xs">
                Aucune discussion active. Explorez l'annuaire pour ajouter des contacts.
              </div>
            ) : (
              filteredChats.map((contact) => {
                const avatarUrl = getAvatarUrl(contact.avatar);
                return (
                  <div
                    key={contact.id}
                    onClick={() => setSelectedContact(contact)}
                    className={`flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition ${
                      selectedContact?.id === contact.id
                        ? 'bg-orange-600/10 border border-orange-500/30'
                        : isLightMode ? 'hover:bg-slate-50' : 'hover:bg-zinc-800/50'
                    }`}
                  >
                    <div className="w-11 h-11 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-500 flex items-center justify-center font-bold text-sm flex-shrink-0 overflow-hidden relative">
                      {avatarUrl ? (
                        <img src={avatarUrl} alt={contact.name} className="w-full h-full object-cover" />
                      ) : (
                        <span>{contact.name?.charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className={`text-xs font-bold truncate ${isLightMode ? 'text-slate-900' : 'text-zinc-100'}`}>
                          {contact.name}
                        </h4>
                        <span className="text-[10px] text-zinc-400">En ligne</span>
                      </div>
                      <p className="text-[11px] text-zinc-400 truncate mt-0.5">Cliquez pour voir les messages...</p>
                    </div>
                  </div>
                );
              })
            )
          ) : activeBottomTab === 'people' ? (
            // Onglet Annuaire / Utilisateurs disponibles
            filteredUsers.map((user) => {
              const avatarUrl = getAvatarUrl(user.avatar);
              const isContact = acceptedContacts.some(c => c.id === user.id);
              const isPending = pendingRequests.some(r => r.receiverId === user.id || r.senderId === user.id);

              return (
                <div
                  key={user.id}
                  className={`flex items-center justify-between p-3 rounded-2xl border transition ${
                    isLightMode ? 'bg-white border-slate-200' : 'bg-zinc-900 border-zinc-800'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-500 flex items-center justify-center font-bold text-xs flex-shrink-0 overflow-hidden relative">
                      {avatarUrl ? (
                        <img src={avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                      ) : (
                        <span>{user.name?.charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className={`text-xs font-bold truncate ${isLightMode ? 'text-slate-900' : 'text-zinc-100'}`}>{user.name}</p>
                      <p className="text-[10px] text-zinc-400 truncate">{user.email}</p>
                    </div>
                  </div>

                  {isContact ? (
                    <span className="text-[10px] text-emerald-500 font-bold px-2 py-1 bg-emerald-500/10 rounded-lg">Connecté</span>
                  ) : isPending ? (
                    <span className="text-[10px] text-amber-500 font-bold px-2 py-1 bg-amber-500/10 rounded-lg">En attente</span>
                  ) : (
                    <button
                      onClick={() => handleSendContactRequest(user.id)}
                      className="p-2 rounded-lg bg-orange-600 hover:bg-orange-500 text-white transition cursor-pointer"
                      title="Ajouter"
                    >
                      <UserPlus className="w-4 h-4" />
                    </button>
                  )}
                </div>
              );
            })
          ) : (
            // Onglet Demandes de contact en attente
            pendingRequests.length === 0 ? (
              <div className="text-center py-12 text-zinc-500 text-xs">
                Aucune demande de contact en attente.
              </div>
            ) : (
              pendingRequests.map((req) => {
                const sender = req.sender || { name: 'Utilisateur', email: '', avatar: undefined };
                const avatarUrl = getAvatarUrl(sender.avatar);
                return (
                  <div
                    key={req.id}
                    className={`flex items-center justify-between p-3 rounded-2xl border transition ${
                      isLightMode ? 'bg-white border-slate-200' : 'bg-zinc-900 border-zinc-800'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-500 flex items-center justify-center font-bold text-xs flex-shrink-0 overflow-hidden relative">
                        {avatarUrl ? (
                          <img src={avatarUrl} alt={sender.name} className="w-full h-full object-cover" />
                        ) : (
                          <span>{sender.name?.charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className={`text-xs font-bold truncate ${isLightMode ? 'text-slate-900' : 'text-zinc-100'}`}>{sender.name}</p>
                        <p className="text-[10px] text-zinc-400 truncate">Souhaite vous ajouter</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleRespondToRequest(req.id, 'accepted')}
                        className="p-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition cursor-pointer"
                        title="Accepter"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleRespondToRequest(req.id, 'rejected')}
                        className="p-2 rounded-lg bg-red-600 hover:bg-red-500 text-white transition cursor-pointer"
                        title="Rejeter"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )
          )}
        </div>
      </aside>

      {/* ZONE DE DISCUSSION ACTIVE */}
      <main className={`flex-1 flex flex-col h-full ${!selectedContact ? 'hidden md:flex' : 'flex'}`}>
        {selectedContact ? (
          <>
            {/* Header du chat actif */}
            <div className={`p-4 border-b flex items-center justify-between backdrop-blur-md ${
              isLightMode ? 'bg-white/80 border-slate-200' : 'bg-zinc-900/80 border-zinc-800'
            }`}>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSelectedContact(null)}
                  className="md:hidden p-2 rounded-xl bg-orange-600/10 text-orange-500"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="w-10 h-10 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-500 flex items-center justify-center font-bold text-sm overflow-hidden relative">
                  {selectedContact.avatar ? (
                    <img src={getAvatarUrl(selectedContact.avatar)!} alt={selectedContact.name} className="w-full h-full object-cover" />
                  ) : (
                    <span>{selectedContact.name.charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <div>
                  <h3 className={`text-sm font-bold ${isLightMode ? 'text-slate-900' : 'text-zinc-100'}`}>
                    {selectedContact.name}
                  </h3>
                  <span className="text-[10px] text-emerald-500 font-medium">En ligne</span>
                </div>
              </div>
            </div>

            {/* Corps des messages */}
            <div className={`flex-1 overflow-y-auto p-4 space-y-4 ${
              isLightMode ? 'bg-slate-50' : 'bg-zinc-950'
            }`}>
              {messages.map((msg) => {
                const isMe = msg.senderId === currentUserId;
                return (
                  <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] md:max-w-[60%] rounded-2xl px-4 py-3 shadow-sm ${
                      isMe 
                        ? 'bg-orange-600 text-white rounded-br-none' 
                        : isLightMode ? 'bg-white text-slate-800 rounded-bl-none border border-slate-200' : 'bg-zinc-900 text-zinc-100 rounded-bl-none border border-zinc-800'
                    }`}>
                      <p className="text-xs leading-relaxed">{msg.content}</p>
                      <div className={`flex items-center justify-end gap-1 mt-1 text-[9px] ${isMe ? 'text-orange-200' : 'text-zinc-400'}`}>
                        <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        {isMe && <CheckCheck className="w-3 h-3" />}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Barre de saisie de message */}
            <form onSubmit={handleSendMessage} className={`p-4 border-t flex items-center gap-3 ${
              isLightMode ? 'bg-white border-slate-200' : 'bg-zinc-900 border-zinc-800'
            }`}>
              <input
                type="text"
                placeholder="Écrivez votre message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className={`flex-1 px-4 py-3 rounded-2xl border text-xs focus:outline-none transition ${
                  isLightMode 
                    ? 'bg-slate-100 border-slate-200 text-slate-800 focus:border-orange-500' 
                    : 'bg-zinc-950 border-zinc-800 text-zinc-100 focus:border-orange-500'
                }`}
              />
              <button
                type="submit"
                disabled={!newMessage.trim()}
                className="p-3 rounded-2xl bg-orange-600 hover:bg-orange-500 text-white transition disabled:opacity-50 cursor-pointer shadow-lg shadow-orange-600/20"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-zinc-500">
            <div className="w-16 h-16 rounded-3xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-500 mb-4 shadow-xl">
              <MessageCircle className="w-8 h-8" />
            </div>
            <h3 className="text-sm font-bold text-zinc-300">Vos discussions</h3>
            <p className="text-xs text-zinc-500 max-w-xs mt-1">Sélectionnez une conversation dans la liste de gauche ou trouvez un nouveau contact pour commencer à discuter.</p>
          </div>
        )}
      </main>

      {/* Barre de navigation mobile inférieure */}
      <nav className={`md:hidden fixed bottom-0 left-0 right-0 border-t flex items-center justify-around p-2 z-50 backdrop-blur-md ${
        isLightMode ? 'bg-white/90 border-slate-200' : 'bg-zinc-900/90 border-zinc-800'
      }`}>
        <button
          onClick={() => setActiveBottomTab('chats')}
          className={`flex flex-col items-center gap-1 p-2 rounded-xl transition ${
            activeBottomTab === 'chats' ? 'text-orange-500 font-bold' : isLightMode ? 'text-slate-500' : 'text-zinc-400'
          }`}
        >
          <MessageCircle className="w-5 h-5" />
          <span className="text-[10px]">Discussions</span>
        </button>
        <button
          onClick={() => setActiveBottomTab('people')}
          className={`flex flex-col items-center gap-1 p-2 rounded-xl transition ${
            activeBottomTab === 'people' ? 'text-orange-500 font-bold' : isLightMode ? 'text-slate-500' : 'text-zinc-400'
          }`}
        >
          <Users className="w-5 h-5" />
          <span className="text-[10px]">Annuaire</span>
        </button>
        <button
          onClick={() => setActiveBottomTab('requests')}
          className={`flex flex-col items-center gap-1 p-2 rounded-xl transition relative ${
            activeBottomTab === 'requests' ? 'text-orange-500 font-bold' : isLightMode ? 'text-slate-500' : 'text-zinc-400'
          }`}
        >
          <Clock className="w-5 h-5" />
          <span className="text-[10px]">Requêtes</span>
          {pendingRequests.length > 0 && (
            <span className="absolute top-1 right-2 bg-red-500 text-white text-[9px] w-3.5 h-3.5 rounded-full flex items-center justify-center font-bold">
              {pendingRequests.length}
            </span>
          )}
        </button>
      </nav>
    </div>
  );
}