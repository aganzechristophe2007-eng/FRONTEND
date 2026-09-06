import React from 'react';
import { Navigate } from 'react-router-dom';
import { authService } from '../services/auth.services';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[]; // Liste précise des rôles autorisés pour accéder à cette route
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const token = localStorage.getItem('token');
  const user = authService.getCurrentUser();

  // 1. Vérification de l'authentification de base
  if (!token || !user) {
    return <Navigate to="/Login" replace />;
  }

  // 2. Vérification granulaire par rôle si la route l'exige
  if (allowedRoles && allowedRoles.length > 0) {
    const userRole = user.role ? user.role.toUpperCase() : '';
    const isAuthorized = allowedRoles.map(r => r.toUpperCase()).includes(userRole);

    if (!isAuthorized) {
      console.warn(`Sécurité CBFSOKO : Accès bloqué pour le rôle [${userRole}].`);
      return <Navigate to="/" replace />;
    }
  }

  return <>{children}</>;
}