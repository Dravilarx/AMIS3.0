import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import DashboardDirector from '@/modules/dashboard/DashboardDirector';
import DashboardColaborador from '@/modules/dashboard/DashboardColaborador';

// Página de Dashboard con renderizado condicional según rol
const DashboardPage: React.FC = () => {
  const { user } = useAuth();

  // Si no hay usuario, muestra loading (el App ya maneja AuthView)
  if (!user) return null;

  const role = user?.app_role?.toLowerCase();

  // Roles con acceso completo al Dashboard de Director
  const directorRoles = ['admin', 'super_admin', 'med_chief'];

  if (directorRoles.includes(role)) {
    return <DashboardDirector />;
  }

  // Cualquier otro rol accede al Dashboard colaborador
  return <DashboardColaborador />;
};

export default DashboardPage;
