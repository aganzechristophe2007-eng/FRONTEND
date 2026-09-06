import React from 'react';
import { Outlet } from 'react-router-dom';

export default function MainLayout() {
  return (
    <div className="min-h-screen bg-neutral-900 text-white">
      <header className="p-4 bg-neutral-800 border-b border-neutral-700 flex justify-between items-center">
        <h1 className="text-xl font-bold text-orange-500">CBFSOKO</h1>
        <nav className="flex gap-4 text-sm">
          <a href="/" className="hover:text-orange-400">Accueil</a>
          <a href="/products" className="hover:text-orange-400">Produits</a>
          <a href="/favorites" className="hover:text-orange-400">Favoris</a>
          <a href="/orders" className="hover:text-orange-400">Commandes</a>
          <a href="/messages" className="hover:text-orange-400">Messages</a>
          <a href="/notifications" className="hover:text-orange-400">Notifications</a>
        </nav>
      </header>

      <main className="p-6">
        <Outlet />
      </main>
    </div>
  );
}