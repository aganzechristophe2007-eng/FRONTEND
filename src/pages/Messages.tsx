import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, LogOut, Send, Inbox, AlertCircle, UserPlus, CheckCircle, Headphones, Sun, Moon, MessageCircle, Search, User as UserIcon, Mic, Square, Phone, Video, PhoneOff, Paperclip, Smile } from 'lucide-react';
import { io } from 'socket.io-client';

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

const COMMON_EMOJIS = ['😀', '😂', '😍', '👍', '🙏', '🔥', '🎉', '❤️', '😎', '😅', '👏', '✨', '👋', '💯', '🤔', '😊'];

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
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // États pour l'enregistrement vocal
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // États et références pour les appels WebRTC / Socket.io
  const socketRef = useRef<any>(null);
  const [inCall, setInCall] = useState(false);
  const [incomingCallData, setIncomingCallData] = useState<any>(null);
  const [callType, setCallType] = useState<'audio' | 'video'>('audio');
  
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const ringtoneRef = useRef<HTMLAudioElement | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialisation de la sonnerie audio
  useEffect(() => {
    ringtoneRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/1359/1359-preview.mp3');
    if (ringtoneRef.current) {
      ringtoneRef.current.loop = true;
    }
  }, []);

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
    if (!currentUserId) return;

    const socket = io('https://cbfsoko-backend.onrender.com');
    socketRef.current = socket;
    socket.emit('register', currentUserId);

    socket.on('incoming-call', (data) => {
      setIncomingCallData(data);
      setCallType(data.isVideo ? 'video' : 'audio');
      ringtoneRef.current?.play().catch(() => {});
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
        } catch {
          // Ignorer
        }
      }
    });

    socket.on('call-ended', () => {
      terminateCallState();
    });

    return () => {
      socket.disconnect();
    };
  }, [currentUserId]);

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
        setShowEmojiPicker(false);
        localStorage.setItem(`cbfsoko_backup_${selectedContact.id}`, JSON.stringify(updatedMessages));
      } else {
        setError(data.message || "Erreur d'envoi.");
      }
    } catch {
      setError("Erreur réseau.");
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedContact?.id) return;

    setError('');
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('receiverId', selectedContact.id);
      formData.append('media', file);

      const response = await fetch('https://cbfsoko-backend.onrender.com/api/messages/media', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      const data = await response.json();
      if (data.success && data.data) {
        const updatedMessages = [...messages, data.data];
        setMessages(updatedMessages);
        localStorage.setItem(`cbfsoko_backup_${selectedContact.id}`, JSON.stringify(updatedMessages));
      } else {
        setError(data.message || "Erreur lors de l'envoi du fichier.");
      }
    } catch {
      setError("Erreur réseau lors de l'envoi du fichier.");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const startRecording = async () => {
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await sendAudioFile(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch {
      setError("Impossible d'accéder au microphone.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
    }
  };

  const sendAudioFile = async (blob: Blob) => {
    if (!selectedContact?.id) return;

    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('receiverId', selectedContact.id);
      formData.append('media', blob, `voice-note-${Date.now()}.webm`);

      const response = await fetch('https://cbfsoko-backend.onrender.com/api/messages/media', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      const data = await response.json();
      if (data.success && data.data) {
        const updatedMessages = [...messages, data.data];
        setMessages(updatedMessages);
        localStorage.setItem(`cbfsoko_backup_${selectedContact.id}`, JSON.stringify(updatedMessages));
      } else {
        setError(data.message || "Erreur envoi note vocale.");
      }
    } catch {
      setError("Erreur réseau vocal.");
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const isMediaFile = (content: string) => {
    return content.startsWith('uploads/') || content.includes('voice-note') || content.match(/\.(webm|mp3|wav|ogg|mp4|png|jpg|jpeg|pdf|docx)$/i);
  };

  const renderMessageContent = (content: string) => {
    if (!isMediaFile(content)) {
      return <p className="whitespace-pre-wrap break-words leading-relaxed">{content}</p>;
    }

    const fullUrl = `https://cbfsoko-backend.onrender.com/${content}`;
    const isImage = content.match(/\.(png|jpg|jpeg|gif|webp)$/i);
    const isAudio = content.match(/\.(webm|mp3|wav|ogg)$/i) || content.includes('voice-note');

    if (isImage) {
      return (
        <a href={fullUrl} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-xl">
          <img src={fullUrl} alt="Média" className="max-w-xs max-h-60 object-cover rounded-xl hover:opacity-95 transition" />
        </a>
      );
    }

    if (isAudio) {
      return (
        <div className="flex items-center gap-3 min-w-[200px]">
          <audio src={fullUrl} controls className="w-full h-10 accent-orange-500" />
        </div>
      );
    }

    return (
      <a href={fullUrl} target="_blank" rel="noopener noreferrer" className="underline font-semibold flex items-center gap-2 py-1">
        <Paperclip className="w-4 h-4" /> Fichier joint
      </a>
    );
  };

  const startCall = async (isVideo: boolean) => {
    if (!selectedContact?.id) return;
    setInCall(true);
    setCallType(isVideo ? 'video' : 'audio');

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });
    peerConnectionRef.current = pc;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: isVideo });
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      pc.ontrack = (event) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socketRef.current.emit('ice-candidate', { to: selectedContact.id, candidate: event.candidate });
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socketRef.current.emit('call-user', {
        to: selectedContact.id,
        offer,
        from: currentUserId,
        isVideo
      });
    } catch {
      setError("Erreur d'accès à la caméra ou au micro pour l'appel.");
      terminateCallState();
    }
  };

  const stopRingtone = () => {
    if (ringtoneRef.current) {
      ringtoneRef.current.pause();
      ringtoneRef.current.currentTime = 0;
    }
  };

  const acceptIncomingCall = async () => {
    stopRingtone();
    if (!incomingCallData) return;
    setInCall(true);
    const isVideoCall = incomingCallData.isVideo;
    setCallType(isVideoCall ? 'video' : 'audio');

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });
    peerConnectionRef.current = pc;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: isVideoCall });
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      pc.ontrack = (event) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socketRef.current.emit('ice-candidate', { to: incomingCallData.from, candidate: event.candidate });
        }
      };

      await pc.setRemoteDescription(new RTCSessionDescription(incomingCallData.offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socketRef.current.emit('make-answer', { to: incomingCallData.from, answer });
      setIncomingCallData(null);
    } catch {
      setError("Impossible d'établir l'appel.");
      terminateCallState();
    }
  };

  const rejectIncomingCall = () => {
    stopRingtone();
    if (incomingCallData?.from) {
      socketRef.current.emit('end-call', { to: incomingCallData.from });
    }
    setIncomingCallData(null);
  };

  const terminateCallState = () => {
    stopRingtone();
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (localVideoRef.current && localVideoRef.current.srcObject) {
      const stream = localVideoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
    setInCall(false);
    setIncomingCallData(null);
  };

  const hangUpCall = () => {
    const targetId = selectedContact?.id || incomingCallData?.from;
    if (targetId) {
      socketRef.current.emit('end-call', { to: targetId });
    }
    terminateCallState();
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center font-sans ${isLightMode ? 'bg-slate-50 text-slate-800' : 'bg-zinc-950 text-zinc-100'}`}>
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center gap-1.5 p-4">
            <div className="w-3 h-3 bg-orange-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
            <div className="w-3 h-3 bg-orange-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
            <div className="w-3 h-3 bg-orange-500 rounded-full animate-bounce"></div>
          </div>
          <span className="text-sm font-medium opacity-75">Chargement de vos messages...</span>
        </div>
      </div>
    );
  }

  const currentUserAvatarUrl = getAvatarUrl(userAvatar);
  const totalUnreadMessages = acceptedContacts.reduce((sum, contact) => sum + (contact.unreadCount || 0), 0);

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-colors duration-300 ${isLightMode ? 'bg-slate-100 text-slate-900' : 'bg-zinc-950 text-zinc-100'}`}>
      
      {/* Fenêtre modale d'appel entrant avec sonnerie */}
      {incomingCallData && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl max-w-sm w-full text-center shadow-2xl flex flex-col items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-orange-500/20 text-orange-500 flex items-center justify-center animate-bounce text-2xl font-bold">
              <Phone className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-zinc-100">Appel entrant</h3>
              <p className="text-sm text-zinc-400 mt-1">Appel {incomingCallData.isVideo ? 'vidéo' : 'audio'} en cours...</p>
            </div>
            <div className="flex items-center gap-4 w-full mt-2">
              <button
                onClick={rejectIncomingCall}
                className="flex-1 bg-rose-600 hover:bg-rose-500 text-white py-3 rounded-2xl font-bold transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <PhoneOff className="w-5 h-5" /> Refuser
              </button>
              <button
                onClick={acceptIncomingCall}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-2xl font-bold transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Phone className="w-5 h-5" /> Décrocher
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Écran d'appel en cours (Actif) */}
      {inCall && (
        <div className="fixed inset-0 z-50 bg-zinc-950 flex flex-col items-center justify-between p-6 animate-fade-in">
          <div className="w-full max-w-4xl flex items-center justify-between text-white py-4">
            <h2 className="text-lg font-bold">Appel en cours</h2>
            <span className="bg-orange-600 px-3 py-1 rounded-full text-xs font-bold uppercase">{callType}</span>
          </div>

          <div className="flex-1 w-full max-w-4xl flex items-center justify-center relative overflow-hidden rounded-3xl bg-zinc-900 border border-zinc-800">
            <video 
              ref={remoteVideoRef} 
              autoPlay 
              playsInline 
              className={`w-full h-full object-cover ${callType === 'audio' ? 'hidden' : 'block'}`} 
            />
            {callType === 'audio' && (
              <div className="flex flex-col items-center gap-4 text-zinc-300">
                <div className="w-28 h-28 rounded-full bg-orange-600/20 border-2 border-orange-500 flex items-center justify-center animate-pulse text-orange-500 text-3xl font-bold">
                  {selectedContact?.name ? selectedContact.name.charAt(0).toUpperCase() : <UserIcon className="w-10 h-10" />}
                </div>
                <p className="text-xl font-semibold">{selectedContact?.name || 'En communication'}</p>
              </div>
            )}
            <video 
              ref={localVideoRef} 
              autoPlay 
              playsInline 
              muted 
              className={`absolute bottom-4 right-4 w-32 h-44 object-cover rounded-2xl border-2 border-zinc-700 shadow-lg ${callType === 'audio' ? 'hidden' : 'block'}`} 
            />
          </div>

          <div className="py-6 flex items-center gap-4">
            <button
              onClick={hangUpCall}
              className="bg-rose-600 hover:bg-rose-500 text-white px-8 py-4 rounded-2xl font-bold text-base transition flex items-center gap-2 shadow-lg cursor-pointer"
            >
              <PhoneOff className="w-6 h-6" /> Raccrocher
            </button>
          </div>
        </div>
      )}

      {/* En-tête de la page */}
      <header className={`border px-4 lg:px-8 py-4 sticky top-0 z-40 backdrop-blur-md transition-colors duration-200 ${
        isLightMode ? 'border-slate-200/80 bg-white/90 shadow-xs' : 'border-zinc-800/80 bg-zinc-900/90 shadow-md'
      }`}>
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 w-full">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-orange-500/10 border-2 border-orange-500/30 text-orange-500 flex items-center justify-center font-bold text-base overflow-hidden relative shadow-inner">
              {currentUserAvatarUrl ? (
                <img 
                  src={currentUserAvatarUrl} 
                  alt={userName} 
                  className="w-full h-full object-cover bg-white dark:bg-zinc-900" 
                  onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }} 
                />
              ) : (
                <span className="font-bold text-orange-500">
                  {userName ? userName.charAt(0).toUpperCase() : <UserIcon className="w-5 h-5" />}
                </span>
              )}
            </div>
            <div>
              <h1 className={`text-lg sm:text-xl font-extrabold tracking-tight ${isLightMode ? 'text-slate-900' : 'text-zinc-100'}`}>Messagerie</h1>
              <p className="text-xs text-orange-500 font-semibold uppercase tracking-wider">{userRole || 'Membre'}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-2.5">
            <button
              onClick={handleOpenSupportChat}
              className={`p-2.5 rounded-xl border transition-all duration-200 cursor-pointer flex items-center justify-center hover:scale-105 active:scale-95 ${
                isLightMode ? 'bg-orange-50 text-orange-600 border-orange-200 hover:bg-orange-100' : 'bg-zinc-900 text-orange-400 border-zinc-800 hover:bg-zinc-800'
              }`}
              title="Support Client"
            >
              <Headphones className="w-5 h-5" />
            </button>

            <button
              onClick={() => setIsLightMode(!isLightMode)}
              className={`p-2.5 rounded-xl transition-all duration-200 cursor-pointer border hover:scale-105 active:scale-95 ${
                isLightMode ? 'bg-slate-50 text-amber-500 border-slate-200 hover:bg-slate-100' : 'bg-zinc-900 text-amber-400 border-zinc-800 hover:bg-zinc-800'
              }`}
              title="Changer de thème"
            >
              {isLightMode ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5 text-amber-400" />}
            </button>

            <Link to="/" className={`p-2.5 rounded-xl border transition-all duration-200 hover:scale-105 active:scale-95 ${
              isLightMode ? 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100' : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:bg-zinc-800'
            }`} title="Accueil">
              <ArrowLeft className="w-5 h-5" />
            </Link>

            <button
              onClick={handleLogout}
              className="p-2.5 rounded-xl bg-rose-500/10 text-rose-500 hover:bg-rose-600 hover:text-white transition-all duration-200 cursor-pointer border border-rose-500/20 hover:scale-105 active:scale-95"
              title="Se déconnecter"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl w-full mx-auto p-2 sm:p-6 lg:p-8 flex-1 flex flex-col pb-24 text-sm sm:text-base">
        
        {error && (
          <div className="mb-4 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-sm flex items-center gap-3 animate-fade-in shadow-xs">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span className="font-semibold">{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-sm flex items-center gap-3 animate-fade-in shadow-xs">
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
            <span className="font-semibold">{successMsg}</span>
          </div>
        )}

        {activeBottomTab === 'chats' ? (
          <div className={`border rounded-3xl overflow-hidden flex-1 shadow-md grid grid-cols-1 md:grid-cols-12 min-h-[550px] transition-all duration-300 ${
            isLightMode ? 'bg-white border-slate-200' : 'bg-zinc-900 border-zinc-800'
          }`}>
            
            {/* Sidebar des conversations */}
            <div className={`md:col-span-4 border-r flex flex-col ${showMobileChat ? 'hidden md:flex' : 'flex'} ${
              isLightMode ? 'border-slate-200 bg-slate-50/50' : 'border-zinc-800 bg-zinc-900/50'
            }`}>
              
              <div className="p-4 border-b border-slate-200/80 dark:border-zinc-800">
                <div className={`flex items-center gap-3 px-4 py-2.5 rounded-2xl border transition-all focus-within:ring-2 focus-within:ring-orange-500/30 ${
                  isLightMode ? 'bg-white border-slate-300 shadow-2xs' : 'bg-zinc-950 border-zinc-700'
                }`}>
                  <Search className={`w-4 h-4 ${isLightMode ? 'text-slate-400' : 'text-zinc-400'}`} />
                  <input
                    type="text"
                    placeholder="Rechercher une discussion..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-transparent text-sm font-medium outline-none"
                  />
                </div>
              </div>

              <div className="overflow-y-auto flex-1 divide-y divide-slate-100 dark:divide-zinc-800/60">
                {acceptedContacts.length === 0 ? (
                  <div className="p-8 text-center flex flex-col items-center justify-center h-full">
                    <MessageCircle className={`w-10 h-10 mb-2 opacity-40 ${isLightMode ? 'text-slate-400' : 'text-zinc-500'}`} />
                    <p className={`text-sm font-medium ${isLightMode ? 'text-slate-500' : 'text-zinc-400'}`}>Aucune discussion active.</p>
                  </div>
                ) : (
                  acceptedContacts
                    .filter(c => c.name?.toLowerCase().includes(searchQuery.toLowerCase()))
                    .map((contact) => {
                      const isSelected = selectedContact?.id === contact.id;
                      const avatarUrl = getAvatarUrl(contact.avatar);
                      const online = isUserOnline(contact.updatedAt);
                      return (
                        <div
                          key={contact.id}
                          onClick={() => {
                            setSelectedContact(contact);
                            setShowMobileChat(true);
                            fetchMessages(contact.id, false);
                          }}
                          className={`p-4 sm:p-4.5 flex items-center gap-3.5 cursor-pointer transition-all ${
                            isSelected 
                              ? isLightMode ? 'bg-orange-50/80 border-l-4 border-orange-600 shadow-2xs' : 'bg-orange-500/15 border-l-4 border-orange-500 shadow-2xs'
                              : isLightMode ? 'hover:bg-slate-100/70' : 'hover:bg-zinc-800/60'
                          }`}
                        >
                          <div className="w-13 h-13 rounded-2xl bg-orange-500/10 border-2 border-orange-500/30 text-orange-500 flex items-center justify-center font-bold text-base flex-shrink-0 overflow-hidden relative shadow-xs">
                            {avatarUrl ? (
                              <img 
                                src={avatarUrl} 
                                alt={contact.name} 
                                className="w-full h-full object-cover bg-white dark:bg-zinc-900" 
                                onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }} 
                              />
                            ) : (
                              <span className="absolute inset-0 flex items-center justify-center font-bold text-orange-500">
                                {contact.name ? contact.name.charAt(0).toUpperCase() : <UserIcon className="w-5 h-5" />}
                              </span>
                            )}
                            {online && (
                              <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-white dark:border-zinc-900 rounded-full"></span>
                            )}
                          </div>
                          
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between">
                              <p className={`text-sm sm:text-base font-bold truncate ${isLightMode ? 'text-slate-900' : 'text-zinc-100'}`}>{contact.name}</p>
                              {contact.unreadCount ? (
                                <span className="bg-orange-600 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full shadow-xs animate-pulse">
                                  {contact.unreadCount}
                                </span>
                              ) : null}
                            </div>
                            <p className={`text-xs sm:text-xs truncate mt-0.5 ${isLightMode ? 'text-slate-500' : 'text-zinc-400'}`}>{contact.email}</p>
                          </div>
                        </div>
                      );
                    })
                )}
              </div>
            </div>

            {/* Fenêtre de chat active */}
            <div className={`md:col-span-8 flex flex-col h-[550px] md:h-auto relative ${!showMobileChat ? 'hidden md:flex' : 'flex'}`}>
              {selectedContact ? (
                <>
                  <div className={`p-4 sm:p-4.5 border-b flex items-center justify-between ${isLightMode ? 'border-slate-200 bg-white' : 'border-zinc-800 bg-zinc-900'}`}>
                    <div className="flex items-center gap-3.5">
                      <button 
                        onClick={() => setShowMobileChat(false)}
                        className="md:hidden p-2 rounded-xl text-orange-500 hover:bg-orange-500/10 transition"
                      >
                        <ArrowLeft className="w-5 h-5" />
                      </button>
                      <div className="w-11 h-11 rounded-2xl bg-orange-500/10 border-2 border-orange-500/30 text-orange-500 flex items-center justify-center font-bold text-base flex-shrink-0 overflow-hidden relative">
                        {selectedContact.avatar ? (
                          <img 
                            src={getAvatarUrl(selectedContact.avatar)} 
                            alt={selectedContact.name} 
                            className="w-full h-full object-cover bg-white dark:bg-zinc-900" 
                            onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }} 
                          />
                        ) : (
                          selectedContact.name ? selectedContact.name.charAt(0).toUpperCase() : <UserIcon className="w-5 h-5" />
                        )}
                      </div>
                      <div>
                        <h3 className={`text-base font-bold ${isLightMode ? 'text-slate-900' : 'text-zinc-100'}`}>
                          {selectedContact.name}
                        </h3>
                        <span className={`text-[11px] font-semibold flex items-center gap-1.5 ${isUserOnline(selectedContact.updatedAt) ? 'text-emerald-500' : isLightMode ? 'text-slate-400' : 'text-zinc-500'}`}>
                          <span className={`w-2 h-2 rounded-full ${isUserOnline(selectedContact.updatedAt) ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></span>
                          {isUserOnline(selectedContact.updatedAt) ? 'En ligne' : 'Hors ligne'}
                        </span>
                      </div>
                    </div>

                    {/* Boutons d'appel audio et vidéo intégrés */}
                    <div className="flex items-center gap-1 sm:gap-2">
                      <button
                        onClick={() => startCall(false)}
                        className={`p-2.5 rounded-xl transition cursor-pointer ${isLightMode ? 'text-orange-600 hover:bg-orange-50' : 'text-orange-400 hover:bg-zinc-800'}`}
                        title="Appel audio"
                      >
                        <Phone className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => startCall(true)}
                        className={`p-2.5 rounded-xl transition cursor-pointer ${isLightMode ? 'text-orange-600 hover:bg-orange-50' : 'text-orange-400 hover:bg-zinc-800'}`}
                        title="Appel vidéo"
                      >
                        <Video className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  <div className={`flex-1 p-4 sm:p-6 overflow-y-auto space-y-3.5 ${isLightMode ? 'bg-slate-50/70' : 'bg-zinc-950/70'}`}>
                    {messages.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-center p-6">
                        <MessageCircle className={`w-12 h-12 mb-3 opacity-30 ${isLightMode ? 'text-slate-400' : 'text-zinc-600'}`} />
                        <p className={`text-sm font-medium ${isLightMode ? 'text-slate-500' : 'text-zinc-400'}`}>Aucun message pour le moment. Envoyez le premier !</p>
                      </div>
                    ) : (
                      messages.map((msg) => {
                        const isMe = msg.senderId === currentUserId;

                        return (
                          <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} animate-fade-in`}>
                            <div className={`max-w-[85%] sm:max-w-[70%] px-4 py-3 rounded-2xl text-sm sm:text-sm shadow-xs transition-all ${
                              isMe 
                                ? 'bg-orange-600 text-white font-medium rounded-br-xs shadow-orange-600/10' 
                                : isLightMode 
                                  ? 'bg-white border border-slate-200/80 text-slate-900 rounded-bl-xs' 
                                  : 'bg-zinc-800 border border-zinc-700/80 text-zinc-100 rounded-bl-xs'
                            }`}>
                              {renderMessageContent(msg.content)}
                            </div>
                            <span className={`text-[10px] mt-1 px-1 font-medium ${isLightMode ? 'text-slate-400' : 'text-zinc-500'}`}>
                              {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        );
                      })
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Panneau de sélection d'emojis */}
                  {showEmojiPicker && (
                    <div className={`absolute bottom-20 left-4 z-20 p-3 rounded-2xl shadow-xl border grid grid-cols-4 gap-2 animate-fade-in ${
                      isLightMode ? 'bg-white border-slate-200' : 'bg-zinc-900 border-zinc-700'
                    }`}>
                      {COMMON_EMOJIS.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => {
                            setNewMessage(prev => prev + emoji);
                          }}
                          className="text-2xl p-2 hover:scale-125 transition transform rounded-xl hover:bg-orange-500/10 cursor-pointer flex items-center justify-center"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Barre d'envoi de message avec jointure de fichier, emojis et vocal */}
                  <form onSubmit={handleSendMessage} className={`p-4 sm:p-4.5 border-t flex items-center gap-2 sm:gap-3 ${isLightMode ? 'border-slate-200 bg-white' : 'border-zinc-800 bg-zinc-900'}`}>
                    {isRecording ? (
                      <div className="flex-1 flex items-center justify-between px-4 py-2 bg-rose-500/10 border border-rose-500/30 rounded-2xl animate-pulse">
                        <div className="flex items-center gap-2 text-rose-500 font-bold text-sm">
                          <span className="w-3 h-3 bg-rose-500 rounded-full animate-ping"></span>
                          Enregistrement... {formatTime(recordingTime)}
                        </div>
                        <button
                          type="button"
                          onClick={stopRecording}
                          className="bg-rose-600 hover:bg-rose-500 text-white p-2 rounded-xl flex items-center gap-1 text-xs font-bold transition cursor-pointer"
                        >
                          <Square className="w-4 h-4 fill-current" /> Envoyer le vocal
                        </button>
                      </div>
                    ) : (
                      <>
                        {/* Input fichier caché */}
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleFileUpload}
                          className="hidden"
                          accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
                        />

                        {/* Bouton trombone pour joindre un fichier (placé à gauche de la barre de saisie) */}
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="p-2.5 rounded-2xl bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 hover:bg-orange-500 hover:text-white transition-all duration-200 cursor-pointer shadow-xs flex items-center justify-center hover:scale-105 active:scale-95 flex-shrink-0"
                          title="Joindre un fichier"
                        >
                          <Paperclip className="w-5 h-5" />
                        </button>

                        <div className="relative flex-1 flex items-center">
                          <input
                            type="text"
                            placeholder="Votre message..."
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            className={`w-full text-sm sm:text-base px-4.5 py-3 pr-11 rounded-2xl border outline-none transition-all ${
                              isLightMode ? 'bg-slate-50 border-slate-300 text-slate-900 focus:border-orange-600 focus:ring-2 focus:ring-orange-500/20' : 'bg-zinc-950 border-zinc-700 text-zinc-100 focus:border-orange-500'
                            }`}
                          />
                          <button
                            type="button"
                            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                            className="absolute right-3 text-slate-400 hover:text-orange-500 transition cursor-pointer"
                            title="Choisir un emoji"
                          >
                            <Smile className="w-5 h-5" />
                          </button>
                        </div>
                        
                        <button
                          type="button"
                          onClick={startRecording}
                          className="p-3 rounded-2xl bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 hover:bg-orange-500 hover:text-white transition-all duration-200 cursor-pointer shadow-xs flex items-center justify-center hover:scale-105 active:scale-95 flex-shrink-0"
                          title="Enregistrer un vocal"
                        >
                          <Mic className="w-5 h-5" />
                        </button>

                        <button
                          type="submit"
                          disabled={!newMessage.trim()}
                          className="bg-orange-600 hover:bg-orange-500 disabled:opacity-40 text-white p-3 rounded-2xl transition-all duration-200 cursor-pointer shadow-md shadow-orange-600/20 flex items-center justify-center hover:scale-105 active:scale-95 flex-shrink-0"
                        >
                          <Send className="w-5 h-5" />
                        </button>
                      </>
                    )}
                  </form>
                </>
              ) : (
                <div className="flex-1 hidden md:flex flex-col items-center justify-center p-6 text-center">
                  <Inbox className={`w-14 h-14 mb-3 opacity-30 ${isLightMode ? 'text-slate-400' : 'text-zinc-600'}`} />
                  <p className={`text-sm font-semibold ${isLightMode ? 'text-slate-500' : 'text-zinc-400'}`}>Sélectionnez une discussion pour commencer à chatter.</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className={`border rounded-3xl p-4 sm:p-8 flex-1 shadow-md transition-all ${isLightMode ? 'bg-white border-slate-200' : 'bg-zinc-900 border-zinc-800'}`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className={`text-lg sm:text-xl font-extrabold ${isLightMode ? 'text-slate-900' : 'text-zinc-100'}`}>Ajouter des amis</h2>
                <p className={`text-xs sm:text-sm mt-1 font-medium ${isLightMode ? 'text-slate-500' : 'text-zinc-400'}`}>
                  Vous avez déjà <span className="font-bold text-orange-600 dark:text-orange-500">{acceptedContacts.length}</span> contact{acceptedContacts.length > 1 ? 's' : ''} actif{acceptedContacts.length > 1 ? 's' : ''}.
                </p>
              </div>
              <div className="relative w-full sm:w-80">
                <Search className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 ${isLightMode ? 'text-slate-400' : 'text-zinc-400'}`} />
                <input
                  type="text"
                  placeholder="Rechercher des membres..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full text-sm pl-11 pr-4 py-3 rounded-2xl border outline-none transition-all ${
                    isLightMode ? 'bg-slate-50 border-slate-300 text-slate-900 focus:border-orange-600 focus:ring-2 focus:ring-orange-500/20' : 'bg-zinc-950 border-zinc-700 text-zinc-100 focus:border-orange-500'
                  }`}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {availableUsers
                .filter(user => user.name?.toLowerCase().includes(searchQuery.toLowerCase()) || user.email?.toLowerCase().includes(searchQuery.toLowerCase()))
                .map((user) => {
                  const isContact = acceptedContacts.some(c => c.id === user.id);
                  const isPending = pendingRequests.includes(user.id) || user.contactStatus === 'PENDING';
                  const avatarUrl = getAvatarUrl(user.avatar);
                  return (
                    <div key={user.id} className={`p-4 border rounded-2xl flex items-center justify-between gap-4 transition-all hover:shadow-sm ${isLightMode ? 'border-slate-200/80 bg-slate-50/50 hover:bg-slate-50' : 'border-zinc-800 bg-zinc-950/50 hover:bg-zinc-950'}`}>
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-11 h-11 rounded-2xl bg-orange-500/10 border-2 border-orange-500/30 text-orange-500 flex items-center justify-center font-bold text-sm flex-shrink-0 overflow-hidden relative">
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
                          <p className={`text-sm font-bold truncate ${isLightMode ? 'text-slate-900' : 'text-zinc-100'}`}>{user.name}</p>
                          <p className={`text-xs truncate mt-0.5 ${isLightMode ? 'text-slate-500' : 'text-zinc-400'}`}>{user.email}</p>
                        </div>
                      </div>
                      
                      {isContact ? (
                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-xl">Ami</span>
                      ) : isPending ? (
                        <span className="text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-3 py-1.5 rounded-xl">En attente</span>
                      ) : (
                        <button
                          onClick={() => handleSendContactRequest(user.id)}
                          className="bg-orange-600 hover:bg-orange-500 text-white p-2.5 rounded-xl transition-all duration-200 cursor-pointer shadow-sm flex items-center justify-center hover:scale-105 active:scale-95"
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

      {/* Navigation inférieure fixe */}
      <nav className={`fixed bottom-0 left-0 right-0 border-t py-2.5 px-6 z-40 flex items-center justify-around backdrop-blur-md transition-colors duration-200 ${
        isLightMode ? 'border-slate-200/80 bg-white/95 shadow-xl' : 'border-zinc-800/80 bg-zinc-900/95 shadow-xl shadow-black/80'
      }`}>
        <button
          onClick={() => { setActiveBottomTab('chats'); setShowMobileChat(false); }}
          className={`relative px-6 py-2 rounded-2xl flex flex-col items-center gap-1 transition-all cursor-pointer ${
            activeBottomTab === 'chats' 
              ? 'text-orange-600 dark:text-orange-500 font-bold scale-105' 
              : isLightMode ? 'text-slate-400 hover:text-slate-700' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <MessageCircle className="w-5 h-5" />
          <span className="text-[11px]">Discussions</span>
          {totalUnreadMessages > 0 && (
            <span className="absolute top-1 right-4 w-2 h-2 bg-orange-600 rounded-full animate-ping"></span>
          )}
        </button>

        <button
          onClick={() => setActiveBottomTab('people')}
          className={`relative px-6 py-2 rounded-2xl flex flex-col items-center gap-1 transition-all cursor-pointer ${
            activeBottomTab === 'people' 
              ? 'text-orange-600 dark:text-orange-500 font-bold scale-105' 
              : isLightMode ? 'text-slate-400 hover:text-slate-700' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <UserPlus className="w-5 h-5" />
          <span className="text-[11px]">Membres</span>
        </button>
      </nav>
    </div>
  );
}