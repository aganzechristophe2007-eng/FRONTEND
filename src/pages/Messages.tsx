import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Send, Search, User as UserIcon, Mic, Square, Phone, Video,
  PhoneOff, Paperclip, Smile, CheckCheck, Check, Play, Image as ImageIcon,
  MoreVertical, Sun, Moon, X, UserPlus, Headphones
} from 'lucide-react';
import { io, Socket } from 'socket.io-client';

const BACKEND_URL = 'https://cbfsoko-backend.onrender.com';
const COMMON_EMOJIS = ['😀', '😂', '😍', '👍', '🙏', '🔥', '🎉', '❤️', '😎', '😅', '👏', '✨', '👋', '💯', '🤔', '😊'];

interface ContactUser {
  id: string;
  name: string;
  email: string;
  role?: string;
  avatar?: string;
  contactStatus?: 'ACCEPTED' | 'PENDING' | 'REJECTED' | null;
}

interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  createdAt: string;
  isRead?: boolean;
  tempId?: string;
  pending?: boolean;
  sender?: { name: string };
}

export default function MessagesPage() {
  const navigate = useNavigate();
  const [darkMode, setDarkMode] = useState(true);
  const [currentUserId, setCurrentUserId] = useState('');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [acceptedContacts, setAcceptedContacts] = useState<ContactUser[]>([]);
  const [availableUsers, setAvailableUsers] = useState<ContactUser[]>([]);
  const [selectedContact, setSelectedContact] = useState<ContactUser | null>(null);
  const [showMobileChat, setShowMobileChat] = useState(false);
  const [activeBottomTab, setActiveBottomTab] = useState<'chats' | 'people'>('chats');
  const [searchQuery, setSearchQuery] = useState('');

  const [messagesByContact, setMessagesByContact] = useState<Record<string, Message[]>>({});
  const [lastMessageByContact, setLastMessageByContact] = useState<Record<string, Message>>({});
  const [unreadByContact, setUnreadByContact] = useState<Record<string, number>>({});

  const [newMessage, setNewMessage] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());
  const [typingFrom, setTypingFrom] = useState<Set<string>>(new Set());

  // Vocal
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Appels WebRTC
  const [inCall, setInCall] = useState(false);
  const [isCallingOut, setIsCallingOut] = useState(false);
  const [incomingCallData, setIncomingCallData] = useState<any>(null);
  const [callType, setCallType] = useState<'audio' | 'video'>('audio');
  const [callDuration, setCallDuration] = useState(0);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const ringtoneRef = useRef<HTMLAudioElement | null>(null);
  const callTimerRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const socketRef = useRef<Socket | null>(null);

  // --- Miroirs "ref" pour éviter les closures figées dans les listeners socket ---
  const selectedContactRef = useRef<ContactUser | null>(null);
  const callDurationRef = useRef(0);
  const callTypeRef = useRef<'audio' | 'video'>('audio');
  useEffect(() => { selectedContactRef.current = selectedContact; }, [selectedContact]);
  useEffect(() => { callDurationRef.current = callDuration; }, [callDuration]);
  useEffect(() => { callTypeRef.current = callType; }, [callType]);

  const messages = selectedContact ? (messagesByContact[selectedContact.id] || []) : [];

  const getAvatarUrl = useCallback((path?: string) => {
    if (!path || typeof path !== 'string') return '';
    const trimmed = path.trim();
    if (!trimmed) return '';
    if (trimmed.startsWith('http') || trimmed.startsWith('blob:') || trimmed.startsWith('data:')) return trimmed;
    const cleanPath = trimmed.replace(/\\/g, '/');
    const formattedPath = cleanPath.startsWith('/') ? cleanPath : `/${cleanPath}`;
    if (!formattedPath.includes('uploads')) return `${BACKEND_URL}/uploads${formattedPath}`;
    return `${BACKEND_URL}${formattedPath}`;
  }, []);

  const getInitials = (name?: string) => {
    if (!name) return "U";
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  useEffect(() => { scrollToBottom(); }, [messages.length]);

  // ============ INITIALISATION ============
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
    } catch {}
    loadInitialData(token);
    ringtoneRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/1359/1359-preview.mp3');
    if (ringtoneRef.current) ringtoneRef.current.loop = true;
  }, [navigate]);

  // ============ SOCKET : connexion unique, événements temps réel ============
  useEffect(() => {
    if (!currentUserId) return;

    const socket = io(BACKEND_URL);
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('register', currentUserId);
    });

    socket.on('online-users', ({ userIds }: { userIds: string[] }) => {
      setOnlineUserIds(new Set(userIds));
    });
    socket.on('user-online', ({ userId }: { userId: string }) => {
      setOnlineUserIds(prev => new Set(prev).add(userId));
    });
    socket.on('user-offline', ({ userId }: { userId: string }) => {
      setOnlineUserIds(prev => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    });

    // Nouveau message reçu OU confirmation de notre propre envoi
    socket.on('new-message', (msg: Message) => {
      const otherId = msg.senderId === currentUserId ? msg.receiverId : msg.senderId;

      setMessagesByContact(prev => {
        const list = prev[otherId] || [];
        // Remplace le message optimiste (tempId) par la version confirmée du serveur
        const withoutTemp = msg.tempId ? list.filter(m => m.id !== msg.tempId) : list;
        if (withoutTemp.some(m => m.id === msg.id)) return prev;
        return { ...prev, [otherId]: [...withoutTemp, { ...msg, pending: false }] };
      });

      setLastMessageByContact(prev => ({ ...prev, [otherId]: msg }));

      // Fait remonter la conversation en haut de la liste
      setAcceptedContacts(prev => {
        const idx = prev.findIndex(c => c.id === otherId);
        if (idx <= 0) return prev;
        const copy = [...prev];
        const [item] = copy.splice(idx, 1);
        return [item, ...copy];
      });

      const isCurrentlyOpen = selectedContactRef.current?.id === otherId;

      // Message reçu d'un tiers (pas notre propre confirmation)
      if (msg.senderId !== currentUserId) {
        if (isCurrentlyOpen) {
          socket.emit('message-seen', { otherUserId: otherId });
        } else {
          setUnreadByContact(prev => ({ ...prev, [otherId]: (prev[otherId] || 0) + 1 }));
          // Notification même hors de l'onglet de cette conversation (tant qu'on est sur /messages)
          playNotificationSound();
          if (Notification && Notification.permission === 'granted') {
            new Notification(msg.sender?.name || 'Nouveau message', { body: isMediaFile(msg.content) ? '📎 Fichier joint' : msg.content });
          }
        }
      }
    });

    socket.on('message-error', ({ tempId, message }: any) => {
      setError(message || "Erreur d'envoi.");
      if (tempId) {
        setMessagesByContact(prev => {
          const updated: Record<string, Message[]> = {};
          for (const key in prev) {
            updated[key] = prev[key].map(m => m.id === tempId ? { ...m, pending: false } : m);
          }
          return updated;
        });
      }
    });

    socket.on('typing', ({ senderId }: { senderId: string }) => {
      setTypingFrom(prev => new Set(prev).add(senderId));
    });
    socket.on('stop-typing', ({ senderId }: { senderId: string }) => {
      setTypingFrom(prev => {
        const next = new Set(prev);
        next.delete(senderId);
        return next;
      });
    });

    socket.on('messages-seen', ({ by }: { by: string }) => {
      setMessagesByContact(prev => {
        const list = prev[by];
        if (!list) return prev;
        return { ...prev, [by]: list.map(m => m.senderId === currentUserId ? { ...m, isRead: true } : m) };
      });
    });

    // --- Appels (logique reprise, bugs de closure corrigés via refs) ---
    socket.on('incoming-call', (data) => {
      setIncomingCallData(data);
      setCallType(data.isVideo ? 'video' : 'audio');
      ringtoneRef.current?.play().catch(() => {});
    });

    socket.on('call-answered', async ({ answer }) => {
      if (peerConnectionRef.current) {
        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answer));
        setIsCallingOut(false);
        setInCall(true);
        startCallTimer();
      }
    });

    socket.on('ice-candidate', async ({ candidate }) => {
      if (peerConnectionRef.current && candidate) {
        try { await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate)); } catch {}
      }
    });

    socket.on('call-ended', () => {
      terminateCallState(false);
    });

    if (Notification && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }

    return () => { socket.disconnect(); };
  }, [currentUserId]);

  const playNotificationSound = () => {
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3');
    audio.volume = 0.5;
    audio.play().catch(() => {});
  };

  const handleUnauthorized = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const loadInitialData = async (token: string) => {
    setLoading(true);
    try {
      const resUsers = await fetch(`${BACKEND_URL}/api/messages/users/available`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const dataUsers = await resUsers.json();
      let usersList: ContactUser[] = [];
      if (dataUsers.success && Array.isArray(dataUsers.data)) {
        usersList = dataUsers.data;
        setAvailableUsers(usersList);
      }

      const resContacts = await fetch(`${BACKEND_URL}/api/messages/contacts/accepted`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (resContacts.status === 401) { handleUnauthorized(); return; }

      const dataContacts = await resContacts.json();
      const rawContactsList = dataContacts.success && Array.isArray(dataContacts.data) ? dataContacts.data : [];
      const contactsList = rawContactsList.map((contact: ContactUser) => {
        const matchingUser = usersList.find((u) => u.id === contact.id);
        return { ...contact, avatar: contact.avatar || matchingUser?.avatar || '' };
      });

      setAcceptedContacts(contactsList);

      // Charge en une fois le dernier message de chaque conversation, pour le tri et l'aperçu
      const resAll = await fetch(`${BACKEND_URL}/api/messages`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const dataAll = await resAll.json();
      if (dataAll.success && Array.isArray(dataAll.data)) {
        const allMsgs: Message[] = dataAll.data;
        const byContact: Record<string, Message[]> = {};
        const lastByContact: Record<string, Message> = {};
        const unread: Record<string, number> = {};

        let currentUid = '';
        try { currentUid = JSON.parse(localStorage.getItem('user') || '{}').id; } catch {}

        allMsgs.forEach((m) => {
          const otherId = m.senderId === currentUid ? m.receiverId : m.senderId;
          if (!byContact[otherId]) byContact[otherId] = [];
          byContact[otherId].push(m);
          if (!lastByContact[otherId] || new Date(m.createdAt) > new Date(lastByContact[otherId].createdAt)) {
            lastByContact[otherId] = m;
          }
          if (m.receiverId === currentUid && !m.isRead) {
            unread[otherId] = (unread[otherId] || 0) + 1;
          }
        });

        setMessagesByContact(byContact);
        setLastMessageByContact(lastByContact);
        setUnreadByContact(unread);

        // Tri de la liste par dernier message
        setAcceptedContacts(prev => {
          const sorted = [...prev].sort((a, b) => {
            const ta = lastByContact[a.id] ? new Date(lastByContact[a.id].createdAt).getTime() : 0;
            const tb = lastByContact[b.id] ? new Date(lastByContact[b.id].createdAt).getTime() : 0;
            return tb - ta;
          });
          return sorted;
        });
      }

      if (contactsList.length > 0 && window.innerWidth >= 768) {
        setSelectedContact(contactsList[0]);
      }
    } catch (err: any) {
      setError(err.message || "Erreur lors du chargement des données.");
    } finally {
      setLoading(false);
    }
  };

  const openConversation = (contact: ContactUser) => {
    setSelectedContact(contact);
    setShowMobileChat(true);
    setUnreadByContact(prev => ({ ...prev, [contact.id]: 0 }));
    socketRef.current?.emit('message-seen', { otherUserId: contact.id });
  };

  const handleSendContactRequest = async (targetUserId: string) => {
    setError('');
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/api/messages/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ receiverId: targetUserId })
      });
      const data = await response.json();
      if (data.success) {
        setAvailableUsers(prev => prev.map(u => u.id === targetUserId ? { ...u, contactStatus: 'PENDING' } : u));
      } else {
        setError(data.message || "Erreur lors de l'envoi.");
      }
    } catch {
      setError("Erreur réseau.");
    }
  };

  // ============ ENVOI INSTANTANÉ VIA SOCKET (optimistic UI) ============
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!newMessage.trim() || !selectedContact?.id || !socketRef.current) return;

    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: Message = {
      id: tempId,
      tempId,
      senderId: currentUserId,
      receiverId: selectedContact.id,
      content: newMessage,
      createdAt: new Date().toISOString(),
      isRead: false,
      pending: true,
    };

    setMessagesByContact(prev => ({
      ...prev,
      [selectedContact.id]: [...(prev[selectedContact.id] || []), optimisticMsg]
    }));
    setLastMessageByContact(prev => ({ ...prev, [selectedContact.id]: optimisticMsg }));
    setAcceptedContacts(prev => {
      const idx = prev.findIndex(c => c.id === selectedContact.id);
      if (idx <= 0) return prev;
      const copy = [...prev];
      const [item] = copy.splice(idx, 1);
      return [item, ...copy];
    });

    socketRef.current.emit('send-message', {
      receiverId: selectedContact.id,
      content: newMessage,
      tempId,
    });

    socketRef.current.emit('stop-typing', { receiverId: selectedContact.id });
    setNewMessage('');
    setShowEmojiPicker(false);
  };

  // Indicateur de frappe : émis pendant que l'utilisateur tape, avec anti-rebond
  const typingTimeoutRef = useRef<any>(null);
  const handleTyping = (value: string) => {
    setNewMessage(value);
    if (!selectedContact?.id || !socketRef.current) return;

    socketRef.current.emit('typing', { receiverId: selectedContact.id });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socketRef.current?.emit('stop-typing', { receiverId: selectedContact.id });
    }, 2000);
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

      const response = await fetch(`${BACKEND_URL}/api/messages/media`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      const data = await response.json();
      if (data.success && data.data) {
        setMessagesByContact(prev => ({
          ...prev,
          [selectedContact.id]: [...(prev[selectedContact.id] || []), data.data]
        }));
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
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };
      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await sendAudioFile(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      recordTimerRef.current = setInterval(() => setRecordingTime(prev => prev + 1), 1000);
    } catch {
      setError("Impossible d'accéder au microphone.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(recordTimerRef.current);
    }
  };

  const sendAudioFile = async (blob: Blob) => {
    if (!selectedContact?.id) return;
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('receiverId', selectedContact.id);
      formData.append('media', blob, `voice-note-${Date.now()}.webm`);

      const response = await fetch(`${BACKEND_URL}/api/messages/media`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      const data = await response.json();
      if (data.success && data.data) {
        setMessagesByContact(prev => ({
          ...prev,
          [selectedContact.id]: [...(prev[selectedContact.id] || []), data.data]
        }));
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

  const startCallTimer = () => {
    setCallDuration(0);
    callDurationRef.current = 0;
    callTimerRef.current = setInterval(() => {
      setCallDuration(prev => {
        const next = prev + 1;
        callDurationRef.current = next;
        return next;
      });
    }, 1000);
  };

  const stopCallTimer = () => {
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }
  };

  const isMediaFile = (content: string) => {
    return content.startsWith('uploads/') || content.includes('voice-note') || /\.(webm|mp3|wav|ogg|mp4|png|jpg|jpeg|pdf|docx)$/i.test(content);
  };

  const renderMessageContent = (content: string) => {
    if (!isMediaFile(content)) {
      return <p className="whitespace-pre-wrap break-words leading-relaxed">{content}</p>;
    }
    const fullUrl = `${BACKEND_URL}/${content}`;
    const isImage = /\.(png|jpg|jpeg|gif|webp)$/i.test(content);
    const isAudio = /\.(webm|mp3|wav|ogg)$/i.test(content) || content.includes('voice-note');

    if (isImage) {
      return (
        <a href={fullUrl} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-xl">
          <img src={fullUrl} alt="Média" className="max-w-[200px] sm:max-w-xs max-h-60 object-cover rounded-xl hover:opacity-95 transition" />
        </a>
      );
    }
    if (isAudio) {
      return (
        <div className="flex items-center gap-2 min-w-[180px] sm:min-w-[220px]">
          <audio src={fullUrl} controls className="w-full h-9" />
        </div>
      );
    }
    return (
      <a href={fullUrl} target="_blank" rel="noopener noreferrer" className="underline font-semibold flex items-center gap-2 py-1">
        <Paperclip className="w-4 h-4" /> Fichier joint
      </a>
    );
  };

  // ============ APPELS WEBRTC (logique conservée, bugs corrigés) ============
  const startCall = async (isVideo: boolean) => {
    if (!selectedContact?.id) return;
    setIsCallingOut(true);
    setCallType(isVideo ? 'video' : 'audio');
    callTypeRef.current = isVideo ? 'video' : 'audio';

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }]
    });
    peerConnectionRef.current = pc;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: isVideo });
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      pc.ontrack = (event) => {
        setIsCallingOut(false);
        setInCall(true);
        startCallTimer();
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = event.streams[0];
      };
      pc.onicecandidate = (event) => {
        if (event.candidate && socketRef.current) {
          socketRef.current.emit('ice-candidate', { to: selectedContact.id, candidate: event.candidate });
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socketRef.current?.emit('call-user', { to: selectedContact.id, offer, from: currentUserId, isVideo });
    } catch {
      setError("Erreur d'accès à la caméra ou au micro pour l'appel.");
      terminateCallState(false);
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
    callTypeRef.current = isVideoCall ? 'video' : 'audio';
    startCallTimer();

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }]
    });
    peerConnectionRef.current = pc;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: isVideoCall });
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      pc.ontrack = (event) => {
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = event.streams[0];
      };
      pc.onicecandidate = (event) => {
        if (event.candidate && socketRef.current) {
          socketRef.current.emit('ice-candidate', { to: incomingCallData.from, candidate: event.candidate });
        }
      };

      await pc.setRemoteDescription(new RTCSessionDescription(incomingCallData.offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socketRef.current?.emit('make-answer', { to: incomingCallData.from, answer });
      setIncomingCallData(null);
    } catch {
      setError("Impossible d'établir l'appel.");
      terminateCallState(false);
    }
  };

  const rejectIncomingCall = () => {
    stopRingtone();
    if (incomingCallData?.from && socketRef.current) {
      socketRef.current.emit('end-call', { to: incomingCallData.from });
    }
    setIncomingCallData(null);
  };

  // Corrigé : lit callDurationRef/callTypeRef/selectedContactRef, toujours à jour
  // même appelé depuis le listener socket enregistré une seule fois.
  const terminateCallState = (sendSummary = true) => {
    stopRingtone();
    stopCallTimer();

    const finalDuration = callDurationRef.current;
    const finalType = callTypeRef.current;
    const contact = selectedContactRef.current;

    if (sendSummary && finalDuration > 0 && contact?.id && socketRef.current) {
      const mins = Math.floor(finalDuration / 60);
      const secs = finalDuration % 60;
      const timeStr = mins > 0 ? `${mins} min ${secs} s` : `${secs} s`;
      const summaryText = `📞 Appel ${finalType === 'video' ? 'vidéo' : 'audio'} terminé (${timeStr})`;

      const tempId = `temp-call-${Date.now()}`;
      socketRef.current.emit('send-message', { receiverId: contact.id, content: summaryText, tempId });
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    setInCall(false);
    setIsCallingOut(false);
    setCallDuration(0);
    callDurationRef.current = 0;
  };

  const endCall = () => {
    if (selectedContact?.id && socketRef.current) {
      socketRef.current.emit('end-call', { to: selectedContact.id });
    }
    terminateCallState(true);
  };

  // ============ Filtrage / recherche ============
  const filteredContacts = useMemo(() => {
    if (!searchQuery.trim()) return acceptedContacts;
    return acceptedContacts.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [acceptedContacts, searchQuery]);

  const filteredAvailableUsers = useMemo(() => {
    const base = availableUsers.filter(u => !acceptedContacts.some(c => c.id === u.id));
    if (!searchQuery.trim()) return base;
    return base.filter(u => u.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [availableUsers, acceptedContacts, searchQuery]);

  const isTypingInSelected = selectedContact ? typingFrom.has(selectedContact.id) : false;

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-neutral-950 text-white' : 'bg-neutral-50 text-neutral-900'}`}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-neutral-500">Chargement des messages...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`h-screen flex flex-col transition-colors duration-300 ${darkMode ? 'bg-neutral-950 text-white' : 'bg-neutral-50 text-neutral-900'}`}>

      {/* HEADER */}
      <header className={`flex-shrink-0 border-b px-4 py-3 flex items-center justify-between ${darkMode ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-neutral-200'}`}>
        <div className="flex items-center gap-2">
          <Link to="/" className={`p-2 rounded-full transition ${darkMode ? 'hover:bg-neutral-800 text-neutral-300' : 'hover:bg-neutral-100 text-neutral-700'}`}>
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <h1 className="text-base font-extrabold">Messages</h1>
        </div>
        <button onClick={() => setDarkMode(!darkMode)} className={`p-2 rounded-full border transition ${darkMode ? 'bg-neutral-950 border-neutral-800 text-yellow-400' : 'bg-white border-neutral-300 text-neutral-800'}`}>
          {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4 text-orange-600" />}
        </button>
      </header>

      {error && (
        <div className="flex-shrink-0 bg-red-950/40 border-b border-red-900 text-red-400 text-[11px] font-semibold px-4 py-2 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError('')}><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {/* CORPS : 2 panneaux */}
      <div className="flex-1 flex overflow-hidden">

        {/* LISTE (panneau gauche) */}
        <div className={`${showMobileChat ? 'hidden' : 'flex'} md:flex flex-col w-full md:w-[360px] flex-shrink-0 border-r ${darkMode ? 'border-neutral-800' : 'border-neutral-200'}`}>

          {/* Recherche */}
          <div className="p-3 flex-shrink-0">
            <div className={`flex items-center gap-2 rounded-full border px-3 py-2 ${darkMode ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-neutral-300'}`}>
              <Search className="w-3.5 h-3.5 text-neutral-500 flex-shrink-0" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher..."
                className="w-full bg-transparent text-xs outline-none placeholder-neutral-500"
              />
            </div>
          </div>

          {/* Onglets Chats / Personnes */}
          <div className={`flex flex-shrink-0 px-3 gap-1 border-b ${darkMode ? 'border-neutral-800' : 'border-neutral-200'}`}>
            <button
              onClick={() => setActiveBottomTab('chats')}
              className={`flex-1 py-2 text-[11px] font-bold uppercase tracking-wide border-b-2 transition ${
                activeBottomTab === 'chats' ? 'border-orange-500 text-orange-500' : 'border-transparent text-neutral-500'
              }`}
            >
              Discussions
            </button>
            <button
              onClick={() => setActiveBottomTab('people')}
              className={`flex-1 py-2 text-[11px] font-bold uppercase tracking-wide border-b-2 transition ${
                activeBottomTab === 'people' ? 'border-orange-500 text-orange-500' : 'border-transparent text-neutral-500'
              }`}
            >
              Contacts
            </button>
          </div>

          {/* Liste défilante */}
          <div className="flex-1 overflow-y-auto">
            {activeBottomTab === 'chats' ? (
              filteredContacts.length === 0 ? (
                <div className="text-center py-10 px-4 text-xs text-neutral-500">Aucune conversation. Ajoutez un contact dans l'onglet "Contacts".</div>
              ) : (
                filteredContacts.map((contact) => {
                  const lastMsg = lastMessageByContact[contact.id];
                  const unread = unreadByContact[contact.id] || 0;
                  const isOnline = onlineUserIds.has(contact.id);
                  const isTypingHere = typingFrom.has(contact.id);
                  const isSelected = selectedContact?.id === contact.id;

                  let previewText = 'Démarrez la conversation';
                  if (isTypingHere) previewText = 'En train d\'écrire...';
                  else if (lastMsg) previewText = isMediaFile(lastMsg.content) ? '📎 Fichier joint' : lastMsg.content;

                  return (
                    <button
                      key={contact.id}
                      onClick={() => openConversation(contact)}
                      className={`w-full flex items-center gap-3 px-3 py-3 transition text-left ${
                        isSelected ? (darkMode ? 'bg-neutral-900' : 'bg-orange-50') : (darkMode ? 'hover:bg-neutral-900/60' : 'hover:bg-neutral-100')
                      }`}
                    >
                      <div className="relative flex-shrink-0">
                        <div className="w-11 h-11 rounded-full bg-orange-600 text-white font-bold text-xs flex items-center justify-center overflow-hidden">
                          {contact.avatar ? (
                            <img src={getAvatarUrl(contact.avatar)} alt={contact.name} className="w-full h-full object-cover" onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }} />
                          ) : getInitials(contact.name)}
                        </div>
                        {isOnline && (
                          <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 ${darkMode ? 'border-neutral-950' : 'border-white'}`} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-sm truncate">{contact.name}</span>
                          {lastMsg && <span className="text-[10px] text-neutral-500 flex-shrink-0">{new Date(lastMsg.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>}
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <span className={`text-[11px] truncate ${isTypingHere ? 'text-orange-500 font-semibold' : 'text-neutral-500'}`}>{previewText}</span>
                          {unread > 0 && (
                            <span className="bg-orange-600 text-white text-[9px] font-extrabold w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0">{unread}</span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })
              )
            ) : (
              filteredAvailableUsers.length === 0 ? (
                <div className="text-center py-10 px-4 text-xs text-neutral-500">Aucun autre utilisateur disponible.</div>
              ) : (
                filteredAvailableUsers.map((u) => (
                  <div key={u.id} className={`flex items-center gap-3 px-3 py-3 ${darkMode ? 'hover:bg-neutral-900/60' : 'hover:bg-neutral-100'}`}>
                    <div className="w-11 h-11 rounded-full bg-neutral-700 text-white font-bold text-xs flex items-center justify-center overflow-hidden flex-shrink-0">
                      {u.avatar ? <img src={getAvatarUrl(u.avatar)} alt={u.name} className="w-full h-full object-cover" /> : getInitials(u.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="font-bold text-sm truncate block">{u.name}</span>
                      <span className="text-[11px] text-neutral-500 truncate block">{u.role === 'SUPER_ADMIN' ? 'Support CBF SOKO' : u.email}</span>
                    </div>
                    {u.contactStatus === 'PENDING' ? (
                      <span className="text-[10px] font-bold text-neutral-500 flex-shrink-0">En attente</span>
                    ) : (
                      <button
                        onClick={() => handleSendContactRequest(u.id)}
                        className="p-2 rounded-full bg-orange-600/10 text-orange-500 hover:bg-orange-600 hover:text-white transition flex-shrink-0"
                        title="Ajouter"
                      >
                        <UserPlus className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))
              )
            )}
          </div>
        </div>

        {/* CHAT (panneau droit) */}
        <div className={`${showMobileChat ? 'flex' : 'hidden'} md:flex flex-col flex-1 min-w-0`}>
          {!selectedContact ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-2 text-neutral-500">
              <UserIcon className="w-10 h-10" />
              <span className="text-xs">Sélectionnez une conversation</span>
            </div>
          ) : (
            <>
              {/* En-tête du chat */}
              <div className={`flex-shrink-0 flex items-center justify-between px-4 py-3 border-b ${darkMode ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-neutral-200'}`}>
                <div className="flex items-center gap-2 min-w-0">
                  <button onClick={() => setShowMobileChat(false)} className="md:hidden p-1.5 rounded-full hover:bg-neutral-800/50 flex-shrink-0">
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <div className="relative flex-shrink-0">
                    <div className="w-9 h-9 rounded-full bg-orange-600 text-white font-bold text-xs flex items-center justify-center overflow-hidden">
                      {selectedContact.avatar ? (
                        <img src={getAvatarUrl(selectedContact.avatar)} alt={selectedContact.name} className="w-full h-full object-cover" />
                      ) : getInitials(selectedContact.name)}
                    </div>
                    {onlineUserIds.has(selectedContact.id) && (
                      <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 ${darkMode ? 'border-neutral-900' : 'border-white'}`} />
                    )}
                  </div>
                  <div className="min-w-0">
                    <span className="font-bold text-sm block truncate">{selectedContact.name}</span>
                    <span className="text-[10px] text-neutral-500">
                      {isTypingInSelected ? <span className="text-orange-500 font-semibold">En train d'écrire...</span> : (onlineUserIds.has(selectedContact.id) ? 'En ligne' : 'Hors ligne')}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => startCall(false)} className={`p-2 rounded-full transition ${darkMode ? 'hover:bg-neutral-800 text-neutral-300' : 'hover:bg-neutral-100 text-neutral-700'}`}>
                    <Phone className="w-4 h-4" />
                  </button>
                  <button onClick={() => startCall(true)} className={`p-2 rounded-full transition ${darkMode ? 'hover:bg-neutral-800 text-neutral-300' : 'hover:bg-neutral-100 text-neutral-700'}`}>
                    <Video className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-3 sm:px-4 py-4 space-y-2">
                {messages.map((msg) => {
                  const isMine = msg.senderId === currentUserId;
                  return (
                    <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[75%] sm:max-w-[60%] px-3.5 py-2 rounded-2xl text-xs sm:text-sm ${
                        isMine
                          ? `bg-orange-600 text-white rounded-br-sm ${msg.pending ? 'opacity-60' : ''}`
                          : `${darkMode ? 'bg-neutral-800 text-white' : 'bg-white text-neutral-900 border border-neutral-200'} rounded-bl-sm`
                      }`}>
                        {renderMessageContent(msg.content)}
                        <div className={`flex items-center gap-1 mt-1 ${isMine ? 'justify-end' : 'justify-start'}`}>
                          <span className={`text-[9px] ${isMine ? 'text-orange-100' : 'text-neutral-500'}`}>
                            {new Date(msg.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {isMine && !msg.pending && (
                            msg.isRead ? <CheckCheck className="w-3 h-3 text-blue-300" /> : <Check className="w-3 h-3 text-orange-100" />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Barre de saisie — flex-shrink-0 sur CHAQUE bouton pour empêcher la disparition du bouton envoyer en mobile */}
              <div className={`flex-shrink-0 border-t px-2 sm:px-3 py-2.5 ${darkMode ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-neutral-200'}`}>
                {isRecording ? (
                  <div className="flex items-center gap-3 px-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
                    <span className="text-xs font-bold flex-1">Enregistrement... {formatTime(recordingTime)}</span>
                    <button onClick={stopRecording} className="p-2.5 rounded-full bg-red-600 text-white flex-shrink-0">
                      <Square className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSendMessage} className="flex items-center gap-1 sm:gap-1.5">
                    <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*,video/*,.pdf,.docx" />
                    <button type="button" onClick={() => fileInputRef.current?.click()} className={`p-2 rounded-full transition flex-shrink-0 ${darkMode ? 'hover:bg-neutral-800 text-neutral-400' : 'hover:bg-neutral-100 text-neutral-600'}`}>
                      <Paperclip className="w-4 h-4" />
                    </button>

                    <div className="relative flex-shrink-0">
                      <button type="button" onClick={() => setShowEmojiPicker(!showEmojiPicker)} className={`p-2 rounded-full transition ${darkMode ? 'hover:bg-neutral-800 text-neutral-400' : 'hover:bg-neutral-100 text-neutral-600'}`}>
                        <Smile className="w-4 h-4" />
                      </button>
                      <AnimatePresence>
                        {showEmojiPicker && (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            className={`absolute bottom-12 left-0 grid grid-cols-4 gap-1 p-2 rounded-xl border shadow-xl z-20 ${darkMode ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-neutral-200'}`}
                          >
                            {COMMON_EMOJIS.map((emoji) => (
                              <button key={emoji} type="button" onClick={() => { setNewMessage(prev => prev + emoji); setShowEmojiPicker(false); }} className="text-lg p-1 hover:bg-neutral-800/30 rounded">
                                {emoji}
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    <input
                      value={newMessage}
                      onChange={(e) => handleTyping(e.target.value)}
                      placeholder="Message..."
                      className={`flex-1 min-w-0 bg-transparent border rounded-full px-3.5 py-2 text-xs sm:text-sm outline-none focus:border-orange-500 transition ${darkMode ? 'border-neutral-800 bg-neutral-950' : 'border-neutral-300 bg-neutral-50'}`}
                    />

                    {newMessage.trim() ? (
                      <button type="submit" className="p-2.5 rounded-full bg-orange-600 hover:bg-orange-700 text-white transition flex-shrink-0">
                        <Send className="w-4 h-4" />
                      </button>
                    ) : (
                      <button type="button" onClick={startRecording} className="p-2.5 rounded-full bg-orange-600 hover:bg-orange-700 text-white transition flex-shrink-0">
                        <Mic className="w-4 h-4" />
                      </button>
                    )}
                  </form>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* MODALE APPEL ENTRANT */}
      <AnimatePresence>
        {incomingCallData && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className={`w-full max-w-xs p-6 rounded-2xl text-center ${darkMode ? 'bg-neutral-900' : 'bg-white'}`}>
              <div className="w-20 h-20 rounded-full bg-orange-600 text-white font-bold text-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
                {getInitials(selectedContact?.name)}
              </div>
              <p className="font-extrabold text-sm mb-1">Appel {incomingCallData.isVideo ? 'vidéo' : 'audio'} entrant</p>
              <p className="text-xs text-neutral-500 mb-6">{selectedContact?.name || 'Contact'}</p>
              <div className="flex items-center justify-center gap-6">
                <button onClick={rejectIncomingCall} className="w-12 h-12 rounded-full bg-red-600 text-white flex items-center justify-center">
                  <PhoneOff className="w-5 h-5" />
                </button>
                <button onClick={acceptIncomingCall} className="w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                  <Phone className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODALE APPEL EN COURS */}
      <AnimatePresence>
        {(inCall || isCallingOut) && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center p-4">
            {callType === 'video' && (
              <video ref={remoteVideoRef} autoPlay playsInline className="absolute inset-0 w-full h-full object-cover" />
            )}
            {callType === 'video' && (
              <video ref={localVideoRef} autoPlay playsInline muted className="absolute bottom-24 right-4 w-24 h-32 rounded-xl object-cover border-2 border-white/30" />
            )}

            <div className="relative z-10 text-center text-white">
              {callType === 'audio' && (
                <div className="w-24 h-24 rounded-full bg-orange-600 text-white font-bold text-3xl flex items-center justify-center mx-auto mb-4">
                  {getInitials(selectedContact?.name)}
                </div>
              )}
              <p className="font-extrabold text-lg mb-1">{selectedContact?.name}</p>
              <p className="text-xs text-neutral-300">{isCallingOut ? 'Appel en cours...' : formatTime(callDuration)}</p>
            </div>

            <button onClick={endCall} className="relative z-10 mt-10 w-14 h-14 rounded-full bg-red-600 text-white flex items-center justify-center">
              <PhoneOff className="w-6 h-6" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}