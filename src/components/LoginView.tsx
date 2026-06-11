/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { DBService } from '../services/db';
import { User, UserProfile } from '../types';
import { Shield, Key, UserCheck, AlertTriangle } from 'lucide-react';

interface LoginViewProps {
  onLoginSuccess: (user: User) => void;
}

export default function LoginView({ onLoginSuccess }: LoginViewProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const users = DBService.getUsers();
    const found = users.find(
      u => u.login.toLowerCase() === username.toLowerCase().trim() && u.senhaCriptografada === password
    );

    if (found) {
      if (found.status === 'Inativo') {
        setError('Este usuário está inativo no sistema. Contate um administrador.');
        return;
      }
      DBService.setCurrentUser(found);
      onLoginSuccess(found);
    } else {
      setError('Credenciais incorretas. Verifique seu login e senha.');
    }
  };

  const handleQuickLogin = (presetLogin: string, presetPass: string) => {
    setUsername(presetLogin);
    setPassword(presetPass);
    setError('');
    
    const users = DBService.getUsers();
    const found = users.find(
      u => u.login === presetLogin && u.senhaCriptografada === presetPass
    );
    if (found) {
      DBService.setCurrentUser(found);
      onLoginSuccess(found);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-zinc-950 px-4 transition-colors duration-200 fn-mono">
      <div id="login-card" className="max-w-md w-full space-y-8 bg-white dark:bg-zinc-900 p-8 rounded-2xl shadow-xl border border-gray-100 dark:border-zinc-800">
        <div>
          <div className="flex justify-center">
            <div className="p-3 bg-emerald-100 dark:bg-emerald-950/50 rounded-2xl text-emerald-600 dark:text-emerald-400">
              <Shield className="w-12 h-12" id="login-logo-icon" />
            </div>
          </div>
          <h2 className="mt-5 text-center text-3xl font-bold tracking-tight text-gray-900 dark:text-zinc-50 font-sans">
            Controle de Processos NUCON
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-zinc-400">
            Controle de Processos Contábeis e Retenções Tributárias
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 rounded-xl flex items-start gap-3 text-sm border border-red-100 dark:border-red-900/30">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="login-username" className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">
                Acesso / Login
              </label>
              <div className="relative">
                <input
                  id="login-username"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Seu usuário de acesso"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 placeholder-gray-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400 transition"
                />
              </div>
            </div>

            <div>
              <label htmlFor="login-password" className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">
                Formulário de Senha
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 placeholder-gray-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400 transition"
                />
              </div>
            </div>
          </div>

          <div>
            <button
              id="btn-submit-login"
              type="submit"
              className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 dark:bg-emerald-500 dark:hover:bg-emerald-400 text-white font-semibold transition shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer"
            >
              <Key className="w-5 h-5" />
              Entrar no Sistema ERP
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
