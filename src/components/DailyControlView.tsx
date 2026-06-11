/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { DBService } from '../services/db';
import { DailyProcess, Supplier, User, AccountingProcess, UserProfile } from '../types';
import { 
  Search, FilePlus2, Trash2, CheckCircle2, AlertCircle, 
  Calendar, UserCheck, Building2, ClipboardList, HelpCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface DailyControlViewProps {
  currentUserProfile?: UserProfile;
}

export default function DailyControlView({ currentUserProfile }: DailyControlViewProps) {
  // States
  const [dailyProcesses, setDailyProcesses] = useState<DailyProcess[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [accountingProcesses, setAccountingProcesses] = useState<AccountingProcess[]>([]);
  
  // Form States
  const [numeroSEI, setNumeroSEI] = useState('');
  const [fornecedorId, setFornecedorId] = useState('');
  const [colaboradorId, setColaboradorId] = useState('');
  const [observacao, setObservacao] = useState('');
  const [dataEncaminhado, setDataEncaminhado] = useState(() => {
    return new Date().toISOString().slice(0, 10); // Default to today's date
  });

  // UI States
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLaunched, setFilterLaunched] = useState<'todos' | 'lancados' | 'pendentes'>('todos');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string, sei: string } | null>(null);

  // Load database data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    const daily = DBService.getDailyProcesses();
    const sups = DBService.getSuppliers().filter(s => s.status === 'Ativo');
    const ulist = DBService.getUsers().filter(u => u.status === 'Ativo');
    const accProcesses = DBService.getProcesses();

    setDailyProcesses(daily);
    setSuppliers(sups);
    setUsers(ulist);
    setAccountingProcesses(accProcesses);

    // Pre-select first options if available
    if (sups.length > 0 && !fornecedorId) {
      setFornecedorId(sups[0].id);
    }
    
    // Pre-select current logged user if available
    const curUser = DBService.getCurrentUser();
    if (curUser) {
      setColaboradorId(curUser.id);
    } else if (ulist.length > 0) {
      setColaboradorId(ulist[0].id);
    }
  };

  // Check if a SEI is launched in Accounting Processes
  const isProcessLaunched = (sei: string) => {
    const cleanSEI = sei.trim().replace(/\s+/g, '');
    return accountingProcesses.some(ap => ap.numeroSEI.trim().replace(/\s+/g, '') === cleanSEI);
  };

  // Helper to format ISO as DD/MM/YYYY
  const formatarDataLocal = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!numeroSEI.trim()) {
      setErrorMessage('O número do processo SEI é obrigatório.');
      return;
    }

    if (!fornecedorId) {
      setErrorMessage('Por favor, selecione um fornecedor.');
      return;
    }

    if (!colaboradorId) {
      setErrorMessage('Por favor, selecione um colaborador.');
      return;
    }

    if (!dataEncaminhado) {
      setErrorMessage('Por favor, informe a data em que foi encaminhado ao financeiro.');
      return;
    }

    try {
      // DBService already checks for duplication and throws error if duplicate
      DBService.addDailyProcess({
        numeroSEI: numeroSEI.trim(),
        fornecedorId,
        colaboradorId,
        dataEncaminhadoFinanceiro: dataEncaminhado,
        observacao: observacao.trim() || undefined
      });

      setSuccessMessage(`Processo SEI ${numeroSEI} registrado com sucesso na triagem diária!`);
      setNumeroSEI('');
      setObservacao('');
      
      // Reset form view toggle after short delay or instantly
      setShowAddForm(false);
      loadData();

      setTimeout(() => {
        setSuccessMessage('');
      }, 5000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao salvar registro de recepção.');
    }
  };

  const handleDelete = (id: string, sei: string) => {
    setDeleteTarget({ id, sei });
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    try {
      DBService.deleteDailyProcess(deleteTarget.id);
      setSuccessMessage(`Registro SEI ${deleteTarget.sei} removido.`);
      setDeleteTarget(null);
      loadData();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao remover registro.');
    }
  };

  // Filter daily processes list based on search and launched filters
  const filteredDailyProcesses = dailyProcesses.filter(dp => {
    const matchesSearch = 
      dp.numeroSEI.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (suppliers.find(s => s.id === dp.fornecedorId)?.nome || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (users.find(u => u.id === dp.colaboradorId)?.nome || '').toLowerCase().includes(searchQuery.toLowerCase());

    const launched = isProcessLaunched(dp.numeroSEI);

    if (filterLaunched === 'lancados') {
      return matchesSearch && launched;
    }
    if (filterLaunched === 'pendentes') {
      return matchesSearch && !launched;
    }
    return matchesSearch;
  });

  // Stats Counters
  const totalCount = dailyProcesses.length;
  const launchedCount = dailyProcesses.filter(dp => isProcessLaunched(dp.numeroSEI)).length;
  const pendingCount = totalCount - launchedCount;

  const isReadOnly = currentUserProfile === UserProfile.CONSULTA;

  return (
    <div className="space-y-6">
      
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-zinc-50 tracking-tight font-sans">
            Recepção Diária de Processos
          </h2>
        </div>

        {!isReadOnly && (
          <button
            id="btn-toggle-add-daily"
            onClick={() => {
              setShowAddForm(!showAddForm);
              setErrorMessage('');
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow-md transition cursor-pointer shrink-0"
          >
            <FilePlus2 className="w-4 h-4" />
            {showAddForm ? 'Ocultar Formulário' : 'Registrar Novo Entrada'}
          </button>
        )}
      </div>

      {/* Feedbacks Alerts */}
      <AnimatePresence>
        {errorMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-150 dark:border-red-900/40 text-red-800 dark:text-red-400 rounded-xl text-xs flex items-center gap-3 font-semibold"
          >
            <AlertCircle className="w-5 h-5 shrink-0 text-red-500" />
            <span>{errorMessage}</span>
          </motion.div>
        )}

        {successMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 bg-emerald-50 dark:bg-emerald-950/25 border border-emerald-150 dark:border-emerald-900/30 text-emerald-800 dark:text-emerald-400 rounded-xl text-xs flex items-center gap-3 font-semibold"
          >
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-500" />
            <span>{successMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Formulário de Registro de Entrada */}
      <AnimatePresence>
        {showAddForm && !isReadOnly && (
          <motion.form 
            onSubmit={handleSave}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-gray-150 dark:border-zinc-800 shadow-sm space-y-5">
              <div className="border-b border-gray-150 dark:border-zinc-800 pb-3 flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500">
                  Registrar Entrada de Processo SEI
                </h3>
                <span className="text-[10px] bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded text-blue-600 dark:text-blue-400 font-bold uppercase">
                  Validação Ativa
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Campo SEI */}
                <div>
                  <label htmlFor="daily-sei" className="block text-xs font-bold text-gray-500 dark:text-zinc-400 uppercase mb-1">
                    Número SEI *
                  </label>
                  <input
                    id="daily-sei"
                    type="text"
                    required
                    value={numeroSEI}
                    onChange={(e) => setNumeroSEI(e.target.value)}
                    placeholder="04016-00074671/2026-36"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50 font-mono"
                  />
                </div>

                {/* Campo Fornecedor */}
                <div>
                  <label htmlFor="daily-supplier" className="block text-xs font-bold text-gray-500 dark:text-zinc-400 uppercase mb-1">
                    Fornecedor *
                  </label>
                  <select
                    id="daily-supplier"
                    required
                    value={fornecedorId}
                    onChange={(e) => setFornecedorId(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  >
                    <option value="">Selecione o Fornecedor...</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.nome} ({s.cnpj})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Campo Colaborador */}
                <div>
                  <label htmlFor="daily-colaborador" className="block text-xs font-bold text-gray-500 dark:text-zinc-400 uppercase mb-1">
                    Colaborador Responsável *
                  </label>
                  <select
                    id="daily-colaborador"
                    required
                    value={colaboradorId}
                    onChange={(e) => setColaboradorId(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  >
                    <option value="">Selecione o Colaborador...</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.nome} ({u.perfil})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Campo Encaminhado ao Financeiro / Recebido */}
                <div>
                  <label htmlFor="daily-finance" className="block text-xs font-bold text-gray-500 dark:text-zinc-400 uppercase mb-1">
                    PROCESSO RECEBIDO EM *
                  </label>
                  <input
                    id="daily-finance"
                    type="date"
                    required
                    value={dataEncaminhado}
                    onChange={(e) => setDataEncaminhado(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                </div>

                {/* Campo Observação */}
                <div className="md:col-span-2 lg:col-span-4">
                  <label htmlFor="daily-observacao" className="block text-xs font-bold text-gray-500 dark:text-zinc-400 uppercase mb-1">
                    Observação (Opcional)
                  </label>
                  <textarea
                    id="daily-observacao"
                    value={observacao}
                    onChange={(e) => setObservacao(e.target.value)}
                    placeholder="Adicione observações importantes para a triagem ou faturamento (Ex: Valor divergente, Contrato aditivado...)"
                    rows={2}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50 font-sans resize-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-gray-150 dark:border-zinc-800 pt-4">
                <button
                  id="btn-cancel-daily"
                  type="button"
                  onClick={() => {
                    setNumeroSEI('');
                    setObservacao('');
                    setErrorMessage('');
                    setShowAddForm(false);
                  }}
                  className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg cursor-pointer transition text-center"
                >
                  Cancelar
                </button>
                <button
                  id="btn-save-daily"
                  type="submit"
                  className="px-5 py-2 text-xs font-bold uppercase tracking-wider text-white bg-blue-600 hover:bg-blue-500 rounded-lg cursor-pointer shadow-md transition"
                >
                  Confirmar Entrada
                </button>
              </div>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Bento Grid de Indicadores de Triagem */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        {/* KPI 1: Total da Recepção */}
        <div className="p-5 bg-white dark:bg-zinc-900 border border-gray-150 dark:border-zinc-800 rounded-2xl flex items-center justify-between shadow-xs">
          <div className="space-y-1">
            <span className="text-xs font-bold uppercase text-gray-400 dark:text-zinc-500 tracking-wider">
              Total Recebidos
            </span>
            <div className="text-2xl font-black text-slate-800 dark:text-zinc-550 font-mono">
              {totalCount}
            </div>
            <p className="text-[10px] text-gray-400 dark:text-zinc-500">
              Registrados no controle diário
            </p>
          </div>
          <div className="p-3.5 bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 rounded-2xl">
            <ClipboardList className="w-6 h-6" />
          </div>
        </div>

        {/* KPI 2: Lançados no Contábil */}
        <div className="p-5 bg-white dark:bg-zinc-900 border border-gray-150 dark:border-zinc-800 rounded-2xl flex items-center justify-between shadow-xs">
          <div className="space-y-1">
            <span className="text-xs font-bold uppercase text-emerald-500 tracking-wider">
              Lançados no Contábil
            </span>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
              {launchedCount}
            </div>
            <p className="text-[10px] text-gray-400 dark:text-zinc-500">
              Corretamente faturados no ERP
            </p>
          </div>
          <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/25 text-emerald-600 dark:text-emerald-400 rounded-2xl">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        {/* KPI 3: Pendentes */}
        <div className="p-5 bg-white dark:bg-zinc-900 border border-gray-150 dark:border-zinc-800 rounded-2xl flex items-center justify-between shadow-xs">
          <div className="space-y-1">
            <span className="text-xs font-bold uppercase text-amber-500 tracking-wider">
              Pendentes de Lançamento
            </span>
            <div className="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono">
              {pendingCount}
            </div>
            <p className="text-[10px] text-gray-400 dark:text-zinc-500">
              Triados que faltam retenção contábil
            </p>
          </div>
          <div className="p-3.5 bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 rounded-2xl">
            <AlertCircle className="w-6 h-6 animate-pulse" />
          </div>
        </div>

      </div>

      {/* Lista de Registros */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-150 dark:border-zinc-800 overflow-hidden shadow-xs space-y-4 p-6">
        
        {/* Barra de Filtros e Pesquisa */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          
          {/* Campo de Pesquisa */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="search-daily-processes"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Pesquisar por SEI, Fornecedor ou Colaborador..."
              className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
          </div>

          {/* Filtros por status de lançamento */}
          <div className="flex items-center gap-1.5 self-end md:self-auto bg-gray-50 dark:bg-zinc-800/40 p-1 rounded-xl border border-gray-150 dark:border-zinc-700/60 shadow-xs">
            <button
              id="filter-launched-all"
              onClick={() => setFilterLaunched('todos')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                filterLaunched === 'todos'
                  ? 'bg-white dark:bg-zinc-850 text-slate-800 dark:text-zinc-100 shadow-xs'
                  : 'text-gray-500 dark:text-zinc-400 hover:text-gray-800 dark:hover:text-zinc-200'
              }`}
            >
              Todos
            </button>
            <button
              id="filter-launched-active"
              onClick={() => setFilterLaunched('lancados')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                filterLaunched === 'lancados'
                  ? 'bg-white dark:bg-zinc-850 text-emerald-600 dark:text-emerald-400 shadow-xs'
                  : 'text-gray-500 dark:text-zinc-400 hover:text-gray-800 dark:hover:text-zinc-200'
              }`}
            >
              Conferidos / Lançados
            </button>
            <button
              id="filter-launched-pending"
              onClick={() => setFilterLaunched('pendentes')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                filterLaunched === 'pendentes'
                  ? 'bg-white dark:bg-zinc-850 text-amber-600 dark:text-amber-400 shadow-xs'
                  : 'text-gray-500 dark:text-zinc-400 hover:text-gray-800 dark:hover:text-zinc-200'
              }`}
            >
              Pendentes
            </button>
          </div>

        </div>

        {/* Grid de Dados / Tabela */}
        <div className="overflow-x-auto min-h-[14rem]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-150 dark:border-zinc-850 text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest bg-gray-50/50 dark:bg-zinc-900/40">
                <th className="py-3 px-4 font-sans">Processo SEI</th>
                <th className="py-3 px-4 font-sans">Fornecedor</th>
                <th className="py-3 px-4 font-sans text-center">Colaborador</th>
                <th className="py-3 px-4 text-center font-sans">PROCESSO RECEBIDO EM</th>
                <th className="py-3 px-4 text-center font-sans">Status no Contábil</th>
                {!isReadOnly && <th className="py-3 px-4 text-center font-sans">Ações</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-zinc-850">
              {filteredDailyProcesses.length === 0 ? (
                <tr>
                  <td colSpan={isReadOnly ? 5 : 6} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="p-3 bg-gray-50 dark:bg-zinc-800/40 rounded-full text-gray-400">
                        <ClipboardList className="w-8 h-8" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-650 dark:text-zinc-350">
                          Nenhum registro de recepção encontrado
                        </p>
                        <p className="text-[10px] text-gray-400 dark:text-zinc-500 mt-1">
                          {searchQuery ? 'Tente ajustar os critérios de busca ou filtros.' : 'Registre a entrada do primeiro processo diário clicando em Registrar Novo.'}
                        </p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredDailyProcesses.map((p) => {
                  const supplier = suppliers.find(s => s.id === p.fornecedorId);
                  const userDetail = users.find(u => u.id === p.colaboradorId);
                  const isLaunched = isProcessLaunched(p.numeroSEI);

                  return (
                    <tr 
                      key={p.id} 
                      className="hover:bg-gray-50/50 dark:hover:bg-zinc-850/20 text-xs text-gray-700 dark:text-zinc-300 transition"
                    >
                      {/* SEI */}
                      <td className="py-4 px-4 font-mono font-bold text-gray-800 dark:text-zinc-200">
                        <div>{p.numeroSEI}</div>
                        {p.observacao && (
                          <div className="text-[10px] text-gray-500 dark:text-zinc-400 font-sans font-medium mt-1 select-none max-w-[280px] break-words">
                            <span className="font-bold text-blue-500 dark:text-blue-400">Obs:</span> {p.observacao}
                          </div>
                        )}
                      </td>

                      {/* Fornecedor */}
                      <td className="py-4 px-4">
                        <div className="flex flex-col max-w-[240px]">
                          <span className="font-semibold text-gray-800 dark:text-zinc-150 truncate" title={supplier?.nome || 'Não Encontrado'}>
                            {supplier ? supplier.nome : 'Fornecedor não cadastrado'}
                          </span>
                          <span className="text-[10px] text-gray-400 dark:text-zinc-500 font-mono mt-0.5">
                            {supplier ? `CNPJ: ${supplier.cnpj}` : ''}
                          </span>
                        </div>
                      </td>

                      {/* Colaborador */}
                      <td className="py-4 px-4 text-center">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 text-[10px] font-semibold rounded-lg">
                          <UserCheck className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                          <span>{userDetail ? userDetail.nome.split(' ')[0] : 'Indefinido'}</span>
                        </div>
                      </td>

                      {/* Encaminhado */}
                      <td className="py-4 px-4 text-center font-semibold font-mono text-gray-600 dark:text-zinc-400">
                        <div className="inline-flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-gray-400" />
                          <span>{formatarDataLocal(p.dataEncaminhadoFinanceiro)}</span>
                        </div>
                      </td>

                      {/* Status no Contábil com cruzamento inteligente */}
                      <td className="py-4 px-4 text-center">
                        {isLaunched ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold rounded-lg border border-emerald-100 dark:border-emerald-950/30">
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                            Lançado
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 text-[10px] font-bold rounded-lg border border-amber-100 dark:border-amber-950/30">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            Pendente
                          </span>
                        )}
                      </td>

                      {/* Ações */}
                      {!isReadOnly && (
                        <td className="py-4 px-4 text-center">
                          <button
                            id={`btn-delete-daily-${p.id}`}
                            onClick={() => handleDelete(p.id, p.numeroSEI)}
                            title="Remover Entrada"
                            className="p-1.5 bg-white hover:bg-red-50 dark:bg-zinc-800 dark:hover:bg-red-950/25 border border-gray-200 dark:border-zinc-700 text-gray-400 hover:text-red-500 rounded-lg shadow-sm cursor-pointer transition inline-flex items-center"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Aviso Explicativo Footer */}
        <div className="pt-4 border-t border-gray-150 dark:border-zinc-805 flex items-center gap-2 text-[11px] text-gray-400 dark:text-zinc-500 font-medium">
          <HelpCircle className="w-4 h-4 text-blue-500 shrink-0" />
          <span>
            <strong>Cruzamento automático contábil:</strong> O status mudará imediatamente de <span className="text-amber-500 font-bold">Pendente</span> para <span className="text-emerald-500 font-bold">Lançado</span> assim que um lançamento contábil correspondente ao número SEI for efetuado na aba "Processos Contábeis".
          </span>
        </div>

      </div>

      {/* Modal de Confirmação de Exclusão */}
      <AnimatePresence>
        {deleteTarget && (
          <div className="fixed inset-0 bg-slate-900/85 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-zinc-900 border border-gray-150 dark:border-zinc-805 rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4 font-sans text-left"
            >
              <div className="flex items-start gap-3">
                <div className="p-2.5 bg-red-50 dark:bg-red-950/35 text-red-600 dark:text-red-400 rounded-xl">
                  <Trash2 className="w-5 h-5 shrink-0" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-zinc-50">Remover da Recepção Diária</h3>
                  <p className="text-xs text-gray-550 dark:text-zinc-400 mt-1 leading-relaxed">
                    Deseja realmente remover o registro SEI <strong className="font-mono text-xs bg-gray-50 dark:bg-zinc-800 text-gray-800 dark:text-zinc-250 px-1 py-0.5 rounded">{deleteTarget.sei}</strong>? Esta ação excluirá apenas a entrada da triagem.
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  id="btn-cancel-delete-daily-modal"
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                  className="px-4 py-2 bg-gray-150 hover:bg-gray-250 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-750 dark:text-zinc-350 rounded-xl text-xs font-bold cursor-pointer transition"
                >
                  Cancelar
                </button>
                <button
                  id="btn-confirm-delete-daily-modal"
                  type="button"
                  onClick={confirmDelete}
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold cursor-pointer shadow-md transition"
                >
                  Confirmar Remoção
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
