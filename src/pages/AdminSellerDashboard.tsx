import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Package, CheckCircle, Clock, Truck, AlertCircle, ArrowLeft, LogOut, Send, Inbox, UserCheck, Eye } from 'lucide-react';

interface OrderItem {
  id: string;
  quantity: number;
  product?: {
    name?: string;
    title?: string;
    priceUSD: number;
  };
}

interface Order {
  id: string;
  status: string;
  totalUSD: number;
  totalCDF: number;
  createdAt: string;
  buyer?: {
    name: string;
    email: string;
  };
  orderItems: OrderItem[];
}

interface ProductItem {
  id: string;
  title?: string;
  name?: string;
  category?: { name: string } | string;
  priceUSD: number;
  type?: string;
  seller?: {
    id: string;
    name: string;
    email: string;
  };
  userId?: string;
  sales?: any[];
  orders?: any[];
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

interface ContactUser {
  id: string;
  name: string;
  email: string;
  role?: string;
}

export default function AdminSellerDashboard() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [sellerName, setSellerName] = useState('Gestionnaire');
  const [currentUserId, setCurrentUserId] = useState('');
  
  const [activeTab, setActiveTab] = useState<'orders' | 'products' | 'dm'>('orders');
  const [hasNewMessage, setHasNewMessage] = useState(false);
  
  const [contacts, setContacts] = useState<ContactUser[]>([]);
  const [selectedContact, setSelectedContact] = useState<ContactUser | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');

    if (!token || !userStr) {
      navigate('/login?redirect=/admin/seller-dashboard');
      return;
    }

    try {
      const user = JSON.parse(userStr);
      if (user.id) setCurrentUserId(user.id);
      if (user.name) setSellerName(user.name);
    } catch {
      // Ignorer l'erreur de parsing
    }

