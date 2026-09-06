import React, { useState, useEffect } from 'react';
import { User as UserIcon, Save, Camera, Upload, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import heic2any from 'heic2any';

interface UserProfile {
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
}

export default function UpdateProfile() {
  const navigate = useNavigate();
  
  const [profile, setProfile] = useState<UserProfile>({ name: '', email: '', phone: '', avatar: '' });
  const [loading, setLoading] = useState<boolean>(false);
  const [msg, setMsg] = useState<{ text: string; success: boolean } | null>(null);

  // Gestion de l'avatar
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>('');

  const token = localStorage.getItem('token');

  const getAvatarUrl = (path?: string) => {
    if (!path) return '';
    if (path.startsWith('http') || path.startsWith('blob:') || path.startsWith('data:')) {
      return path;
    }
    const cleanPath = path.replace(/\\/g, '/');
    if (!cleanPath.includes('uploads')) {
      const formattedPath = cleanPath.startsWith('/') ? cleanPath : `/${cleanPath}`;
      return `https://cbfsoko-backend.onrender.com/uploads${formattedPath}`;
    }
    const formattedPath = cleanPath.startsWith('/') ? cleanPath : `/${cleanPath}`;
    return `https://cbfsoko-backend.onrender.com${formattedPath}`;
  };

  useEffect(() => {
    const cachedAvatar = localStorage.getItem('offline_avatar');
    const cachedUser = localStorage.getItem('user');

    if (cachedAvatar) setAvatarPreview(cachedAvatar);
    if (cachedUser) {
      try {
        const parsedUser = JSON.parse(cachedUser);
        setProfile({
          name: parsedUser.name || '',
          email: parsedUser.email || '',
          phone: parsedUser.phone || '',
          avatar: parsedUser.avatar || ''
        });
        if (parsedUser.avatar) {
          setAvatarPreview(getAvatarUrl(parsedUser.avatar));
        }
      } catch (e) {
        console.error(e);
      }
    }
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await fetch('https://cbfsoko-backend.onrender.com/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        const userData = data.data || data;
        setProfile({
          name: userData.name || '',
          email: userData.email || '',
          phone: userData.phone || '',
          avatar: userData.avatar || ''
        });
        if (userData.avatar) {
          const fullUrl = getAvatarUrl(userData.avatar);
          setAvatarPreview(fullUrl);
          localStorage.setItem('offline_avatar', fullUrl);
        }
        localStorage.setItem('user', JSON.stringify(userData));
      }
    } catch (err) {
      console.error("Erreur de récupération du profil", err);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    let file = e.target.files?.[0];
    if (!file) return;

    if (file.type === "image/heic" || file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif')) {
      try {
        const convertedBlob = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.8 });
        file = new File(
          [Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob], 
          file.name.replace(/\.[^/.]+$/, "") + ".jpg", 
          { type: "image/jpeg" }
        );
      } catch (error) {
        console.error("Erreur conversion HEIC", error);
      }
    }

    setAvatarFile(file);
    const objectUrl = URL.createObjectURL(file);
    setAvatarPreview(objectUrl);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg(null);

    try {
      const formData = new FormData();
      formData.append('name', profile.name);
      formData.append('phone', profile.phone || '');
      if (avatarFile) {
        formData.append('avatar', avatarFile);
      }

      const response = await fetch('https://cbfsoko-backend.onrender.com/api/auth/update-profile', {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      const data = await response.json();
      if (response.ok) {
        setMsg({ text: 'Profil mis à jour avec succès !', success: true });
        const updatedUser = data.data || data;
        localStorage.setItem('user', JSON.stringify(updatedUser));
        if (updatedUser.avatar) {
          const fullUrl = getAvatarUrl(updatedUser.avatar);
          localStorage.setItem('offline_avatar', fullUrl);
          setAvatarPreview(fullUrl);
        }
        setTimeout(() => navigate('/wallet'), 1000);
      } else {
        setMsg({ text: data.message || 'Erreur lors de la mise à jour.', success: false });
      }
    } catch (err) {
      setMsg({ text: 'Erreur réseau.', success: false });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto p-6 bg-neutral-950 min-h-screen text-neutral-100 flex flex-col justify-center">
      <button
        onClick={() => navigate(-1)} 
        className="flex items-center gap-2 text-sm text-neutral-400 hover:text-white bg-neutral-900 border border-neutral-800 px-4 py-2 rounded-xl mb-6 w-fit transition-all cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Retour</span>
      </button>

      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-8 shadow-2xl">
        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <UserIcon className="w-6 h-6 text-orange-500" /> Modifier mon Profil
        </h2>

        {msg && (
          <div className={`mb-6 p-4 rounded-xl text-xs font-medium ${msg.success ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-red-950 text-red-300 border border-red-800'}`}>
            {msg.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="flex flex-col items-center justify-center gap-3 py-2">
            <label className="relative group cursor-pointer">
              <div className="w-24 h-24 rounded-full bg-neutral-950 border-2 border-orange-500 overflow-hidden flex items-center justify-center shadow-lg transition-transform group-hover:scale-105">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <UserIcon className="w-12 h-12 text-neutral-400" />
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <Upload className="w-6 h-6 text-white" />
                </div>
              </div>
              <input type="file" accept="image/*,.heic,.heif" onChange={handleAvatarChange} className="hidden" />
            </label>
            <span className="text-xs text-orange-400 font-semibold flex items-center gap-1.5">
              <Camera className="w-3.5 h-3.5" /> Changer la photo de profil
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-400 mb-1.5">Nom complet</label>
            <input 
              type="text"
              value={profile.name}
              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              required
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3.5 text-sm text-white focus:outline-none focus:border-orange-500 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-400 mb-1.5">E-mail</label>
            <input 
              type="email"
              value={profile.email}
              disabled
              className="w-full bg-neutral-950/40 border border-neutral-800/60 rounded-xl p-3.5 text-sm text-neutral-500 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-400 mb-1.5">Téléphone</label>
            <input 
              type="text"
              value={profile.phone || ''}
              onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3.5 text-sm text-white focus:outline-none focus:border-orange-500 transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-600 hover:bg-orange-500 text-white font-semibold py-3.5 rounded-xl text-sm transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-orange-900/20 mt-4"
          >
            <Save className="w-4 h-4" />
            {loading ? 'Enregistrement...' : 'Enregistrer les modifications'}
          </button>
        </form>
      </div>
    </div>
  );
}