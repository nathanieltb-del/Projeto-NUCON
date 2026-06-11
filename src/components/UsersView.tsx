/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { DBService } from '../services/db';
import { User, UserProfile } from '../types';
import { formatarDataHora } from '../utils/validation';
import { Users, UserPlus, ToggleLeft, ToggleRight, Shield, AlertTriangle, Check, Edit, Trash2 } from 'lucide-react';

export default function UsersView() {
  const [users, setUsers] = useState<User[]>(() => DBService.getUsers());
  const [showAddForm, setShowAddForm] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form Fields
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [deleteTargetUser, setDeleteTargetUser] = useState<User | null>(null);
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [login, setLogin] = useState('');
  const [senha, setSenha] = useState('');
  const [perfil, setPerfil] = useState<UserProfile>(UserProfile.OPERADOR);

  const resetForm = () => {
    setEditingUserId(null);
    setNome('');
    setEmail('');
    setLogin('');
    setSenha('');
    setPerfil(UserProfile.OPERADOR);
    setShowAddForm(false);
  };

  const handleEditClick = (user: User) => {
    setEditingUserId(user.id);
    setNome(user.nome);
    setEmail(user.email);
    setLogin(user.login);
    setSenha(user.senhaCriptografada);
    setPerfil(user.perfil);
    setShowAddForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStatusToggle = (user: User) => {
    // Evitar que admins inativem a si próprios
    const currentUser = DBService.getCurrentUser();
    if (currentUser && currentUser.id === user.id) {
       setError('Não é possível inativar seu próprio usuário de login.');
       setTimeout(() => setError(''), 4000);
       return;
    }

    const newStatus = user.status === 'Ativo' ? 'Inativo' : 'Ativo';
    DBService.updateUser(user.id, { status: newStatus });
    setUsers(DBService.getUsers());
    
    setSuccess(`Status do usuário "${user.nome}" alterado para ${newStatus}.`);
    setTimeout(() => setSuccess(''), 4000);
  };

  const handlePerfilChange = (user: User, newPerfil: UserProfile) => {
    const currentUser = DBService.getCurrentUser();
    if (currentUser && currentUser.id === user.id && newPerfil !== UserProfile.ADMINISTRADOR) {
      setError('Você não pode revogar seu próprio privilégio de Administrador.');
      setTimeout(() => setError(''), 4000);
      return;
    }

    DBService.updateUser(user.id, { perfil: newPerfil });
    setUsers(DBService.getUsers());
    
    setSuccess(`Perfil de "${user.nome}" atualizado para ${newPerfil}.`);
    setTimeout(() => setSuccess(''), 4000);
  };

  const handleAddOrUpdateUser = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!nome || !email || !login || !senha) {
      setError('Todos os campos obrigatórios precisam estar preenchidos.');
      return;
    }

    const cleanLogin = login.trim();

    if (editingUserId) {
      // Check if login is already used on another user
      const exists = users.find(u => u.login.toLowerCase() === cleanLogin.toLowerCase() && u.id !== editingUserId);
      if (exists) {
        setError(`O nome de login "${login}" já está em uso por outro usuário.`);
        return;
      }

      const currentUser = DBService.getCurrentUser();
      // Keep safety checks
      if (currentUser && currentUser.id === editingUserId && perfil !== UserProfile.ADMINISTRADOR) {
        setError('Você não pode revogar seu próprio privilégio de Administrador.');
        return;
      }

      DBService.updateUser(editingUserId, {
        nome,
        email,
        login: cleanLogin,
        senhaCriptografada: senha,
        perfil
      });

      setUsers(DBService.getUsers());
      setSuccess(`Usuário "${nome}" atualizado com sucesso!`);
      resetForm();
    } else {
      // Create user
      const exists = users.find(u => u.login.toLowerCase() === cleanLogin.toLowerCase());
      if (exists) {
        setError(`O nome de login "${login}" já está em uso.`);
        return;
      }

      DBService.addUser({
        nome,
        email,
        login: cleanLogin,
        senhaCriptografada: senha,
        perfil,
        status: 'Ativo'
      });

      setUsers(DBService.getUsers());
      setSuccess(`Usuário "${nome}" cadastrado com sucesso!`);
      resetForm();
    }

    setTimeout(() => setSuccess(''), 4000);
  };

  const handleDeleteClick = (user: User) => {
    const currentUser = DBService.getCurrentUser();
    if (currentUser && currentUser.id === user.id) {
       setError('Não é possível excluir o seu próprio usuário logado no momento.');
       setTimeout(() => setError(''), 4000);
       return;
    }

    setDeleteTargetUser(user);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-zinc-50 tracking-tight font-sans">
            Gerenciamento de Usuários
          </h2>
          <p className="text-sm text-gray-500 dark:text-zinc-400">
            Administre os perfis de acesso, permissões e status dos operadores e analistas.
          </p>
        </div>

        <button
          id="btn-show-add-user"
          onClick={() => {
            if (showAddForm) {
              resetForm();
            } else {
              setShowAddForm(true);
            }
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 dark:bg-blue-500 dark:hover:bg-blue-400 text-white font-semibold rounded-xl text-xs uppercase tracking-wider cursor-pointer shadow-sm transition"
        >
          <UserPlus className="w-4 h-4" />
          {showAddForm ? 'Cancelar' : 'Cadastrar Usuário'}
        </button>
      </div>

      {error && (
        <div id="users-error-alert" className="p-4 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 rounded-xl flex items-start gap-3 text-sm border border-red-100 dark:border-red-900/30">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div id="users-success-alert" className="p-4 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-start gap-3 text-sm border border-emerald-100 dark:border-emerald-900/30">
          <Check className="w-5 h-5 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Formulário de Adição */}
      {showAddForm && (
        <form onSubmit={handleAddOrUpdateUser} className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500 mb-2">
            {editingUserId ? 'Editar Usuário / Permissões' : 'Adicionar Novo Operador / Analista'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label htmlFor="user-nome" className="block text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase mb-1">
                Nome do Usuário *
              </label>
              <input
                id="user-nome"
                type="text"
                required
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Carlos Oliveira"
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="user-email" className="block text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase mb-1">
                E-mail Corporativo *
              </label>
              <input
                id="user-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Ex: carlos@empresa.com"
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="user-login" className="block text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase mb-1">
                Login Único *
              </label>
              <input
                id="user-login"
                type="text"
                required
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                placeholder="Ex: coliveira"
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="user-senha" className="block text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase mb-1">
                {editingUserId ? 'Senha (Altere se desejar) *' : 'Senha Provisória *'}
              </label>
              <input
                id="user-senha"
                type="password"
                required
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="user-perfil" className="block text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase mb-1">
                Perfil de Acesso *
              </label>
              <select
                id="user-perfil"
                value={perfil}
                onChange={(e) => setPerfil(e.target.value as UserProfile)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={UserProfile.OPERADOR}>Operador (Pode lançar e editar)</option>
                <option value={UserProfile.CONSULTA}>Consulta (Apenas visualização)</option>
                <option value={UserProfile.ADMINISTRADOR}>Administrador (Controle total)</option>
              </select>
            </div>

            <div className="flex items-end gap-3">
              <button
                id="btn-add-user-submit"
                type="submit"
                className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-sm cursor-pointer transition"
              >
                {editingUserId ? 'Salvar Alterações' : 'Salvar Cadastro'}
              </button>

              {editingUserId && (
                <button
                  id="btn-cancel-edit-user"
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 bg-gray-150 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-700 dark:text-zinc-350 font-bold rounded-lg text-sm cursor-pointer transition"
                >
                  Cancelar
                </button>
              )}
            </div>
          </div>
        </form>
      )}

      {/* Tabela de Usuários */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-gray-100 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-900/60">
                <th className="px-6 py-4 text-xs font-semibold text-gray-400 dark:text-zinc-500 uppercase font-mono">Nome / Contato</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-400 dark:text-zinc-500 uppercase font-mono">Login</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-400 dark:text-zinc-500 uppercase font-mono">Perfil</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-400 dark:text-zinc-500 uppercase font-mono">Status</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-400 dark:text-zinc-500 uppercase font-mono">Criação / Último Acesso</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-400 dark:text-zinc-500 uppercase font-mono text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-zinc-800/80">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50/40 dark:hover:bg-zinc-800/20 transition-colors">
                  <td className="px-6 py-4">
                    <div className="text-sm font-semibold text-gray-900 dark:text-zinc-100">{user.nome}</div>
                    <div className="text-xs text-gray-500 dark:text-zinc-500 font-mono">{user.email}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-mono text-sm bg-gray-50 dark:bg-zinc-800 px-2.5 py-1 rounded text-gray-700 dark:text-zinc-300">
                      {user.login}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <select
                      id={`select-role-${user.id}`}
                      value={user.perfil}
                      onChange={(e) => handlePerfilChange(user, e.target.value as UserProfile)}
                      className="px-2.5 py-1 text-xs font-semibold rounded bg-gray-50 dark:bg-zinc-800 text-gray-800 dark:text-zinc-200 border border-gray-200 dark:border-zinc-700"
                    >
                      <option value={UserProfile.ADMINISTRADOR}>Administrador</option>
                      <option value={UserProfile.OPERADOR}>Operador</option>
                      <option value={UserProfile.CONSULTA}>Consulta</option>
                    </select>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      id={`btn-toggle-status-${user.id}`}
                      onClick={() => handleStatusToggle(user)}
                      className={`flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${
                        user.status === 'Ativo' 
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400' 
                          : 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${user.status === 'Ativo' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                      {user.status}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-xs text-gray-500 font-mono">
                    <div>Criado: {formatarDataHora(user.dataCriacao, false)}</div>
                    {user.ultimoAcesso && <div className="text-emerald-600 dark:text-emerald-400 font-semibold">Acesso: {formatarDataHora(user.ultimoAcesso)}</div>}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2.5">
                      <button
                        id={`btn-edit-user-${user.id}`}
                        onClick={() => handleEditClick(user)}
                        className="p-1 px-2.5 bg-gray-50 hover:bg-blue-50 text-gray-500 hover:text-blue-600 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-400 dark:hover:text-blue-400 rounded-lg text-xs transition font-bold flex items-center gap-1 cursor-pointer border border-gray-150 dark:border-zinc-700"
                        title="Editar Usuário"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        <span>Editar</span>
                      </button>

                      <button
                        id={`btn-edit-status-direct-${user.id}`}
                        onClick={() => handleStatusToggle(user)}
                        className="text-gray-500 hover:text-emerald-500 transition p-1 cursor-pointer"
                        title={user.status === 'Ativo' ? "Inativar Usuário" : "Ativar Usuário"}
                      >
                        {user.status === 'Ativo' ? (
                          <ToggleRight className="w-6 h-5 text-emerald-600 dark:text-emerald-500" />
                        ) : (
                          <ToggleLeft className="w-6 h-5 text-gray-400" />
                        )}
                      </button>

                      <button
                        id={`btn-delete-user-${user.id}`}
                        onClick={() => handleDeleteClick(user)}
                        className="p-1 px-2.5 bg-red-50 hover:bg-red-100 text-red-500 hover:text-red-700 dark:bg-red-950/20 dark:hover:bg-red-950/40 dark:text-red-400 dark:hover:text-red-350 rounded-lg text-xs transition font-bold flex items-center gap-1 cursor-pointer border border-red-150 dark:border-red-900/30"
                        title="Excluir Usuário"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Excluir</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {/* DELETE USER CONFIRMATION MODAL (Iframe Safe) */}
      {deleteTargetUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-3xl max-w-sm w-full p-6 shadow-xl space-y-4 animate-in zoom-in-95 duration-200 text-left">
            <div className="flex items-start gap-3">
              <div className="p-3 bg-red-105 dark:bg-red-950/45 text-red-600 dark:text-red-400 rounded-2xl shrink-0">
                <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-500 animate-pulse" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-gray-900 dark:text-zinc-50 font-sans">
                  Excluir Usuário?
                </h3>
                <p className="text-xs text-gray-500 dark:text-zinc-400 font-medium leading-relaxed">
                  Tem certeza de que deseja excluir permanentemente o usuário <strong className="font-bold text-gray-800 dark:text-zinc-200">"{deleteTargetUser.nome}"</strong>? Esta ação não poderá ser desfeita.
                </p>
              </div>
            </div>
            
            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setDeleteTargetUser(null)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-700 dark:text-zinc-350 rounded-xl text-xs font-bold font-sans cursor-pointer transition"
              >
                Cancelar
              </button>
              <button
                id="btn-confirm-delete-user-final"
                type="button"
                onClick={() => {
                  const target = deleteTargetUser;
                  setDeleteTargetUser(null);
                  try {
                    DBService.deleteUser(target.id);
                    setUsers(DBService.getUsers());
                    setSuccess(`Usuário "${target.nome}" excluído com sucesso.`);
                    if (editingUserId === target.id) {
                      resetForm();
                    }
                  } catch (err: any) {
                    setError(err.message || 'Erro ao excluir o usuário.');
                  }
                  setTimeout(() => setSuccess(''), 4000);
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold font-sans cursor-pointer transition shadow-md"
              >
                Confirmar Exclusão
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
