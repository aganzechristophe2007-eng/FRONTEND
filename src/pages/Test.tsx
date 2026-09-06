import React, { useState } from 'react';

export default function TestPage() {
  const [text, setText] = useState('');
  const [message, setMessage] = useState('');

  const handleTestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('Envoi en cours...');
    try {
      const res = await fetch('https://cbfsoko-backend.onrender.com/api/test/public-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          content: text,
          sellerId: '93a60c9a-0793-40e6-9186-a62bab5a9d3d',
          categoryId: 'ae189bd0-3ade-42c0-8086-ca43f98dc326'
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage('Succès ! Produit enregistré en base de données.');
      } else {
        setMessage('Erreur : ' + (data.error || data.message));
      }
    } catch (err: any) {
      setMessage('Erreur réseau : ' + err.message);
    }
  };

  return (
    <div style={{ padding: '50px', color: 'white' }}>
      <h2>Page de Test de Connexion Backend & DB</h2>
      <form onSubmit={handleTestSubmit}>
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Nom du produit de test..."
          style={{ padding: '10px', marginRight: '10px', width: '300px', color: 'black' }}
          required
        />
        <button type="submit" style={{ padding: '10px 20px', background: '#f97316', color: 'white', border: 'none', cursor: 'pointer' }}>
          Tester l'insertion en BD
        </button>
      </form>
      {message && <p style={{ marginTop: '20px' }}>{message}</p>}
    </div>
  );
}