    fetchInitialData(token);
  }, [navigate]);

  useEffect(() => {
    if (!selectedContact?.id) return;

    const interval = setInterval(() => {
      const currentToken = localStorage.getItem('token');
      if (currentToken) {
        fetchMessages(currentToken, selectedContact.id, true);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [selectedContact?.id, activeTab]);

  useEffect(() => {
    if (activeTab === 'dm') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeTab]);

  const fetchInitialData = async (token: string) => {
    setLoading(true);
    try {
      await Promise.all([
        fetchAssignedOrders(token),
        fetchProductsAndSales(token),
        fetchContacts(token)
      ]);
    } catch {
      setError("Erreur lors de la récupération des données.");
    } finally {
      setLoading(false);
    }
  };

  const fetchAssignedOrders = async (token: string) => {
    try {
      const response = await fetch('https://cbfsoko-backend.onrender.com/api/orders', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      let extractedOrders = data.success ? (data.data || []) : (Array.isArray(data) ? data : []);

      if (extractedOrders.length === 0) {
        const resAdminOrders = await fetch('https://cbfsoko-backend.onrender.com/api/admin/orders', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const adminData = await resAdminOrders.json();
        extractedOrders = adminData.success ? (adminData.data || []) : (Array.isArray(adminData) ? adminData : []);
      }

      setOrders(extractedOrders);
    } catch {
      setOrders([]);
    }
  };

  const fetchProductsAndSales = async (token: string) => {
    try {
      const response = await fetch('https://cbfsoko-backend.onrender.com/api/products', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      const list = Array.isArray(data) ? data : (data.data || data.products || []);
      setProducts(list);
    } catch {
      setProducts([]);
    }
  };

  const fetchContacts = async (token: string) => {
    try {
      const response = await fetch('https://cbfsoko-backend.onrender.com/api/admin/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      const userList = Array.isArray(data) ? data : (data.data || data.users || []);
      const filtered = userList.filter((u: ContactUser) => u.id !== currentUserId);
      setContacts(filtered);
      if (filtered.length > 0 && !selectedContact) {
        setSelectedContact(filtered[0]);
        fetchMessages(token, filtered[0].id, false);
      }
    } catch {
      try {
        const resFin = await fetch('https://cbfsoko-backend.onrender.com/api/admin/finances-user', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const finData = await resFin.json();
        if (finData.success && finData.data) {
          setContacts([finData.data]);
          setSelectedContact(finData.data);
          fetchMessages(token, finData.data.id, false);
        }
      } catch {
        // Erreur ignorée
      }
    }
  };

  const fetchMessages = async (_token: string, otherId: string, checkNew: boolean) => {
    try {
      const currentToken = localStorage.getItem('token');
      if (!currentToken) return;

      const response = await fetch(`https://cbfsoko-backend.onrender.com/api/messages/${otherId}`, {
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentToken}`
        }
      });
      const data = await response.json();
      if (data.success && Array.isArray(data.data)) {
        setMessages(prev => {
          const latestMsg = data.data[data.data.length - 1];
          const isFromOther = latestMsg && latestMsg.senderId !== currentUserId;

          if (data.data.length > prev.length && checkNew && activeTab !== 'dm' && isFromOther) {
            setHasNewMessage(true);
          }
          if (!checkNew && activeTab !== 'dm' && isFromOther) {
            setHasNewMessage(true);
          }
          return data.data;
        });
      }
    } catch {
      // Gestion silencieuse
    }
  };

  const handleSelectContact = (contact: ContactUser) => {
    setSelectedContact(contact);
    setActiveTab('dm');
    setHasNewMessage(false);
    const token = localStorage.getItem('token');
    if (token) {
      fetchMessages(token, contact.id, false);
    }
  };

  const handleContactSeller = async (seller: { id: string; name: string; email: string } | undefined, productTitle?: string) => {
    if (!seller || !seller.id) {
      alert("Impossible de contacter le propriétaire de cet article.");
      return;
    }

    let targetContact = contacts.find(c => c.id === seller.id);
    if (!targetContact) {
      targetContact = { id: seller.id, name: seller.name, email: seller.email };
      setContacts(prev => [...prev, targetContact!]);
    }

    setSelectedContact(targetContact);
    setActiveTab('dm');

    const defaultContent = `Bonjour, je vous contacte depuis l'espace CBF concernant votre article : "${productTitle || 'Produit'}".`;

    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch('https://cbfsoko-backend.onrender.com/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          receiverId: targetContact.id,
          content: defaultContent
        })
      });

      const data = await response.json();
      if (data.success && data.data) {
        setMessages(prev => [...prev, data.data]);
        fetchMessages(token, targetContact.id, false);
      } else {
        setNewMessage(defaultContent);
      }
    } catch {
      setNewMessage(defaultContent);
    }
  };

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    setError('');
    setSuccessMessage('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`https://cbfsoko-backend.onrender.com/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      const data = await response.json();
      if (data.success) {
        setSuccessMessage("Statut de la commande mis à jour avec succès.");
        setOrders(orders.map(order => order.id === orderId ? { ...order, status: newStatus } : order));
      } else {
        setError(data.message || "Impossible de mettre à jour le statut.");
      }
    } catch (err: any) {
      setError(err.message || "Erreur réseau.");
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!newMessage.trim()) return;
    if (!selectedContact?.id) {
      setError("Erreur : Aucun destinataire sélectionné.");
      return;
    }

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

      const data = await response.json();
      if (data.success && data.data) {
        setMessages(prev => [...prev, data.data]);
        setNewMessage('');
      } else {
        setError(data.message || "Erreur lors de l'envoi du message.");
      }
    } catch {
      setError("Erreur réseau lors de l'envoi du message.");
    }
  };

  const handleTabChange = (tab: 'orders' | 'products' | 'dm') => {
    setActiveTab(tab);
    if (tab === 'dm') {
      setHasNewMessage(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center">
        <div className="flex items-center gap-3 text-orange-500 font-semibold text-xs">
          <span className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
          Chargement du tableau de bord logistique...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex flex-col">
      <header className="border-b border-neutral-800 bg-neutral-900/90 backdrop-blur-md px-4 lg:px-8 py-3 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="w-9 h-9 bg-orange-600 rounded-xl flex items-center justify-center text-white font-black text-sm shadow-lg shadow-orange-600/30">
                CBF
              </div>
              <div>
                <span className="font-extrabold text-sm tracking-tight block leading-none">CBFSOKO</span>
                <span className="text-[10px] text-orange-500 font-bold tracking-widest uppercase">Espace Logistique & Annonces</span>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <Link to="/" className="text-xs text-neutral-400 hover:text-white flex items-center gap-1.5 transition">
              <ArrowLeft className="w-4 h-4" /> Accueil
            </Link>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 bg-red-600/10 text-red-400 hover:bg-red-600 hover:text-white px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer border border-red-500/20"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Déconnexion</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto p-4 sm:p-8 flex-1 w-full flex flex-col">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
              <Package className="w-6 h-6 text-orange-500" />
              Tableau de Bord - {sellerName}
            </h1>
            <p className="text-neutral-400 text-xs sm:text-sm mt-1">
              Suivi des commandes, consultation des produits et ventes intégrées.
            </p>
          </div>

          <div className="flex bg-neutral-900 p-1.5 rounded-2xl border border-neutral-800 self-start">
            <button
              onClick={() => handleTabChange('orders')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === 'orders' ? 'bg-orange-600 text-white shadow-md shadow-orange-600/30' : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Package className="w-4 h-4" /> Commandes ({orders.length})
            </button>
            <button
              onClick={() => handleTabChange('products')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === 'products' ? 'bg-orange-600 text-white shadow-md shadow-orange-600/30' : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Eye className="w-4 h-4" /> Produits & Ventes ({products.length})
            </button>
            <button
              onClick={() => handleTabChange('dm')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer relative ${
                activeTab === 'dm' ? 'bg-orange-600 text-white shadow-md shadow-orange-600/30' : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Inbox className="w-4 h-4" /> Messagerie (DM)
              {hasNewMessage && (
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 absolute top-2 right-2 animate-ping" />
              )}
              {hasNewMessage && (
                <span className="w-2 h-2 rounded-full bg-red-500 absolute top-2.5 right-2.5" />
              )}
            </button>
          </div>
        </div>

        {successMessage && (
          <div className="mb-6 p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-xs flex items-center gap-3">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-3">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {activeTab === 'orders' && (
          <div>
            {orders.length === 0 ? (
              <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-12 text-center text-neutral-400 text-xs">
                Aucune commande enregistrée pour le moment.
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map((order) => (
                  <div key={order.id} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow-xl transition">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-neutral-800 pb-4 mb-4 gap-2">
                      <div>
                        <span className="text-xs font-semibold text-neutral-400">Commande ID :</span>
                        <span className="text-xs font-mono text-white ml-1.5 font-bold">{order.id}</span>
                        <div className="text-[11px] text-neutral-500 mt-0.5">
                          Date : {new Date(order.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      <div>
                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          order.status === 'DELIVERED' 
                            ? 'bg-green-500/10 text-green-400 border border-green-500/20' 
                            : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                        }`}>
                          {order.status}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5 text-xs">
                      <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800">
                        <span className="text-neutral-500 block mb-1">Client (Acheteur)</span>
                        <span className="font-semibold text-white">{order.buyer?.name || 'Inconnu'}</span>
                        <span className="text-neutral-400 block text-[11px]">{order.buyer?.email}</span>
                      </div>
                      <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800">
                        <span className="text-neutral-500 block mb-1">Montant Total</span>
                        <span className="font-bold text-orange-500 text-sm">{order.totalUSD || 0} $</span>
                        <span className="text-neutral-400 ml-1 text-[11px]">({order.totalCDF?.toLocaleString() || 0} CDF)</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-neutral-800/60">
                      <span className="text-xs font-semibold text-neutral-400 mr-2">Changer le statut :</span>
                      <button 
                        onClick={() => handleUpdateStatus(order.id, 'PROCESSING')}
                        className="bg-blue-600/25 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/30 text-xs font-semibold px-3 py-2 rounded-xl transition cursor-pointer flex items-center gap-1.5"
                      >
                        <Clock className="w-3.5 h-3.5" /> En Cours
                      </button>
                      <button 
                        onClick={() => handleUpdateStatus(order.id, 'SHIPPED')}
                        className="bg-orange-600/25 hover:bg-orange-600 text-orange-300 hover:text-white border border-orange-500/30 text-xs font-semibold px-3 py-2 rounded-xl transition cursor-pointer flex items-center gap-1.5"
                      >
                        <Truck className="w-3.5 h-3.5" /> Expédié
                      </button>
                      <button 
                        onClick={() => handleUpdateStatus(order.id, 'DELIVERED')}
                        className="bg-green-600/25 hover:bg-green-600 text-green-300 hover:text-white border border-green-500/30 text-xs font-semibold px-3 py-2 rounded-xl transition cursor-pointer flex items-center gap-1.5"
                      >
                        <CheckCircle className="w-3.5 h-3.5" /> Livré
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'products' && (
          <div>
            {products.length === 0 ? (
              <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-12 text-center text-neutral-400 text-xs">
                Aucun produit ou vente disponible dans la base de données.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {products.map((product) => {
                  const title = product.title || product.name || 'Article sans titre';
                  const categoryName = typeof product.category === 'object' && product.category !== null ? product.category.name : (product.category || 'Général');
                  
                  return (
                    <div key={product.id} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start gap-3 mb-3">
                          <div>
                            <span className="text-[10px] bg-neutral-800 text-neutral-300 px-2 py-0.5 rounded font-bold uppercase">{categoryName}</span>
                            <h3 className="text-sm font-bold mt-1 text-white">{title}</h3>
                          </div>
                          <span className="text-sm font-black text-orange-500 whitespace-nowrap">{product.priceUSD || 0} $</span>
                        </div>
                        
                        {product.sales && product.sales.length > 0 && (
                          <div className="mb-3 p-2.5 bg-orange-500/10 border border-orange-500/20 rounded-xl text-xs text-orange-300">
                            <span className="font-bold block mb-1">Ventes associées ({product.sales.length}) :</span>
                            {product.sales.map((sale: any, idx: number) => (
                              <div key={idx} className="text-[11px] text-neutral-300">
                                - Qté: {sale.quantity || 1} | Total: {sale.totalUSD || product.priceUSD} $
                              </div>
                            ))}
                          </div>
                        )}

                        {product.seller && (
                          <div className="text-[11px] text-neutral-400 mb-4 bg-neutral-950 p-2.5 rounded-xl border border-neutral-800/80">
                            <span className="block text-neutral-500">Posté par :</span>
                            <span className="font-semibold text-neutral-300">{product.seller.name} ({product.seller.email})</span>
                          </div>
                        )}
                      </div>

                      <div className="pt-3 border-t border-neutral-800 flex items-center justify-between">
                        <span className="text-[10px] text-neutral-500 uppercase tracking-wider font-semibold">Gestion produit</span>
                        <button
                          onClick={() => handleContactSeller(product.seller, title)}
                          className="bg-orange-600/20 hover:bg-orange-600 text-orange-400 hover:text-white border border-orange-500/30 text-xs font-bold px-3.5 py-2 rounded-xl transition cursor-pointer flex items-center gap-1.5"
                        >
                          <Send className="w-3.5 h-3.5" /> Contacter l'auteur
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'dm' && (
          <div className="grid grid-cols-1 md:grid-cols-4 bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-xl h-[600px] flex-1">
            <div className="md:col-span-1 border-r border-neutral-800 bg-neutral-950/50 p-4 flex flex-col overflow-y-auto">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-neutral-400 mb-3 flex items-center gap-1.5">
                <Inbox className="w-3.5 h-3.5 text-orange-500" /> Contacts & Vendeurs
              </h3>
              <div className="space-y-1.5">
                {contacts.length === 0 ? (
                  <p className="text-neutral-500 text-xs text-center py-4">Aucun contact.</p>
                ) : (
                  contacts.map((contact) => {
                    const isSelected = selectedContact?.id === contact.id;
                    return (
                      <button
                        key={contact.id}
                        onClick={() => handleSelectContact(contact)}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition cursor-pointer ${
                          isSelected 
                            ? 'bg-orange-600/15 border border-orange-500/30 text-white font-bold' 
                            : 'hover:bg-neutral-800/40 text-neutral-400 border border-transparent text-xs'
                        }`}
                      >
                        <div className="w-8 h-8 rounded-full bg-orange-600 flex items-center justify-center text-white font-bold flex-shrink-0 text-xs">
                          {contact.name ? contact.name.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div className="truncate">
                          <span className="block truncate text-xs">{contact.name}</span>
                          <span className="text-[10px] text-neutral-500 truncate block">{contact.email}</span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            <div className="md:col-span-3 flex flex-col h-full bg-neutral-900 overflow-hidden">
              <div className="p-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-900/50">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-orange-500" />
                  <span className="text-xs font-bold">{selectedContact ? `${selectedContact.name} (${selectedContact.email})` : 'Sélectionnez un contact'}</span>
                </div>
                <span className="text-[10px] bg-orange-500/10 text-orange-400 border border-orange-500/20 px-2.5 py-1 rounded-full font-bold">Messagerie CBF Active</span>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {!selectedContact ? (
                  <div className="text-center text-neutral-500 text-xs py-32">
                    Veuillez sélectionner un contact dans la liste de gauche.
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center text-neutral-500 text-xs py-32">
                    Aucun message avec cet interlocuteur.
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isMe = msg.senderId === currentUserId;
                    return (
                      <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                        <span className="text-[10px] text-neutral-500 mb-1 px-1">
                          {isMe ? 'CBF' : (selectedContact?.name || 'Interlocuteur')} • {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <div className={`p-3 rounded-2xl text-xs max-w-md ${
                          isMe ? 'bg-orange-600 text-white rounded-tr-none shadow-lg' : 'bg-neutral-800 text-neutral-200 border border-neutral-700/60 rounded-tl-none'
                        }`}>
                          {msg.content}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              <form onSubmit={handleSendMessage} className="p-4 border-t border-neutral-800 bg-neutral-950/30 flex items-center gap-2">
                <input 
                  type="text" 
                  placeholder="Écrivez votre message..." 
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  disabled={!selectedContact}
                  className="flex-1 bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-orange-500 transition disabled:opacity-50"
                />
                <button 
                  type="submit" 
                  disabled={!selectedContact}
                  className="bg-orange-600 hover:bg-orange-500 text-white px-5 py-3 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 shadow-lg shadow-orange-600/30 disabled:opacity-50"
                >
                  <Send className="w-4 h-4" /> Envoyer
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}