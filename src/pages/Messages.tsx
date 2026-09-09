import React, { useState, useRef, useEffect } from 'react';
import { 
  MessageCircle, 
  Send, 
  UserPlus, 
  ShieldCheck, 
  Search, 
  CheckCircle2, 
  Phone,
  Video,
  MoreVertical,
  Image as ImageIcon,
  Video as VideoIcon,
  Mic,
  PhoneOff,
  Radio,
  Sparkles,
  Home,
  Paperclip,
  Smile,
  PhoneCall
} from 'lucide-react';
import { io, Socket } from 'socket.io-client';

interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  text?: string;
  type?: 'text' | 'image' | 'video' | 'audio' | 'file';
  mediaUrl?: string;
  createdAt: string;
  timestamp?: string;
}

interface Conversation {
  id: string;
  name: string;
  avatar?: string;
  isOnline?: boolean;
  unreadCount?: number;
  lastMessage?: string;
  type: 'friend' | 'support' | 'group';
  isAdmin?: boolean;
  isVerified?: boolean;
}

interface MessageProps {
  onBackToHome?: () => void;
}

const EMOJI_LIST = ['😀', '😂', '😍', '👍', '🔥', '🎉', '❤️', '🙌', '😎', '😢', '🙏', '✨', '🚀', '💡', '💻', '☕'];

