import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { DashboardModule } from '../../modules/dashboard/DashboardModule';

// Página de Dashboard con renderizado condicional según rol
const DashboardPage: React.FC = () => {
  const { user } = useAuth();

  // Si no hay usuario, muestra loading (el App ya maneja AuthView)
  if (!user) return null;

  return <DashboardModule />;
};

export default DashboardPage;
