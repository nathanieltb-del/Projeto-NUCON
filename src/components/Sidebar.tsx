/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { User, UserProfile } from '../types';
import { 
  Building2, FileText, LayoutDashboard, Users, 
  Settings, FolderTree, LogOut, Sun, Moon, ShieldAlert, FileSpreadsheet,
  ChevronLeft, ChevronRight, ClipboardList
} from 'lucide-react';

interface SidebarProps {
  currentUser: User;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
  theme: 'light' | 'dark';
  onThemeToggle: () => void;
}

export default function Sidebar({ 
  currentUser, 
  activeTab, 
  setActiveTab, 
  onLogout, 
  theme, 
  onThemeToggle 
}: SidebarProps) {
  
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('sidebar_collapsed');
      return saved === 'true';
    } catch {
      return false;
    }
  });

  const toggleCollapse = (value: boolean) => {
    setIsCollapsed(value);
    try {
      localStorage.setItem('sidebar_collapsed', String(value));
    } catch (e) {
      // ignore
    }
  };

  const menuItems = [
    { id: 'dashboard', label: 'Painel Geral', icon: LayoutDashboard, roles: [UserProfile.ADMINISTRADOR, UserProfile.OPERADOR, UserProfile.CONSULTA] },
    { id: 'daily-control', label: 'Controle Diário', icon: ClipboardList, roles: [UserProfile.ADMINISTRADOR, UserProfile.OPERADOR, UserProfile.CONSULTA] },
    { id: 'processes', label: 'Processos Contábeis', icon: FileText, roles: [UserProfile.ADMINISTRADOR, UserProfile.OPERADOR, UserProfile.CONSULTA] },
    { id: 'suppliers', label: 'Fornecedores', icon: Building2, roles: [UserProfile.ADMINISTRADOR, UserProfile.OPERADOR, UserProfile.CONSULTA] },
    { id: 'cost-centers', label: 'Centros de Custo', icon: FolderTree, roles: [UserProfile.ADMINISTRADOR, UserProfile.OPERADOR, UserProfile.CONSULTA] },
    { id: 'units', label: 'Unidades (MV)', icon: Settings, roles: [UserProfile.ADMINISTRADOR, UserProfile.OPERADOR, UserProfile.CONSULTA] },
    { id: 'import-export', label: 'Carga & Cópias (Backup)', icon: FileSpreadsheet, roles: [UserProfile.ADMINISTRADOR, UserProfile.OPERADOR] },
    { id: 'audit', label: 'Trilha de Auditoria', icon: ShieldAlert, roles: [UserProfile.ADMINISTRADOR] },
    { id: 'users', label: 'Gerenciamento de Usuários', icon: Users, roles: [UserProfile.ADMINISTRADOR] },
  ];

  const allowedMenuItems = menuItems.filter(item => item.roles.includes(currentUser.perfil));

  return (
    <aside className={`${isCollapsed ? 'w-20' : 'w-64'} bg-slate-900 border-r border-slate-800 flex flex-col justify-between h-screen shrink-0 transition-all duration-200`}>
      
      {/* Header Info */}
      <div className={isCollapsed ? 'p-4 flex flex-col items-center' : 'p-6'}>
        {isCollapsed ? (
          <div className="flex flex-col items-center gap-4 mb-6 w-full">
            <button 
              id="btn-sidebar-expand"
              onClick={() => toggleCollapse(false)} 
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer self-center"
              title="Expandir Menu"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            <div className="p-2 bg-blue-600 text-white rounded-xl shadow-md shrink-0" title="Retenções ERP">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600 text-white rounded-xl shadow-md shrink-0">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-base font-bold text-white tracking-tight leading-none">
                  Retenções ERP
                </h1>
                <span className="text-[10px] text-slate-400 font-mono tracking-wider uppercase mt-1 block">
                  Pronto para MV
                </span>
              </div>
            </div>
            <button 
              id="btn-sidebar-collapse"
              onClick={() => toggleCollapse(true)} 
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              title="Recolher Menu"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Profile Card Summary */}
        {isCollapsed ? (
          <div className="flex flex-col items-center" title={`${currentUser.nome} (${currentUser.perfil})`}>
            <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center relative">
              <span className="text-xs font-bold text-white uppercase">
                {currentUser.nome.charAt(0)}
              </span>
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-slate-900 rounded-full"></span>
            </div>
          </div>
        ) : (
          <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60 flex flex-col gap-1.5 shadow-sm">
            <div className="text-xs font-semibold text-white truncate">
              {currentUser.nome}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] bg-slate-700 text-slate-200 font-semibold px-2 py-0.5 rounded-full border border-slate-600">
                {currentUser.perfil}
              </span>
              <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Online
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Navigation list */}
      <nav className={`flex-1 ${isCollapsed ? 'px-2' : 'px-4'} space-y-1 overflow-y-auto`}>
        {allowedMenuItems.map((item) => {
          const IconComponent = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              id={`nav-item-${item.id}`}
              onClick={() => setActiveTab(item.id)}
              title={isCollapsed ? item.label : undefined}
              className={`w-full flex items-center ${isCollapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2.5'} rounded-xl text-sm font-medium transition cursor-pointer ${
                isActive 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <IconComponent className={`${isCollapsed ? 'w-5 h-5' : 'w-4 h-4'} shrink-0`} />
              {!isCollapsed && <span>{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Bottom Footer Actions */}
      <div className={`p-4 border-t border-slate-800 space-y-2 ${isCollapsed ? 'flex flex-col items-center px-2' : ''}`}>
        {/* Theme Toggler */}
        <button
          id="btn-toggle-theme"
          onClick={onThemeToggle}
          title={isCollapsed ? `Mudar para Tema ${theme === 'light' ? 'Escuro' : 'Claro'} (Alt+T)` : undefined}
          className={`w-full flex items-center ${isCollapsed ? 'justify-center p-2' : 'justify-between px-3 py-2'} rounded-xl text-xs text-slate-300 hover:bg-slate-800 font-semibold cursor-pointer border border-transparent hover:border-slate-700`}
        >
          <div className="flex items-center gap-2">
            {theme === 'light' ? <Moon className={`${isCollapsed ? 'w-5 h-5' : 'w-4 h-4'}`} /> : <Sun className={`${isCollapsed ? 'w-5 h-5' : 'w-4 h-4'}`} />}
            {!isCollapsed && <span>Tema {theme === 'light' ? 'Escuro' : 'Claro'}</span>}
          </div>
          {!isCollapsed && (
            <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">
              ALT+T
            </span>
          )}
        </button>

        {/* Logout */}
        <button
          id="btn-sidebar-logout"
          onClick={onLogout}
          title={isCollapsed ? 'Sair do sistema' : undefined}
          className={`w-full flex items-center ${isCollapsed ? 'justify-center p-2 text-red-400' : 'gap-2 px-3 py-2 text-red-400'} rounded-xl text-xs hover:bg-red-950/20 font-semibold cursor-pointer transition`}
        >
          <LogOut className={`${isCollapsed ? 'w-5 h-5' : 'w-4 h-4'}`} />
          {!isCollapsed && <span>Sair do sistema</span>}
        </button>
      </div>
    </aside>
  );
}
