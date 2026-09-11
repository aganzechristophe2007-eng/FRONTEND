import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Search, ShoppingBag, MessageSquare, User as UserIcon } from 'lucide-react';

interface MobileNavProps {
  user?: any;
  unreadMessagesCount?: number;
  handleProtectedAction: (path: string) => void;
  getImageUrl: (img?: string) => string;
}

export default function MobileNav({ user, unreadMessagesCount = 0, handleProtectedAction, getImageUrl }: MobileNavProps) {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-neutral-900 border-t border-neutral-800 flex items-center justify-around py-2 shadow-2xl">
      <button 
        onClick={() => navigate('/')}
        className={`flex flex-col items-center justify-center flex-1 py-1 transition ${location.pathname === '/' ? 'text-orange-500 font-bold' : 'text-neutral-400 hover:text-orange-500'}`}
      >
        <Search className="w-5 h-5 mb-0.5" />
        <span className="text-[10px]">Accueil</span>
      </button>

      <button 
        onClick={() => handleProtectedAction('/orders')}
        className={`flex flex-col items-center justify-center flex-1 py-1 transition ${location.pathname.includes('/orders') ? 'text-orange-500 font-bold' : 'text-neutral-400 hover:text-orange-500'}`}
      >
        <ShoppingBag className="w-5 h-5 mb-0.5" />
        <span className="text-[10px]">Commandes</span>
      </button>

      <button 
        onClick={() => handleProtectedAction('/messages')}
        className={`flex flex-col items-center justify-center flex-1 py-1 relative bg-transparent border-none cursor-pointer text-neutral-400 transition ${location.pathname.includes('/messages') ? 'text-orange-500 font-bold' : 'hover:text-orange-500'}`}
      >
        <MessageSquare className="w-5 h-5 mb-0.5" />
        <span className="text-[10px]">Messages</span>
        {unreadMessagesCount > 0 && (
          <span className="absolute top-0 right-3 bg-red-600 text-white text-[9px] font-bold w-4 h-4 flex items-center justify-center rounded-full animate-pulse">
            {unreadMessagesCount}
          </span>
        )}
      </button>

      <button 
        onClick={() => handleProtectedAction('/wallet')}
        className={`flex flex-col items-center justify-center flex-1 py-1 relative bg-transparent border-none cursor-pointer text-neutral-400 transition ${location.pathname.includes('/wallet') || location.pathname.includes('/profile') ? 'text-orange-500 font-bold' : 'hover:text-orange-500'}`}
      >
        {user?.avatar || user?.profileImage ? (
          <div className="w-5 h-5 mb-0.5 rounded-full overflow-hidden border border-orange-500/50">
            <img 
              src={getImageUrl(user.avatar || user.profileImage)} 
              alt="Profil" 
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <UserIcon className="w-5 h-5 mb-0.5" />
        )}
        <span className="text-[10px]">Profil</span>
      </button>
    </div>
  );
}