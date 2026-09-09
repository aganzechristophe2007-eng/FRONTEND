import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useNavigate } from 'react-router-dom';
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
  Users,
  Clock,
  X,
  Phone,
  Video,
  Image as ImageIcon,
  Home
} from 'lucide-react';

// URL de votre backend (ajustez si nécessaire)
const SOCKET_URL = 'http://localhost:5000';

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
  const navigate = useNavigate();

  // États de l'utilisateur connecté
  const [currentUserId] = useState<string>(() => localStorage.getItem('userId') || 'user-1');
  const [userName] = useState<string>(() => localStorage.getItem('userName') || 'Utilisateur');
  const [token] = useState<string>(() => localStorage.getItem('token') || '');
  
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
  const [uploading, setUploading] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // États pour les appels WebRTC
  const [inCall, setInCall] = useState<boolean>(false);
  const [isVideoCall, setIsVideoCall] = useState<boolean>(false);
  const [incomingCallData, setIncomingCallData] = useState<any>(null);

  // Références Socket & WebRTC
  const socketRef = useRef<Socket | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Configuration des serveurs STUN publics (Google) pour WebRTC
  const rtcConfig = {
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
  };

  // Fonction utilitaire pour normaliser les URL des avatars ou médias
  const getAvatarUrl = (path?: string) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    return `${SOCKET_URL}/${path.replace(/^\/+/, '')}`;
  };

  // 1. Initialisation de Socket.io et écoute des événements temps réel
  useEffect(() => {
    const socket = io(SOCKET_URL);
    socketRef.current = socket;

    socket.emit('register', currentUserId);

    // Écoute des appels entrants
    socket.on('incoming-call', async ({ from, offer, isVideo }) => {
      setIncomingCallData({ from, offer, isVideo });
    });

    socket.on('call-answered', async ({ answer }) => {
      if (peerConnectionRef.current) {
        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answer));
      }
    });

    socket.on('ice-candidate', async ({ candidate }) => {
      if (peerConnectionRef.current && candidate) {
        try {
          await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.error("Erreur ajout ICE candidate", e);
        }
      }
    });

    socket.on('call-ended', () => {
      stopCallCleanup();
    });

    return () => {
      socket.disconnect();
    };
  }, [currentUserId]);

  // Chargement initial des données et synchronisation (Polling global)
  useEffect(() => {
    const fetchAppData = async () => {
      try {
        const [usersRes, contactsRes, requestsRes] = await Promise.all([
          fetch(`${SOCKET_URL}/api/users/available`),
          fetch(`${SOCKET_URL}/api/contacts/accepted?userId=${currentUserId}`),
          fetch(`${SOCKET_URL}/api/contacts/requests?userId=${currentUserId}`)
        ]);

        if (usersRes.ok) setAvailableUsers(await usersRes.json());
        if (contactsRes.ok) setAcceptedContacts(await contactsRes.json());
        if (requestsRes.ok) setPendingRequests(await requestsRes.json());
      } catch (err) {
        console.error("Erreur lors du chargement des données", err);
      }
    };

    fetchAppData();
    const interval = setInterval(fetchAppData, 5000);
    return () => clearInterval(interval);
  }, [currentUserId]);

  // Gestion du polling pour les messages du contact actif
  useEffect(() => {
    if (!selectedContact) return;

    const fetchMessages = async () => {
      try {
        const res = await fetch(`${SOCKET_URL}/api/messages/${currentUserId}/${selectedContact.id}`);
        if (res.ok) {
          const data = await res.json();
          setMessages(data);
        }
      } catch (err) {
        console.error("Erreur de synchronisation des messages", err);
      }
    };

    fetchMessages();
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, [selectedContact, currentUserId]);

  // Scroll automatique vers le bas lors d'un nouveau message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Envoyer un message texte
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedContact) return;

    const messagePayload = {
      senderId: currentUserId,
      receiverId: selectedContact.id,
      content: newMessage.trim(),
    };

    try {
      const res = await fetch(`${SOCKET_URL}/api/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(messagePayload)
      });

      if (res.ok) {
        const savedMessage = await res.json();
        setMessages((prev) => [...prev, savedMessage]);
        setNewMessage('');
      }
    } catch (err) {
      console.error("Erreur d'envoi du message", err);
    }
  };

  // Envoyer un fichier média (Image, Vidéo, Audio)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedContact) return;

    const formData = new FormData();
    formData.append('media', file);
    formData.append('receiverId', selectedContact.id);

    setUploading(true);
    try {
      const res = await fetch(`${SOCKET_URL}/api/messages/media`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        setMessages((prev) => [...prev, data.data]);
      }
    } catch (err) {
      console.error("Erreur envoi média", err);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // --- LOGIQUE WEBRTC : Démarrer un appel sortant ---
  const startCall = async (isVideo: boolean) => {
    if (!selectedContact) return;
    setIsVideoCall(isVideo);
    setInCall(true);

    const pc = new RTCPeerConnection(rtcConfig);
    peerConnectionRef.current = pc;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: isVideo, audio: true });
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      pc.ontrack = (event) => {
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = event.streams[0];
      };

      pc.onicecandidate = (event) => {
        if (event.candidate && socketRef.current) {
          socketRef.current.emit('ice-candidate', { to: selectedContact.id, candidate: event.candidate });
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socketRef.current?.emit('call-user', {
        to: selectedContact.id,
        from: currentUserId,
        offer,
        isVideo
      });
    } catch (err) {
      console.error("Erreur accès médias (caméra/micro)", err);
      stopCallCleanup();
    }
  };

  // --- LOGIQUE WEBRTC : Accepter un appel entrant ---
  const acceptCall = async () => {
    if (!incomingCallData) return;
    const { from, offer, isVideo } = incomingCallData;
    setIsVideoCall(isVideo);
    setInCall(true);
    setIncomingCallData(null);

    const pc = new RTCPeerConnection(rtcConfig);
    peerConnectionRef.current = pc;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: isVideo, audio: true });
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      pc.ontrack = (event) => {
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = event.streams[0];
      };

      pc.onicecandidate = (event) => {
        if (event.candidate && socketRef.current) {
          socketRef.current.emit('ice-candidate', { to: from, candidate: event.candidate });
        }
      };

      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socketRef.current?.emit('make-answer', { to: from, answer });
    } catch (err) {
      console.error("Erreur acceptation appel", err);
      stopCallCleanup();
    }
  };

  const stopCallCleanup = () => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    setInCall(false);
    setIncomingCallData(null);
  };

  const endCall = () => {
    if (selectedContact && socketRef.current) {
      socketRef.current.emit('end-call', { to: selectedContact.id });
    }
    stopCallCleanup();
  };

  // Envoyer une demande de contact
  const handleSendContactRequest = async (userId: string) => {
    try {
      const res = await fetch(`${SOCKET_URL}/api/contacts/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ senderId: currentUserId, receiverId: userId })
      });
      if (res.ok) {
        alert("Demande de contact envoyée avec succès !");
        const reqRes = await fetch(`${SOCKET_URL}/api/contacts/requests?userId=${currentUserId}`);
        if (reqRes.ok) setPendingRequests(await reqRes.json());
      }
    } catch (err) {
      console.error("Erreur lors de l'envoi de la demande", err);
    }
  };

  // Répondre à une demande de contact (Accepter / Rejeter)
  const handleRespondToRequest = async (requestId: string, status: 'accepted' | 'rejected') => {
    try {
      const res = await fetch(`${SOCKET_URL}/api/contacts/request/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      
      if (res.ok) {
        setPendingRequests(prev => prev.filter(req => req.id !== requestId));
        const contactsRes = await fetch(`${SOCKET_URL}/api/contacts/accepted?userId=${currentUserId}`);
        if (contactsRes.ok) setAcceptedContacts(await contactsRes.json());
      }
    } catch (err) {
      console.error("Erreur lors de la mise à jour de la requête", err);
    }
  };

  // Filtrage des éléments selon la barre de recherche (on exclut l'utilisateur lui-même de l'onglet Ajout de membres)
  const filteredChats = acceptedContacts.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredUsers = availableUsers.filter(u => 
    u.id !== currentUserId && 
    (u.name.toLowerCase().includes(searchQuery.toLowerCase()) || u.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

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

          <div className="grid grid-cols-4 gap-1">
            <button
              onClick={() => setActiveBottomTab('chats')}
              className={`py-2 text-[10px] font-bold rounded-xl transition cursor-pointer flex flex-col items-center justify-center gap-1 ${
                activeBottomTab === 'chats'
                  ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/20'
                  : isLightMode ? 'bg-slate-200 text-slate-600' : 'bg-zinc-800 text-zinc-400'
              }`}
            >
              <MessageCircle className="w-3.5 h-3.5" /> Discussions
            </button>
            <button
              onClick={() => setActiveBottomTab('people')}
              className={`py-2 text-[10px] font-bold rounded-xl transition cursor-pointer flex flex-col items-center justify-center gap-1 ${
                activeBottomTab === 'people'
                  ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/20'
                  : isLightMode ? 'bg-slate-200 text-slate-600' : 'bg-zinc-800 text-zinc-400'
              }`}
            >
              <Users className="w-3.5 h-3.5" /> Ajout membres
            </button>
            <button
              onClick={() => setActiveBottomTab('requests')}
              className={`py-2 text-[10px] font-bold rounded-xl transition cursor-pointer flex flex-col items-center justify-center gap-1 relative ${
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
            <button
              onClick={() => navigate('/')}
              className={`py-2 text-[10px] font-bold rounded-xl transition cursor-pointer flex flex-col items-center justify-center gap-1 ${
                isLightMode ? 'bg-slate-200 hover:bg-slate-300 text-slate-700' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
              }`}
              title="Retour à l'accueil"
            >
              <Home className="w-3.5 h-3.5" /> Accueil
            </button>
          </div>
        </div>

        {/* Liste dynamique selon l'onglet actif */}
        <div className="flex-1 overflow-y-auto px-4 pb-20 md:pb-4 space-y-2">
          {activeBottomTab === 'chats' ? (
            filteredChats.length === 0 ? (
              <div className="text-center py-12 text-zinc-500 text-xs">
                Aucune discussion active. Explorez l'onglet "Ajout membres" pour ajouter des contacts.
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
      <main className={`flex-1 flex flex-col h-full relative ${!selectedContact ? 'hidden md:flex' : 'flex'}`}>
        
        {/* MODALE D'APPEL EN COURS */}
        {inCall && (
          <div className="absolute inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-4">
            <div className="relative w-full max-w-4xl h-[70vh] bg-zinc-900 rounded-3xl overflow-hidden flex items-center justify-center border border-zinc-800">
              <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
              {isVideoCall && (
                <video ref={localVideoRef} autoPlay playsInline muted className="absolute bottom-4 right-4 w-44 h-32 object-cover rounded-2xl border-2 border-orange-500 shadow-xl" />
              )}
            </div>
            <button onClick={endCall} className="mt-6 px-8 py-3 bg-red-600 hover:bg-red-500 font-bold rounded-2xl transition cursor-pointer text-white">
              Raccrocher
            </button>
          </div>
        )}

        {/* POPUP D'APPEL ENTRANT */}
        {incomingCallData && !inCall && (
          <div className="absolute inset-0 z-50 bg-black/80 flex flex-col items-center justify-center p-4">
            <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl text-center shadow-2xl">
              <h3 className="text-xl font-bold mb-4 text-white">📞 Appel entrant...</h3>
              <div className="flex gap-4 justify-center">
                <button onClick={acceptCall} className="px-6 py-3 bg-green-600 hover:bg-green-500 rounded-2xl font-bold transition text-white">Accepter</button>
                <button onClick={() => setIncomingCallData(null)} className="px-6 py-3 bg-red-600 hover:bg-red-500 rounded-2xl font-bold transition text-white">Refuser</button>
              </div>
            </div>
          </div>
        )}

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

              {/* BOUTONS D'APPEL AUDIO & VIDÉO */}
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => startCall(false)} 
                  className="p-2.5 bg-zinc-800/80 hover:bg-orange-500/20 text-orange-400 rounded-xl transition cursor-pointer"
                  title="Appel audio"
                >
                  <Phone className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => startCall(true)} 
                  className="p-2.5 bg-zinc-800/80 hover:bg-orange-500/20 text-orange-400 rounded-xl transition cursor-pointer"
                  title="Appel vidéo"
                >
                  <Video className="w-4 h-4" />
                </button>
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

            {/* Barre de saisie de message et médias */}
            <form onSubmit={handleSendMessage} className={`p-4 border-t flex items-center gap-3 ${
              isLightMode ? 'bg-white border-slate-200' : 'bg-zinc-900 border-zinc-800'
            }`}>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
                accept="image/*,video/*,audio/*" 
                className="hidden" 
              />
              
              <button 
                type="button" 
                onClick={() => fileInputRef.current?.click()} 
                disabled={uploading}
                className="p-2.5 text-zinc-400 hover:text-orange-500 transition cursor-pointer"
                title="Envoyer une photo, vidéo ou audio"
              >
                <ImageIcon className="w-5 h-5" />
              </button>

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
                disabled={!newMessage.trim() || uploading}
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
            <p className="text-xs text-zinc-500 max-w-xs mt-1">Sélectionnez une conversation dans la liste de gauche ou trouvez un nouveau membre pour commencer à discuter.</p>
          </div>
        )}
      </main>
    </div>
  );
}