// src/components/ProductCard.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MapPin, Image as ImageIcon } from 'lucide-react';

const getImageUrl = (img?: string) => {
  if (!img) return 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=500&q=80';
  if (img.startsWith('http://') || img.startsWith('https://') || img.startsWith('blob:') || img.startsWith('data:')) {
    return img;
  }
  const cleanPath = img.replace(/\\/g, '/').replace(/^\/+/, '');
  if (cleanPath.startsWith('uploads/')) {
    return `https://cbfsoko-backend.onrender.com/${cleanPath}`;
  }
  return `https://cbfsoko-backend.onrender.com/uploads/${cleanPath}`;
};

interface ProductCardProps {
  product: any;
  index: number;
  darkMode?: boolean;
}

export default function ProductCard({ product, index, darkMode = true }: ProductCardProps) {
  const navigate = useNavigate();
  
  const productId = product.id || product._id;
  const prodTitle = product.title || 'Article';
  const priceUSDValue = product.priceUSD || 0;
  const priceCDFValue = product.priceCDF || 0;
  
  const priceUSDStr = priceUSDValue > 0 ? `${priceUSDValue} $` : 'Sur demande';
  const priceCDFStr = priceCDFValue > 0 ? `${priceCDFValue.toLocaleString()} CDF` : '';
  const prodCategory = typeof product.category === 'object' && product.category !== null ? product.category.name : 'Général';
  
  const imagesList = Array.isArray(product.images) ? product.images : [];
  const rawImage = imagesList.length > 0 ? imagesList[0] : undefined;
  const prodImage = getImageUrl(rawImage);
  const photosCount = imagesList.length;
  const posterName = product.seller?.name || 'Vendeur';

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.3, delay: index * 0.02 }}
      onClick={() => navigate(`/products/${productId}`)}
      className={`rounded-lg sm:rounded-2xl overflow-hidden border group shadow-sm transition flex flex-col justify-between cursor-pointer hover:border-orange-500 ${
        darkMode ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-neutral-200'
      }`}
    >
      <div>
        {/* Clic direct sur l'image vers /products/:id */}
        <div className="aspect-square w-full overflow-hidden bg-neutral-950 relative">
          <img 
            src={prodImage} 
            alt={prodTitle} 
            className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=500&q=80';
            }}
          />
          <span className="absolute top-1 left-1 sm:top-2 sm:left-2 bg-black/80 backdrop-blur-md text-[8px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded text-orange-400 border border-neutral-700 truncate max-w-[70px] sm:max-w-[100px]">
            {prodCategory}
          </span>

          {photosCount > 0 && (
            <span className="absolute bottom-1 right-1 bg-black/75 backdrop-blur-md text-white text-[8px] sm:text-[10px] font-bold px-1 py-0.5 rounded flex items-center gap-0.5 border border-neutral-700/60 shadow">
              <ImageIcon className="w-2.5 h-2.5 text-orange-400" />
              <span>{photosCount}</span>
            </span>
          )}
        </div>

        <div className="p-1.5 sm:p-4">
          <div className="flex justify-between items-center text-[8px] sm:text-[11px] text-neutral-400 mb-0.5">
            <span className="truncate max-w-[50px] sm:max-w-[120px]" title={posterName}><strong>{posterName}</strong></span>
            <span className="flex items-center gap-0.5"><MapPin className="w-2 h-2 text-orange-500" /> Bukavu</span>
          </div>

          <h3 className="font-bold text-[9px] sm:text-sm mb-1 truncate group-hover:text-orange-500 transition leading-tight">{prodTitle}</h3>

          <div>
            <div className="text-orange-500 font-black text-[9px] sm:text-sm leading-none">
              {priceUSDStr}
            </div>
            {priceCDFStr && (
              <div className="text-[7px] sm:text-[11px] text-neutral-400 font-medium truncate mt-0.5">
                ≈ {priceCDFStr}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="p-1.5 sm:p-4 pt-0">
        <button 
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/products/${productId}`);
          }}
          className="w-full py-1 sm:py-2 bg-orange-600/10 hover:bg-orange-600 hover:text-white text-orange-500 font-bold text-[8px] sm:text-xs rounded-md sm:rounded-xl transition border border-orange-500/20 flex items-center justify-center gap-0.5 cursor-pointer"
        >
          <span>Détails</span> <span className="hidden sm:inline">({photosCount} 📷)</span>
        </button>
      </div>
    </motion.div>
  );
}