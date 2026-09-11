import React from 'react';
import { useSocket } from '../context/SocketContext';
import { useNavigate } from 'react-router-dom';

export const IncomingCallModal: React.FC = () => {
  const { incomingCall, clearIncomingCall, socket } = useSocket();
  const navigate = useNavigate();

  if (!incomingCall) return null;

  const handleAccept = () => {
    navigate(`/call/${incomingCall.from}`, {
      state: { offer: incomingCall.offer, isVideo: incomingCall.isVideo }
    });
    clearIncomingCall();
  };

  const handleDecline = () => {
    socket?.emit('end-call', { to: incomingCall.from });
    clearIncomingCall();
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 20,
        right: 20,
        zIndex: 9999,
        background: '#222',
        color: '#fff',
        padding: 16,
        borderRadius: 8,
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
      }}
    >
      <p>{incomingCall.isVideo ? '📹 Appel vidéo entrant' : '📞 Appel entrant'}</p>
      <button onClick={handleAccept} style={{ marginRight: 8 }}>Accepter</button>
      <button onClick={handleDecline}>Refuser</button>
    </div>
  );
};