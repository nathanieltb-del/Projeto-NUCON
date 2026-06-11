/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { DBService } from '../services/db';
import { CostCenter, UserProfile } from '../types';
import { Search, PlusCircle, AlertTriangle, Check, TreeDeciduous, Edit, Trash2 } from 'lucide-react';

interface CostCentersProps {
  currentUserProfile: UserProfile;
}

export default function CostCentersView({ currentUserProfile }: CostCentersProps) {
  const [items, setItems] = useState<CostCenter[]>(() => DBService.getCostCenters());
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('todos'); // 'todos', 'Ativo', 'Inativo'

  // Real-time synchronization subscription
  useEffect(() => {
    const unsubscribe = DBService.subscribe(() => {
      setItems(DBService.getCostCenters());
    });
    return unsubscribe;
  }, []);
  const [showAddForm, setShowAddForm] = useState(false);
  
  // Form fields
  const [editingCostCenterId, setEditingCostCenterId] = useState<string | null>(null);
  const [codigo, setCodigo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [status, setStatus] = useState<'Ativo' | 'Inativo'>('Ativo');
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [deleteTargetCC, setDeleteTargetCC] = useState<{ id: string; descricao: string } | null>(null);

  const isReadOnly = currentUserProfile === UserProfile.CONSULTA;

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearch = item.id.includes(searchTerm) || item.descricao.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = filterStatus === 'todos' || item.status === filterStatus;
      return matchesSearch && matchesStatus;
    });
  }, [items, searchTerm, filterStatus]);

  const resetForm = () => {
    setEditingCostCenterId(null);
    setCodigo('');
    setDescricao('');
    setStatus('Ativo');
    setShowAddForm(false);
  };

  const handleEditClick = (cc: CostCenter) => {
    if (isReadOnly) return;
    setEditingCostCenterId(cc.id);
    setCodigo(cc.id);
    setDescricao(cc.descricao);
    setStatus(cc.status);
    setShowAddForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAddOrUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (isReadOnly) return;

    if (!codigo || !descricao) {
      setError('Todos os campos são obrigatórios.');
      return;
    }

    const cleanCodigo = codigo.trim();

    if (editingCostCenterId) {
      // Update
      DBService.updateCostCenter(editingCostCenterId, {
        descricao,
        status
      });
      setItems(DBService.getCostCenters());
      setSuccess(`Centro de Custo "${cleanCodigo}" editado com sucesso!`);
      resetForm();
    } else {
      // Create
      if (items.some(i => i.id === cleanCodigo)) {
        setError(`O Centro de Custo código "${cleanCodigo}" já existe.`);
        return;
      }

      DBService.addCostCenter({
        id: cleanCodigo,
        descricao,
        status
      });

      setItems(DBService.getCostCenters());
      setSuccess(`Centro de Custo "${cleanCodigo} - ${descricao}" cadastrado com sucesso!`);
      resetForm();
    }
    
    setTimeout(() => setSuccess(''), 4000);
  };

  const handleDeleteClick = (id: string, CCDescricao: string) => {
    if (isReadOnly) return;
    setDeleteTargetCC({ id, descricao: CCDescricao });
  };

  const handleToggleStatus = (item: CostCenter) => {
    if (isReadOnly) return;
    const nextStatus = item.status === 'Ativo' ? 'Inativo' : 'Ativo';
    DBService.updateCostCenter(item.id, { status: nextStatus });
    setItems(DBService.getCostCenters());
    setSuccess(`Centro de Custo "${item.id}" alterado para ${nextStatus}.`);
    setTimeout(() => setSuccess(''), 4000);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-zinc-50 tracking-tight font-sans">
            Centros de Custo (ERP)
          </h2>
        </div>

        {!isReadOnly && (
          <button
            id="btn-show-add-cc"
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 dark:bg-blue-500 dark:hover:bg-blue-400 text-white font-semibold rounded-xl text-xs uppercase tracking-wider cursor-pointer shadow-sm transition self-start sm:self-auto"
          >
            <PlusCircle className="w-4 h-4" />
            {showAddForm ? 'Fechar Form' : 'Adicionar Código CC'}
          </button>
        )}
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 rounded-xl flex items-start gap-3 text-sm border border-red-100 dark:border-red-900/30">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-start gap-3 text-sm border border-emerald-100 dark:border-emerald-900/30">
          <Check className="w-5 h-5 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Formulário de Adição */}
      {showAddForm && !isReadOnly && (
        <form onSubmit={handleAddOrUpdate} className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500">
            {editingCostCenterId ? 'Editar Centro de Custo' : 'Cadastrar Novo Centro de Custo no Faturamento'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="cc-code" className="block text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase mb-1">
                Código do Centro de Custo *
              </label>
              <input
                id="cc-code"
                type="text"
                required
                disabled={!!editingCostCenterId}
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                placeholder="Ex: 10101"
                className={`w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono ${
                  editingCostCenterId ? 'opacity-60 cursor-not-allowed bg-gray-50 dark:bg-zinc-850' : ''
                }`}
              />
            </div>

            <div className="md:col-span-2">
              <label htmlFor="cc-desc" className="block text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase mb-1">
                Descrição do CC / Unidade Setorial *
              </label>
              <input
                id="cc-desc"
                type="text"
                required
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Ex: Diretoria Financeira e Tributária"
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="cc-status" className="block text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase mb-1">
                Status
              </label>
              <select
                id="cc-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as 'Ativo' | 'Inativo')}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Ativo">Ativo</option>
                <option value="Inativo">Inativo</option>
              </select>
            </div>

            <div className="md:col-span-2 flex items-end gap-3">
              <button
                id="btn-add-cc-submit"
                type="submit"
                className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-sm cursor-pointer transition shadow-sm"
              >
                {editingCostCenterId ? 'Salvar Alterações' : 'Salvar Cadastro CC'}
              </button>

              {editingCostCenterId && (
                <button
                  id="btn-cancel-edit-cc"
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 bg-gray-150 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-700 dark:text-zinc-350 font-bold rounded-lg text-sm cursor-pointer transition shadow-sm"
                >
                  Cancelar
                </button>
              )}
            </div>
          </div>
        </form>
      )}

      {/* Grid de Busca e Filtro */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm p-4 flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
            <Search className="w-4 h-4" />
          </span>
          <input
            id="cc-search-input"
            type="text"
            placeholder="Pesquisar por descrição ou código numérico..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <select
          id="cc-status-filter"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-800 dark:text-zinc-200 focus:outline-none"
        >
          <option value="todos">Todos os Status</option>
          <option value="Ativo">Apenas Ativos</option>
          <option value="Inativo">Apenas Inativos</option>
        </select>
      </div>

      {/* Grid de Exibição */}
      {filteredItems.length === 0 ? (
        <div className="bg-white dark:bg-zinc-900 p-12 text-center rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm text-gray-400">
          Nenhum centro de custo atende a esses critérios de busca.
        </div>
      ) : (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-gray-100 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-900/60">
                  <th className="px-6 py-4 text-xs font-semibold text-gray-400 dark:text-zinc-500 uppercase font-mono">Código CC</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-400 dark:text-zinc-500 uppercase font-mono">Descrição Setorial</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-400 dark:text-zinc-500 uppercase font-mono">Status</th>
                  {!isReadOnly && <th className="px-6 py-4 text-xs font-semibold text-gray-400 dark:text-zinc-500 uppercase font-mono text-right">Ação</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-zinc-800/80">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50/40 dark:hover:bg-zinc-800/10 transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-mono text-sm font-bold bg-gray-50 dark:bg-zinc-800 dark:text-zinc-300 px-2.5 py-1 rounded">
                        {item.id}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-zinc-100">
                      {item.descricao}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${
                        item.status === 'Ativo'
                          ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400'
                          : 'bg-red-50 text-red-800 dark:bg-red-950/30 dark:text-red-400'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${item.status === 'Ativo' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                        {item.status}
                      </span>
                    </td>
                    {!isReadOnly && (
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            id={`btn-edit-cc-${item.id}`}
                            onClick={() => handleEditClick(item)}
                            title="Editar Centro de Custo"
                            className="p-1 px-2 bg-gray-50 hover:bg-blue-50 text-gray-500 hover:text-blue-600 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-400 dark:hover:text-blue-400 rounded-lg text-xs transition font-bold flex items-center gap-1 cursor-pointer border border-gray-150 dark:border-zinc-700"
                          >
                            <Edit className="w-3.5 h-3.5" />
                            <span>Editar</span>
                          </button>

                          <button
                            id={`btn-toggle-cc-${item.id}`}
                            onClick={() => handleToggleStatus(item)}
                            title={item.status === 'Ativo' ? 'Inativar CC' : 'Ativar CC'}
                            className="p-1 px-2 bg-gray-50 hover:bg-gray-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-500 dark:text-zinc-300 rounded-lg text-xs transition font-bold cursor-pointer border border-gray-150 dark:border-zinc-700"
                          >
                            {item.status === 'Ativo' ? 'Inativar' : 'Ativar'}
                          </button>

                          <button
                            id={`btn-delete-cc-${item.id}`}
                            onClick={() => handleDeleteClick(item.id, item.descricao)}
                            title="Excluir Centro de Custo"
                            className="p-1 px-2 bg-red-50 hover:bg-red-100 text-red-500 hover:text-red-700 dark:bg-red-950/20 dark:hover:bg-red-950/40 dark:text-red-400 dark:hover:text-red-300 rounded-lg text-xs transition font-bold flex items-center gap-1 cursor-pointer border border-red-150 dark:border-red-900/30"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Excluir</span>
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {/* DELETE CC CONFIRMATION MODAL (Iframe Safe) */}
      {deleteTargetCC && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-3xl max-w-sm w-full p-6 shadow-xl space-y-4 animate-in zoom-in-95 duration-200 text-left">
            <div className="flex items-start gap-3">
              <div className="p-3 bg-red-100 dark:bg-red-950/45 text-red-600 dark:text-red-400 rounded-2xl shrink-0">
                <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-500 animate-pulse" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-gray-900 dark:text-zinc-50 font-sans">
                  Excluir Centro de Custo?
                </h3>
                <p className="text-xs text-gray-500 dark:text-zinc-400 font-medium leading-relaxed">
                  Tem certeza de que deseja permanentemente excluir o Centro de Custo <strong className="font-bold text-gray-800 dark:text-zinc-200">"{deleteTargetCC.descricao}"</strong> ({deleteTargetCC.id})? Esta ação não poderá ser desfeita.
                </p>
              </div>
            </div>
            
            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setDeleteTargetCC(null)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-700 dark:text-zinc-350 rounded-xl text-xs font-bold font-sans cursor-pointer transition"
              >
                Cancelar
              </button>
              <button
                id="btn-confirm-delete-cc-final"
                type="button"
                onClick={() => {
                  const target = deleteTargetCC;
                  setDeleteTargetCC(null);
                  try {
                    DBService.deleteCostCenter(target.id);
                    setItems(DBService.getCostCenters());
                    setSuccess(`Centro de Custo "${target.descricao}" excluído com sucesso.`);
                    if (editingCostCenterId === target.id) {
                      resetForm();
                    }
                  } catch (err: any) {
                    setError(err.message || 'Erro ao excluir o Centro de Custo.');
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
