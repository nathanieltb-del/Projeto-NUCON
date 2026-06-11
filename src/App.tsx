/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, lazy, Suspense } from 'react';
import { DBService } from './services/db';
import { User, UserProfile } from './types';
import Sidebar from './components/Sidebar';
import { Layout } from 'lucide-react';

// Lazy loading das views principais para code-splitting e otimização de performance
const LoginView = lazy(() => import('./components/LoginView'));
const DashboardView = lazy(() => import('./components/DashboardView'));
const ProcessesView = lazy(() => import('./components/ProcessesView'));
const SuppliersView = lazy(() => import('./components/SuppliersView'));
const CostCentersView = lazy(() => import('./components/CostCentersView'));
const UnitsView = lazy(() => import('./components/UnitsView'));
const ImportExportView = lazy(() => import('./components/ImportExportView'));
const AuditView = lazy(() => import('./components/AuditView'));
const UsersView = lazy(() => import('./components/UsersView'));
const DailyControlView = lazy(() => import('./components/DailyControlView'));

// Componente de carregamento elegante e moderno para a transição dos módulos
function LoadingView() {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[400px] w-full gap-4 transition-colors duration-200">
      <div className="relative flex items-center justify-center">
        {/* Spinner animado com gradiente */}
        <div className="h-12 w-12 rounded-full border-4 border-slate-200 dark:border-slate-800 border-t-indigo-600 dark:border-t-indigo-500 animate-spin" />
      </div>
      <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 tracking-wide animate-pulse">
        Carregando módulo...
      </p>
    </div>
  );
}

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // Inicializa o banco de dados local e recupera login persistido
  useEffect(() => {
    DBService.init();
    const user = DBService.getCurrentUser();
    if (user) {
      setCurrentUser(user);
    }
    const t = DBService.getTheme();
    setTheme(t);
  }, []);

  // Atalho do teclado ALT+T para toggle de Tema
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key.toLowerCase() === 't') {
        e.preventDefault();
        handleThemeToggle();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [theme]);

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    setActiveTab('dashboard');
  };

  const handleLogout = () => {
    DBService.setCurrentUser(null);
    setCurrentUser(null);
  };

  const handleThemeToggle = () => {
    const next = DBService.toggleTheme();
    setTheme(next);
  };

  if (!currentUser) {
    return (
      <Suspense fallback={<LoadingView />}>
        <LoginView onLoginSuccess={handleLoginSuccess} />
      </Suspense>
    );
  }

  // Renderização dinâmica baseada no Perfil de Acesso do usuário e Tab Selecionada
  const renderCurrentView = () => {
    const p = currentUser.perfil;
    switch (activeTab) {
      case 'dashboard':
        return <DashboardView />;
      case 'daily-control':
        return <DailyControlView currentUserProfile={p} />;
      case 'processes':
        return <ProcessesView currentUserProfile={p} />;
      case 'suppliers':
        return <SuppliersView currentUserProfile={p} />;
      case 'cost-centers':
        return <CostCentersView currentUserProfile={p} />;
      case 'units':
        return <UnitsView currentUserProfile={p} />;
      case 'import-export':
        if (p === UserProfile.CONSULTA) return <DashboardView />;
        return <ImportExportView />;
      case 'audit':
        if (p !== UserProfile.ADMINISTRADOR) return <DashboardView />;
        return <AuditView />;
      case 'users':
        if (p !== UserProfile.ADMINISTRADOR) return <DashboardView />;
        return <UsersView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className={theme === 'dark' ? 'dark' : ''}>
      <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex transition-colors duration-200 font-sans">
        
        {/* Sidebar */}
        <Sidebar 
          currentUser={currentUser} 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
          onLogout={handleLogout}
          theme={theme}
          onThemeToggle={handleThemeToggle}
        />

        {/* Painel Principal */}
        <main className="flex-1 h-screen overflow-y-auto p-8 lg:p-10">
          
          {/* Alerta de Perfil Restrito no cabeçalho do conteúdo se for Operador ou Consulta */}
          {currentUser.perfil !== UserProfile.ADMINISTRADOR && (
            <div className="mb-4 p-3 bg-amber-50/70 border border-amber-100 dark:bg-amber-950/20 dark:border-amber-900/40 rounded-xl text-xs text-amber-800 dark:text-amber-400 font-medium flex items-center justify-between print:hidden">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <span>Perfil de Acesso Restrito: <strong>{currentUser.perfil}</strong>. Operações administrativas desativadas.</span>
              </div>
              <span className="opacity-60 text-[10px] hidden md:inline">ERP Auditado</span>
            </div>
          )}

          {/* Renderização da View Principal */}
          <Suspense fallback={<LoadingView />}>
            {renderCurrentView()}
          </Suspense>
          
        </main>

      </div>
    </div>
  );
}