export function Message({ onBackToHome }: MessageProps) {
  const [activeTab, setActiveTab] = useState<'all' | 'friends' | 'support' | 'calls'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [isAddFriendOpen, setIsAddFriendOpen] = useState(false);
  const [friendIdentifier, setFriendIdentifier] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // --- ÉTATS RÉELS POUR LES APPELS & AUDIO ---
  const [activeCall, setActiveCall] = useState<'audio' | 'video' | null>(null);
  const [isCallMuted, setIsCallMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const socketRef = useRef<Socket | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const genericFileInputRef = useRef<HTMLInputElement>(null);

  const getAuthHeaders = () => ({
    'Authorization': `Bearer ${localStorage.getItem('token')}`,
    'Content-Type': 'application/json'
  });

  // --- INITIALISATION SOCKET.IO & WEBRTC LISTENERS ---
  useEffect(() => {
    const token = localStorage.getItem('token');
    const currentUserId = localStorage.getItem('userId'); 
    if (!token) return;

    const socket = io('http://localhost:5000');
    socketRef.current = socket;

    if (currentUserId) {
      socket.emit('register', currentUserId);
    }

    socket.on('incoming-call', async (data) => {
      setActiveCall(data.isVideo ? 'video' : 'audio');

      const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
      peerConnectionRef.current = pc;

      pc.ontrack = (event) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('ice-candidate', { to: data.from, candidate: event.candidate });
        }
      };

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: data.isVideo, audio: true });
        localStreamRef.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
        stream.getTracks().forEach(track => pc.addTrack(track, stream));

        await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socket.emit('make-answer', { to: data.from, answer });
      } catch (err) {
        console.error("Erreur acceptation appel entrant :", err);
      }
    });

    socket.on('call-answered', async (data) => {
      if (peerConnectionRef.current) {
        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.answer));
      }
    });

    socket.on('ice-candidate', async (data) => {
      if (peerConnectionRef.current && data.candidate) {
        await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
      }
    });

    socket.on('call-ended', () => {
      cleanupCall();
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const fetchConversations = async () => {
    try {
      setLoadingConversations(true);
      const res = await fetch('/api/messages/conversations', { headers: getAuthHeaders() });
      const data = await res.json();
      if (data.success) setConversations(data.conversations);
    } catch (err) {
      console.error('Erreur chargement conversations:', err);
    } finally {
      setLoadingConversations(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    if (!selectedConversation) return;
    const fetchMessages = async () => {
      try {
        setLoadingMessages(true);
        const targetId = selectedConversation.type === 'support' 
          ? selectedConversation.id.replace('support-', '') 
          : selectedConversation.id;

        const res = await fetch(`/api/messages/${targetId}`, { headers: getAuthHeaders() });
        const data = await res.json();
        if (data.success) {
          setMessages(prev => ({
            ...prev,
            [selectedConversation.id]: data.data.map((m: any) => ({
              ...m,
              timestamp: new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }))
          }));
        }
      } catch (err) {
        console.error('Erreur messages:', err);
      } finally {
        setLoadingMessages(false);
      }
    };
    fetchMessages();
  }, [selectedConversation]);

  const startCall = async (type: 'audio' | 'video') => {
    setActiveCall(type);
    if (!selectedConversation || !socketRef.current) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: type === 'video', audio: true });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
      peerConnectionRef.current = pc;

      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      pc.ontrack = (event) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      };

      pc.onicecandidate = (event) => {
        if (event.candidate && socketRef.current) {
          socketRef.current.emit('ice-candidate', { to: selectedConversation.id, candidate: event.candidate });
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const currentUserId = localStorage.getItem('userId');
      socketRef.current.emit('call-user', {
        to: selectedConversation.id,
        offer,
        from: currentUserId,
        isVideo: type === 'video'
      });

    } catch (err) {
      console.error("Erreur démarrage appel:", err);
      alert("Impossible d'accéder à la caméra ou au micro.");
      setActiveCall(null);
    }
  };

  const cleanupCall = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    setActiveCall(null);
    setIsCallMuted(false);
    setIsCameraOff(false);
  };

  const endCall = () => {
    if (selectedConversation && socketRef.current) {
      socketRef.current.emit('end-call', { to: selectedConversation.id });
    }
    cleanupCall();
  };

  const startAudioRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        handleSendMessage(undefined, 'audio', 'Message vocal', audioUrl);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecordingAudio(true);
    } catch (err) {
      console.error("Impossible d'enregistrer l'audio :", err);
    }
  };

  const stopAudioRecording = () => {
    if (mediaRecorderRef.current && isRecordingAudio) {
      mediaRecorderRef.current.stop();
      setIsRecordingAudio(false);
    }
  };

  const toggleAudioRecording = () => {
    if (!isRecordingAudio) {
      startAudioRecording();
    } else {
      stopAudioRecording();
    }
  };

  const handleSendMessage = async (e?: React.FormEvent, customType: 'text' | 'image' | 'video' | 'audio' | 'file' = 'text', content?: string, mediaUrl?: string) => {
    if (e) e.preventDefault();
    const textToSend = content !== undefined ? content : newMessage;
    if ((!textToSend.trim() && !mediaUrl) || !selectedConversation) return;

    const receiverId = selectedConversation.type === 'support' 
      ? selectedConversation.id.replace('support-', '') 
      : selectedConversation.id;

    try {
      const res = await fetch('/api/messages/send', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          receiverId,
          text: textToSend,
          type: customType,
          mediaUrl: mediaUrl || null
        })
      });

      const data = await res.json();
      if (data.success) {
        const newMsg: Message = {
          id: data.message.id,
          senderId: data.message.senderId,
          receiverId: data.message.receiverId,
          text: data.message.text,
          type: data.message.type,
          mediaUrl: data.message.mediaUrl,
          createdAt: data.message.createdAt,
          timestamp: new Date(data.message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        setMessages(prev => ({
          ...prev,
          [selectedConversation.id]: [...(prev[selectedConversation.id] || []), newMsg]
        }));

        setConversations(prev => prev.map(c => c.id === selectedConversation.id ? { ...c, lastMessage: textToSend } : c));
        if (!mediaUrl) setNewMessage('');
        setShowEmojiPicker(false);
      }
    } catch (err) {
      console.error('Erreur envoi message:', err);
    }
  };

  const handleAddFriendSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!friendIdentifier.trim()) return;

    try {
      const res = await fetch('/api/messages/friends/add', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ identifier: friendIdentifier.trim() })
      });

      const data = await res.json();
      if (data.success) {
        setFriendIdentifier('');
        setIsAddFriendOpen(false);
        fetchConversations();
      } else {
        alert(data.message || "Erreur lors de l'ajout");
      }
    } catch (err) {
      console.error('Erreur ajout ami:', err);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video' | 'file') => {
    const file = e.target.files?.[0];
    if (!file || !selectedConversation) return;
    const url = URL.createObjectURL(file);
    handleSendMessage(undefined, type, file.name, url);
    e.target.value = '';
  };

  const filteredConversations = conversations.filter(conv => {
    const matchesSearch = conv.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (activeTab === 'friends') return conv.type === 'friend' && matchesSearch;
    if (activeTab === 'support') return conv.type === 'support' && matchesSearch;
    return matchesSearch;
  });

  return (
    <div className="flex h-screen w-full bg-[#09090b] text-zinc-100 overflow-hidden relative selection:bg-orange-500 selection:text-white">
      
      {/* ================= MODAL APPEL AUDIO / VIDÉO EN DIRECT ================= */}
      {activeCall && selectedConversation && (
        <div className="absolute inset-0 z-50 bg-[#09090b] flex flex-col items-center justify-between p-6 md:p-10">
          <div className="flex flex-col items-center gap-2 mt-4">
            <div className="w-16 h-16 rounded-2xl bg-orange-600 flex items-center justify-center font-bold text-xl text-white shadow-md">
              {selectedConversation.name.substring(0, 2).toUpperCase()}
            </div>
            <h2 className="text-xl font-bold text-white tracking-wide">{selectedConversation.name}</h2>
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#18181b] border border-orange-500/30 text-orange-400 text-xs font-medium">
              <Radio className="w-3.5 h-3.5" />
              <span>{activeCall === 'video' ? 'Appel vidéo sécurisé en cours...' : 'Appel audio en cours...'}</span>
            </div>
          </div>

          <div className="w-full max-w-4xl flex-1 my-6 bg-[#121214] border border-[#27272a] rounded-3xl flex items-center justify-center relative overflow-hidden">
            <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover bg-black" />
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none -z-10 text-zinc-600">
              <Sparkles className="w-12 h-12 mb-2 text-orange-500/30" />
              <p className="text-xs font-medium">Établissement de la connexion pair-à-pair...</p>
            </div>

            {activeCall === 'video' && (
              <div className="absolute bottom-6 right-6 w-44 h-32 bg-black border border-[#3f3f46] rounded-2xl overflow-hidden shadow-2xl">
                <video ref={localVideoRef} autoPlay playsInline muted className={`w-full h-full object-cover ${isCameraOff ? 'hidden' : ''}`} />
                {isCameraOff && (
                  <div className="flex flex-col items-center justify-center h-full text-[11px] text-zinc-400 gap-1 bg-[#18181b]">
                    <VideoIcon className="w-4 h-4 text-zinc-500" />
                    <span>Caméra coupée</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-5 mb-2 bg-[#18181b] border border-[#27272a] px-8 py-4 rounded-full shadow-2xl">
            <button 
              onClick={() => {
                if (localStreamRef.current) {
                  const audioTrack = localStreamRef.current.getAudioTracks()[0];
                  if (audioTrack) audioTrack.enabled = !audioTrack.enabled;
                  setIsCallMuted(!isCallMuted);
                }
              }} 
              className={`p-4 rounded-full transition cursor-pointer ${isCallMuted ? 'bg-[#27272a] text-orange-500 border border-orange-500/40' : 'bg-[#27272a] text-zinc-200 hover:bg-[#3f3f46]'}`}
              title={isCallMuted ? "Activer le micro" : "Couper le micro"}
            >
              <Mic className="w-5 h-5" />
            </button>

            {activeCall === 'video' && (
              <button 
                onClick={() => {
                  if (localStreamRef.current) {
                    const videoTrack = localStreamRef.current.getVideoTracks()[0];
                    if (videoTrack) videoTrack.enabled = !videoTrack.enabled;
                    setIsCameraOff(!isCameraOff);
                  }
                }} 
                className={`p-4 rounded-full transition cursor-pointer ${isCameraOff ? 'bg-[#27272a] text-orange-500 border border-orange-500/40' : 'bg-[#27272a] text-zinc-200 hover:bg-[#3f3f46]'}`}
                title={isCameraOff ? "Activer la caméra" : "Couper la caméra"}
              >
                <Video className="w-5 h-5" />
              </button>
            )}

            <button 
              onClick={endCall} 
              className="p-4 rounded-full bg-red-600 hover:bg-red-500 text-white transition cursor-pointer shadow-lg shadow-red-600/30"
              title="Raccrocher"
            >
              <PhoneOff className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* ================= BARRE LATÉRALE (Couleur Unie) ================= */}
      <aside className="w-84 border-r border-[#27272a] flex flex-col bg-[#09090b]">
        <div className="p-4 border-b border-[#27272a] flex items-center justify-between bg-[#09090b]">
          <div className="flex items-center gap-2.5">
            <button 
              onClick={() => {
                if (onBackToHome) {
                  onBackToHome();
                } else {
                  window.location.href = '/';
                }
              }}
              className="p-2.5 rounded-xl bg-[#18181b] hover:bg-orange-600 hover:text-white text-zinc-300 transition flex items-center justify-center cursor-pointer border border-[#27272a]"
              title="Retour à l'accueil"
            >
              <Home className="w-4 h-4 text-orange-500 group-hover:text-white transition" />
            </button>
            <h1 className="font-bold text-base text-white tracking-tight">Messages</h1>
          </div>
          
          <button 
            onClick={() => setIsAddFriendOpen(!isAddFriendOpen)}
            className="px-3 py-2 rounded-xl bg-[#18181b] hover:bg-[#27272a] text-zinc-200 transition flex items-center gap-1.5 text-xs font-semibold cursor-pointer border border-[#27272a]"
          >
            <UserPlus className="w-4 h-4 text-orange-500" />
            <span>Ajouter</span>
          </button>
        </div>

        {isAddFriendOpen && (
          <div className="p-3.5 bg-[#121214] border-b border-[#27272a]">
            <form onSubmit={handleAddFriendSubmit} className="flex flex-col gap-2">
              <span className="text-[11px] font-medium text-zinc-400">Ajouter via email ou pseudo exact</span>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={friendIdentifier}
                  onChange={(e) => setFriendIdentifier(e.target.value)}
                  placeholder="ex: user@domain.com"
                  className="bg-[#18181b] border border-[#27272a] rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-orange-500 flex-1 transition"
                />
                <button type="submit" className="bg-orange-600 hover:bg-orange-500 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer">
                  OK
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="p-3 bg-[#09090b]">
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher une discussion..."
              className="w-full bg-[#121214] border border-[#27272a] rounded-2xl pl-10 pr-4 py-2.5 text-xs text-zinc-200 focus:outline-none focus:border-orange-500 transition"
            />
          </div>
        </div>

        <div className="flex px-3 gap-1 mb-2 bg-[#09090b]">
          <button onClick={() => setActiveTab('all')} className={`flex-1 py-2 text-[11px] font-semibold rounded-xl transition cursor-pointer ${activeTab === 'all' ? 'bg-[#18181b] text-orange-400 border border-orange-500/30' : 'text-zinc-400 hover:bg-[#121214]'}`}>Tous</button>
          <button onClick={() => setActiveTab('friends')} className={`flex-1 py-2 text-[11px] font-semibold rounded-xl transition cursor-pointer ${activeTab === 'friends' ? 'bg-[#18181b] text-orange-400 border border-orange-500/30' : 'text-zinc-400 hover:bg-[#121214]'}`}>Amis</button>
          <button onClick={() => setActiveTab('support')} className={`flex-1 py-2 text-[11px] font-semibold rounded-xl transition cursor-pointer ${activeTab === 'support' ? 'bg-[#18181b] text-orange-400 border border-orange-500/30' : 'text-zinc-400 hover:bg-[#121214]'}`}>Support</button>
          <button onClick={() => setActiveTab('calls')} className={`flex-1 py-2 text-[11px] font-semibold rounded-xl transition cursor-pointer flex items-center justify-center gap-1 ${activeTab === 'calls' ? 'bg-[#18181b] text-orange-400 border border-orange-500/30' : 'text-zinc-400 hover:bg-[#121214]'}`}>
            <PhoneCall className="w-3 h-3" />
            <span>Appels</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-2 space-y-1 bg-[#09090b] pb-4">
          {activeTab === 'calls' ? (
            <div className="flex flex-col items-center justify-center py-12 text-zinc-500 px-4 text-center">
              <div className="w-12 h-12 rounded-2xl bg-[#121214] border border-[#27272a] flex items-center justify-center mb-2 text-orange-500">
                <Phone className="w-5 h-5" />
              </div>
              <p className="text-xs text-zinc-300 font-medium mb-1">Historique des appels</p>
              <p className="text-[11px] text-zinc-500">Sélectionnez un contact et cliquez sur l'icône d'appel audio ou vidéo en haut pour lancer une communication.</p>
            </div>
          ) : loadingConversations ? (
            <div className="flex flex-col items-center justify-center py-12 text-zinc-500 gap-2">
              <div className="flex items-center gap-1.5 py-2 px-4 rounded-full bg-[#121214] border border-[#27272a]">
                <span className="text-xs font-medium text-orange-400">Recherche des contacts</span>
              </div>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="text-center py-10 text-xs text-zinc-500 px-4">Aucune conversation trouvée.</div>
          ) : (
            filteredConversations.map(conv => (
              <div 
                key={conv.id}
                onClick={() => setSelectedConversation(conv)}
                className={`p-3 rounded-2xl flex items-start gap-3 cursor-pointer transition ${selectedConversation?.id === conv.id ? 'bg-[#18181b] border border-[#3f3f46]' : 'hover:bg-[#121214] border border-transparent'}`}
              >
                <div className="relative">
                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-sm ${conv.type === 'support' ? 'bg-[#18181b] text-orange-500 border border-orange-500/30' : 'bg-[#18181b] text-zinc-300 border border-[#27272a]'}`}>
                    {conv.type === 'support' ? <ShieldCheck className="w-5 h-5" /> : conv.name.substring(0, 2).toUpperCase()}
                  </div>
                  {conv.isOnline && <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-[#09090b] rounded-full"></span>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-xs text-white truncate">{conv.name}</span>
                    {conv.isVerified && <CheckCircle2 className="w-3.5 h-3.5 text-orange-500 fill-orange-500/20" />}
                  </div>
                  <p className="text-xs text-zinc-400 truncate">{conv.lastMessage || 'Aucun message récent'}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </aside>

      {/* ================= ZONE DE DISCUSSION (Couleur Unie) ================= */}
      <main className="flex-1 flex flex-col bg-[#09090b] relative">
        {selectedConversation ? (
          <>
            <header className="px-6 py-4 border-b border-[#27272a] flex items-center justify-between bg-[#09090b]">
              <div className="flex items-center gap-3.5">
                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-sm ${selectedConversation.type === 'support' ? 'bg-[#18181b] text-orange-500 border border-orange-500/30' : 'bg-[#18181b] text-white border border-[#27272a]'}`}>
                  {selectedConversation.type === 'support' ? <ShieldCheck className="w-5 h-5" /> : selectedConversation.name.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h2 className="font-bold text-sm text-white flex items-center gap-2">
                    {selectedConversation.name}
                    {selectedConversation.isVerified && <CheckCircle2 className="w-3.5 h-3.5 text-orange-500 fill-orange-500/20" />}
                  </h2>
                  <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    En ligne
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-zinc-400">
                <button onClick={() => startCall('audio')} className="p-2.5 hover:bg-[#18181b] rounded-xl transition cursor-pointer hover:text-white" title="Démarrer un appel audio">
                  <Phone className="w-4 h-4 text-orange-400" />
                </button>
                <button onClick={() => startCall('video')} className="p-2.5 hover:bg-[#18181b] rounded-xl transition cursor-pointer hover:text-white" title="Démarrer un appel vidéo">
                  <Video className="w-4 h-4 text-orange-400" />
                </button>
                <div className="w-px h-5 bg-[#27272a] mx-1"></div>
                <button className="p-2.5 hover:bg-[#18181b] rounded-xl transition cursor-pointer hover:text-white">
                  <MoreVertical className="w-4 h-4" />
                </button>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-[#09090b]">
              {loadingMessages ? (
                <div className="text-center py-10 text-xs text-zinc-500">Chargement des messages...</div>
              ) : (
                (messages[selectedConversation.id] || []).map(msg => {
                  const isMe = msg.senderId !== selectedConversation.id; 
                  return (
                    <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                      <div className={`max-w-md rounded-2xl px-4 py-3 text-xs leading-relaxed ${isMe ? 'bg-orange-600 text-white rounded-br-none' : 'bg-[#121214] border border-[#27272a] text-zinc-200 rounded-bl-none'}`}>
                        {msg.type === 'image' && msg.mediaUrl && (
                          <div className="mb-2 rounded-xl overflow-hidden bg-black border border-[#27272a]">
                            <img src={msg.mediaUrl} alt="Média" className="w-full h-48 object-cover" />
                          </div>
                        )}
                        {msg.type === 'video' && msg.mediaUrl && (
                          <div className="mb-2 rounded-xl overflow-hidden bg-black border border-[#27272a]">
                            <video src={msg.mediaUrl} controls className="w-full h-48 object-cover" />
                          </div>
                        )}
                        {msg.type === 'audio' && msg.mediaUrl && (
                          <div className="flex items-center gap-3 my-1 min-w-[220px]">
                            <audio src={msg.mediaUrl} controls className="w-full h-8 accent-orange-500" />
                          </div>
                        )}
                        {msg.type === 'file' && msg.mediaUrl && (
                          <div className="mb-2 flex items-center gap-2 bg-black p-2.5 rounded-xl border border-[#27272a]">
                            <Paperclip className="w-4 h-4 text-orange-400" />
                            <a href={msg.mediaUrl} target="_blank" rel="noopener noreferrer" className="text-orange-400 underline truncate text-xs">
                              {msg.text || 'Fichier joint'}
                            </a>
                          </div>
                        )}
                        {msg.text && msg.type !== 'file' && <p className="whitespace-pre-wrap">{msg.text}</p>}
                      </div>
                      <span className="text-[10px] text-zinc-500 mt-1 px-1">{msg.timestamp}</span>
                    </div>
                  );
                })
              )}
            </div>

            {/* Inputs cachés pour le file system */}
            <input type="file" ref={fileInputRef} onChange={(e) => handleFileUpload(e, 'image')} accept="image/*" className="hidden" />
            <input type="file" ref={videoInputRef} onChange={(e) => handleFileUpload(e, 'video')} accept="video/*" className="hidden" />
            <input type="file" ref={genericFileInputRef} onChange={(e) => handleFileUpload(e, 'file')} className="hidden" />

            {/* Sélecteur d'emojis contextuel */}
            {showEmojiPicker && (
              <div className="absolute bottom-20 left-6 bg-[#121214] border border-[#27272a] p-3 rounded-2xl grid grid-cols-4 gap-2 z-25">
                {EMOJI_LIST.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => {
                      setNewMessage(prev => prev + emoji);
                    }}
                    className="w-10 h-10 flex items-center justify-center text-lg hover:bg-[#18181b] rounded-xl transition cursor-pointer"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}

            <form onSubmit={(e) => handleSendMessage(e, 'text')} className="p-4 border-t border-[#27272a] bg-[#09090b] flex items-center gap-2.5 relative">
              {/* Bouton Explorateur de Fichiers (Trombone) */}
              <button 
                type="button" 
                onClick={() => genericFileInputRef.current?.click()} 
                className="p-3 rounded-2xl text-zinc-400 hover:bg-[#18181b] hover:text-white transition cursor-pointer" 
                title="Joindre un fichier de votre appareil"
              >
                <Paperclip className="w-5 h-5 text-orange-400" />
              </button>

              <button type="button" onClick={() => fileInputRef.current?.click()} className="p-3 rounded-2xl text-zinc-400 hover:bg-[#18181b] hover:text-white transition cursor-pointer" title="Envoyer une image">
                <ImageIcon className="w-5 h-5" />
              </button>

              <button type="button" onClick={() => videoInputRef.current?.click()} className="p-3 rounded-2xl text-zinc-400 hover:bg-[#18181b] hover:text-white transition cursor-pointer" title="Envoyer une vidéo">
                <VideoIcon className="w-5 h-5" />
              </button>

              <button type="button" onClick={toggleAudioRecording} className={`p-3 rounded-2xl transition cursor-pointer ${isRecordingAudio ? 'bg-red-600 text-white animate-pulse' : 'text-zinc-400 hover:bg-[#18181b] hover:text-white'}`} title="Enregistrer un message vocal">
                <Mic className="w-5 h-5" />
              </button>

              <div className="relative flex-1 flex items-center">
                <input 
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Écrivez votre message..."
                  className="w-full bg-[#121214] border border-[#27272a] rounded-2xl pl-4 pr-12 py-3.5 text-xs text-white focus:outline-none focus:border-orange-500 transition"
                />
                <button 
                  type="button" 
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="absolute right-3 p-1.5 text-zinc-400 hover:text-orange-400 transition cursor-pointer"
                  title="Insérer un emoji"
                >
                  <Smile className="w-5 h-5" />
                </button>
              </div>

              <button type="submit" disabled={!newMessage.trim()} className="p-3.5 rounded-2xl bg-orange-600 hover:bg-orange-500 text-white transition disabled:opacity-40 cursor-pointer">
                <Send className="w-4 h-4" />
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 p-6 text-center bg-[#09090b]">
            <div className="w-20 h-20 rounded-3xl bg-[#121214] border border-[#27272a] flex items-center justify-center mb-4 text-orange-500">
              <MessageCircle className="w-9 h-9 stroke-[1.5]" />
            </div>
            <h3 className="text-base font-bold text-white mb-1">Centre de messagerie</h3>
            <p className="text-xs max-w-sm text-zinc-400">Sélectionnez une discussion dans la barre latérale pour échanger en direct, passer des appels audio/vidéo, ou envoyer des fichiers.</p>
          </div>
        )}
      </main>
    </div>
  );
}

export default Message;