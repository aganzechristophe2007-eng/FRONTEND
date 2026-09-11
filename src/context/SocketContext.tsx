// context/SocketContext.tsx
import React, { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext'; // adapte selon ton contexte d'auth existant

interface IncomingCall {
  from: string;
  offer: any;
  isVideo: boolean;
}

interface SocketContextType {
  socket: Socket | null;
  onlineUsers: string[];
  incomingCall: IncomingCall | null;
  clearIncomingCall: () => void;
  lastMessage: any | null;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  onlineUsers: [],
  incomingCall: null,
  clearIncomingCall: () => {},
  lastMessage: null,
});

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth(); // doit retourner user.id une fois connecté
  const socketRef = useRef<Socket | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [lastMessage, setLastMessage] = useState<any | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    // Connexion unique au serveur socket
 const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:5000', {
  transports: ['websocket'],
});
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('register', user.id);
    });

    // Présence en ligne
    socket.on('online-users', (data: { userIds: string[] }) => {
      setOnlineUsers(data.userIds);
    });
    socket.on('user-online', (data: { userId: string }) => {
      setOnlineUsers(prev => Array.from(new Set([...prev, data.userId])));
    });
    socket.on('user-offline', (data: { userId: string }) => {
      setOnlineUsers(prev => prev.filter(id => id !== data.userId));
    });

    // Message reçu, même si l'utilisateur n'est pas sur la page de chat
    socket.on('new-message', (message: any) => {
      setLastMessage(message);

      // Notification si l'utilisateur n'est pas sur l'onglet actif
      if (document.visibilityState !== 'visible') {
        if (Notification.permission === 'granted') {
          new Notification(message.sender?.name || 'Nouveau message', {
            body: message.content,
            icon: message.sender?.avatar || '/default-avatar.png',
          });
        }
      }
    });

    // Appel entrant, quel que soit l'écran affiché
    socket.on('incoming-call', (data: IncomingCall) => {
      setIncomingCall(data);
    });

    socket.on('disconnect', () => {
      setOnlineUsers([]);
    });

    // Demande la permission de notification une fois
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user?.id]);

  const clearIncomingCall = () => setIncomingCall(null);

  return (
    <SocketContext.Provider
      value={{
        socket: socketRef.current,
        onlineUsers,
        incomingCall,
        clearIncomingCall,
        lastMessage,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};