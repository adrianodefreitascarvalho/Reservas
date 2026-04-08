import React from 'react';
import { useAuth } from '../hooks/useAuth'; // Corrigido o caminho de importação

interface ReadOnlyGuardProps {
  children: React.ReactNode;
}

export const ReadOnlyGuard: React.FC<ReadOnlyGuardProps> = ({ children }) => {
  const { role } = useAuth();
  
  const isDireccao = role === 'direction';

  if (!isDireccao) {
    return <>{children}</>;
  }

  return (
    <div className="relative group">
      {/* The 'inert' attribute makes the entire tree non-interactive */}
      <div inert={isDireccao || undefined} className="opacity-90 pointer-events-none select-none">
        {children}
      </div>
      <div className="absolute top-2 right-2 bg-yellow-100 text-yellow-800 text-xs font-medium px-2.5 py-0.5 rounded border border-yellow-200">
        Modo de Visualização (Direcção)
      </div>
    </div>
  );
};