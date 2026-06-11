/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { DBService } from '../services/db';
import { Unit, UserProfile } from '../types';
import { Search, PlusCircle, AlertTriangle, Check, Settings, Edit, Trash2 } from 'lucide-react';

interface UnitsProps {
  currentUserProfile: UserProfile;
}

export default function UnitsView({ currentUserProfile }: UnitsProps) {
  const [items, setItems] = useState<Unit[]>(() => DBService.getUnits());
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('todos');

  // Real-time synchronization subscription
  useEffect(() => {
    const unsubscribe = DBService.subscribe(() => {
      setItems(DBService.getUnits());
    });
    return unsubscribe;
  }, []);
  const [showAddForm, setShowAddForm] = useState(false);

  // Form
  const [editingUnitId, setEditingUnitId] = useState<string | null>(null);
  const [codigo, setCodigo] = useState('');
  const [nome, setNome] = useState('');
  const [status, setStatus] = useState<'Ativo' | 'Inativo'>('Ativo');

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [deleteTargetUnit, setDeleteTargetUnit] = useState<{ id: string; nome: string } | null>(null);

  const isReadOnly = currentUserProfile === UserProfile.CONSULTA;

  const filteredItems = useMemo(() => {
    return items.filter(u => {
      const matchSearch = u.id.toLowerCase().includes(searchTerm.toLowerCase()) || u.nome.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = filterStatus === 'todos' || u.status === filterStatus;
      return matchSearch && matchStatus;
    });
  }, [items, searchTerm, filterStatus]);

  const resetForm = () => {
    setEditingUnitId(null);
    setCodigo('');
    setNome('');
    setStatus('Ativo');
    setShowAddForm(false);
  };

  const handleEditClick = (unit: Unit) => {
    if (isReadOnly) return;
    setEditingUnitId(unit.id);
    setCodigo(unit.id);
    setNome(unit.nome);
    setStatus(unit.status);
    setShowAddForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAddOrUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (isReadOnly) return;

    if (!codigo || !nome) {
      setError('Adicione o Código MV e o Nome da Unidade Hospitalar.');
      return;
    }

    const cleanCodigo = codigo.toUpperCase().trim();

    if (editingUnitId) {
      // Update
      DBService.updateUnit(editingUnitId, {
        nome,
        status
      });
      setItems(DBService.getUnits());
      setSuccess(`Unidade MV "${cleanCodigo}" atualizada com sucesso!`);
      resetForm();
    } else {
      // Create
      if (items.some(u => u.id.toLowerCase().trim() === cleanCodigo.toLowerCase())) {
        setError(`O Código de Unidade "${cleanCodigo}" já está em uso.`);
        return;
      }

      DBService.addUnit({
        id: cleanCodigo,
        nome,
        status
      });

      setItems(DBService.getUnits());
      setSuccess(`Unidade MV "${cleanCodigo} - ${nome}" cadastrada com sucesso!`);
      resetForm();
    }

    setTimeout(() => setSuccess(''), 4000);
  };

  const handleDeleteClick = (id: string, nomeUnidade: string) => {
    if (isReadOnly) return;
    setDeleteTargetUnit({ id, nome: nomeUnidade });
  };

  const handleToggleStatus = (unit: Unit) => {
    if (isReadOnly) return;
    const nextStatus = unit.status === 'Ativo' ? 'Inativo' : 'Ativo';
    DBService.updateUnit(unit.id, { status: nextStatus });
    setItems(DBService.getUnits());
    setSuccess(`Unidade "${unit.id}" alterada para ${nextStatus}.`);
    setTimeout(() => setSuccess(''), 4000);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-zinc-50 tracking-tight font-sans">
            Unidades MV
          </h2>
        </div>

        {!isReadOnly && (
          <button
            id="btn-show-add-unit"
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 dark:bg-blue-500 dark:hover:bg-blue-400 text-white font-semibold rounded-xl text-xs uppercase tracking-wider cursor-pointer shadow-sm transition self-start sm:self-auto"
          >
            <PlusCircle className="w-4 h-4" />
            {showAddForm ? 'Fechar Form' : 'Adicionar Unidade'}
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

      {/* Form Add */}
      {showAddForm && !isReadOnly && (
        <form onSubmit={handleAddOrUpdate} className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500">
            {editingUnitId ? 'Editar Filial / Unidade de Prestação de Serviço (MV)' : 'Cadastrar Filial / Unidade de Prestação de Serviço (MV)'}
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="unit-code" className="block text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase mb-1">
                Código da Unidade (MV) *
              </label>
              <input
                id="unit-code"
                type="text"
                required
                disabled={!!editingUnitId}
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                placeholder="Ex: HMG-01"
                className={`w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono ${
                  editingUnitId ? 'opacity-60 cursor-not-allowed bg-gray-50 dark:bg-zinc-850' : ''
                }`}
              />
            </div>

            <div className="md:col-span-2">
              <label htmlFor="unit-name" className="block text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase mb-1">
                Nome de Identificação da Unidade *
              </label>
              <input
                id="unit-name"
                type="text"
                required
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Hospital Municipal Central de Especialidades"
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="unit-status" className="block text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase mb-1">
                Status
              </label>
              <select
                id="unit-status"
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
                id="btn-add-unit-submit"
                type="submit"
                className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-sm cursor-pointer transition shadow-sm"
              >
                {editingUnitId ? 'Salvar Alterações' : 'Gravar Unidade MV'}
              </button>
              
              {editingUnitId && (
                <button
                  id="btn-cancel-edit-unit"
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

      {/* Linha de Busca */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm p-4 flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
            <Search className="w-4 h-4" />
          </span>
          <input
            id="unit-search-input"
            type="text"
            placeholder="Pesquisar por nome ou código MV..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <select
          id="unit-status-filter"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-800 dark:text-zinc-200 focus:outline-none"
        >
          <option value="todos">Todos os Status</option>
          <option value="Ativo">Apenas Ativas</option>
          <option value="Inativo">Apenas Inativas</option>
        </select>
      </div>

      {/* Grid de Exibição */}
      {filteredItems.length === 0 ? (
        <div className="bg-white dark:bg-zinc-900 p-12 text-center rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm text-gray-400">
          Nenhuma unidade localizada.
        </div>
      ) : (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-gray-100 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-900/60">
                  <th className="px-6 py-4 text-xs font-semibold text-gray-400 dark:text-zinc-500 uppercase font-mono">Código MV (Unidade)</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-400 dark:text-zinc-500 uppercase font-mono">Nome da Filial / Hospital</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-400 dark:text-zinc-500 uppercase font-mono">Status</th>
                  {!isReadOnly && <th className="px-6 py-4 text-xs font-semibold text-gray-400 dark:text-zinc-500 uppercase font-mono text-right">Ação</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-zinc-800/80">
                {filteredItems.map((unit) => (
                  <tr key={unit.id} className="hover:bg-gray-50/40 dark:hover:bg-zinc-800/10 transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-mono text-sm font-bold bg-gray-50 dark:bg-zinc-800 dark:text-zinc-300 px-2.5 py-1 rounded">
                        {unit.id}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-zinc-100 text-left">
                      {unit.nome}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${
                        unit.status === 'Ativo'
                          ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400'
                          : 'bg-red-50 text-red-800 dark:bg-red-950/30 dark:text-red-400'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${unit.status === 'Ativo' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                        {unit.status}
                      </span>
                    </td>
                    {!isReadOnly && (
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            id={`btn-edit-unit-${unit.id}`}
                            onClick={() => handleEditClick(unit)}
                            title="Editar Unidade"
                            className="p-1 px-2 bg-gray-50 hover:bg-blue-50 text-gray-500 hover:text-blue-600 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-400 dark:hover:text-blue-400 rounded-lg text-xs transition font-bold flex items-center gap-1 cursor-pointer border border-gray-150 dark:border-zinc-700"
                          >
                            <Edit className="w-3.5 h-3.5" />
                            <span>Editar</span>
                          </button>

                          <button
                            id={`btn-toggle-unit-${unit.id}`}
                            onClick={() => handleToggleStatus(unit)}
                            title={unit.status === 'Ativo' ? 'Inativar Unidade' : 'Ativar Unidade'}
                            className="p-1 px-2 bg-gray-50 hover:bg-gray-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-500 dark:text-zinc-300 rounded-lg text-xs transition font-bold cursor-pointer border border-gray-150 dark:border-zinc-700"
                          >
                            {unit.status === 'Ativo' ? 'Inativar' : 'Ativar'}
                          </button>

                          <button
                            id={`btn-delete-unit-${unit.id}`}
                            onClick={() => handleDeleteClick(unit.id, unit.nome)}
                            title="Excluir Unidade"
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
      {/* DELETE UNIT CONFIRMATION MODAL (Iframe Safe) */}
      {deleteTargetUnit && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-3xl max-w-sm w-full p-6 shadow-xl space-y-4 animate-in zoom-in-95 duration-200 text-left">
            <div className="flex items-start gap-3">
              <div className="p-3 bg-red-100 dark:bg-red-950/45 text-red-600 dark:text-red-400 rounded-2xl shrink-0">
                <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-500 animate-pulse" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-gray-900 dark:text-zinc-50 font-sans">
                  Excluir Unidade MV?
                </h3>
                <p className="text-xs text-gray-500 dark:text-zinc-400 font-medium leading-relaxed">
                  Tem certeza de que deseja permanentemente excluir a unidade hospitalar <strong className="font-bold text-gray-800 dark:text-zinc-200">"{deleteTargetUnit.nome}"</strong> ({deleteTargetUnit.id})? Esta ação não poderá ser desfeita.
                </p>
              </div>
            </div>
            
            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setDeleteTargetUnit(null)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-700 dark:text-zinc-350 rounded-xl text-xs font-bold font-sans cursor-pointer transition"
              >
                Cancelar
              </button>
              <button
                id="btn-confirm-delete-unit-final"
                type="button"
                onClick={() => {
                  const target = deleteTargetUnit;
                  setDeleteTargetUnit(null);
                  try {
                    DBService.deleteUnit(target.id);
                    setItems(DBService.getUnits());
                    setSuccess(`Unidade "${target.nome}" excluída com sucesso.`);
                    if (editingUnitId === target.id) {
                      resetForm();
                    }
                  } catch (err: any) {
                    setError(err.message || 'Erro ao excluir unidade.');
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
