/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { DBService } from '../services/db';
import { Supplier, TaxConfig, TaxBaseOption, UserProfile } from '../types';
import { formatarCNPJ, validarCNPJ } from '../utils/validation';
import { Building2, Search, PlusCircle, CreditCard, ShieldCheck, AlertCircle, Edit, Trash2, ExternalLink } from 'lucide-react';

interface SuppliersProps {
  currentUserProfile: UserProfile;
}

export default function SuppliersView({ currentUserProfile }: SuppliersProps) {
  const [suppliers, setSuppliers] = useState<Supplier[]>(() => DBService.getSuppliers());
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Supplier | null>(null);
  
  // Form general state
  const [nome, setNome] = useState('');
  const [codigoMV, setCodigoMV] = useState('');
  const [oficinaMV, setOficinaMV] = useState('');
  const [codigoServico, setCodigoServico] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [cprb, setCprb] = useState(false);
  const [simplesNacional, setSimplesNacional] = useState(false);
  const [status, setStatus] = useState<'Ativo' | 'Inativo'>('Ativo');

  // Impostos individualmente
  const [inssIncide, setInssIncide] = useState(true);
  const [inssAliquota, setInssAliquota] = useState(11);
  const [inssBase, setInssBase] = useState<TaxBaseOption>(TaxBaseOption.VALOR_NF_DEDUCOES);

  const [irrfIncide, setIrrfIncide] = useState(true);
  const [irrfAliquota, setIrrfAliquota] = useState(1.5);
  const [irrfBase, setIrrfBase] = useState<TaxBaseOption>(TaxBaseOption.VALOR_NF);

  const [csrfIncide, setCsrfIncide] = useState(true);
  const [csrfAliquota, setCsrfAliquota] = useState(4.65);
  const [csrfBase, setCsrfBase] = useState<TaxBaseOption>(TaxBaseOption.VALOR_NF);

  const [issIncide, setIssIncide] = useState(false);
  const [issAliquota, setIssAliquota] = useState(5);
  const [issBase, setIssBase] = useState<TaxBaseOption>(TaxBaseOption.VALOR_NF);

  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const isReadOnly = currentUserProfile === UserProfile.CONSULTA;

  const filteredSuppliers = useMemo(() => {
    return suppliers.filter(s => 
      s.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.cnpj.replace(/\D/g, '').includes(searchTerm.replace(/\D/g, '')) ||
      s.codigoMV.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.oficinaMV.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [suppliers, searchTerm]);

  const handleEditClick = (s: Supplier) => {
    if (isReadOnly) return;
    setEditingSupplier(s);
    
    setNome(s.nome);
    setCodigoMV(s.codigoMV);
    setOficinaMV(s.oficinaMV);
    setCodigoServico(s.codigoServico);
    setCnpj(s.cnpj);
    setCprb(s.cprb);
    setSimplesNacional(s.simplesNacional || false);
    setStatus(s.status);

    setInssIncide(s.inss.incide);
    setInssAliquota(s.inss.aliquota);
    setInssBase(s.inss.baseCalculoPadrao);

    setIrrfIncide(s.irrf.incide);
    setIrrfAliquota(s.irrf.aliquota);
    setIrrfBase(s.irrf.baseCalculoPadrao);

    setCsrfIncide(s.csrf.incide);
    setCsrfAliquota(s.csrf.aliquota);
    setCsrfBase(s.csrf.baseCalculoPadrao);

    setIssIncide(s.iss.incide);
    setIssAliquota(s.iss.aliquota);
    setIssBase(s.iss.baseCalculoPadrao);

    setShowForm(true);
    setErrorMessage('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteClick = (sup: Supplier) => {
    if (isReadOnly) return;
    setDeleteTarget(sup);
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    try {
      DBService.deleteSupplier(deleteTarget.id);
      const updated = DBService.getSuppliers();
      setSuppliers(updated);
      setSuccessMessage(`Fornecedor "${deleteTarget.nome}" excluído com sucesso.`);
      setErrorMessage('');
      if (editingSupplier?.id === deleteTarget.id) {
        resetForm();
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao excluir o fornecedor.');
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleCnpjChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setCnpj(formatarCNPJ(raw));
  };

  // Aciona CPRB automática -> Se optante por CPRB, INSS incide a 3.5% (regra para faturamento MV de TI ou obras específicas)
  const handleCprbChange = (checked: boolean) => {
    setCprb(checked);
    if (checked) {
      setInssAliquota(3.5);
    } else {
      setInssAliquota(11);
    }
  };

  const handleSimplesNacionalChange = (checked: boolean) => {
    setSimplesNacional(checked);
    if (checked) {
      // CSRF generally does not hold for Simples Nacional
      setCsrfIncide(false);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (isReadOnly) return;

    if (!nome || !codigoMV || !cnpj || !oficinaMV || !codigoServico) {
      setErrorMessage('Preencha todos os campos obrigatórios.');
      return;
    }

    if (!validarCNPJ(cnpj)) {
      setErrorMessage('CNPJ inválido de faturamento brasileiro. Por favor, confira.');
      return;
    }

    const supplierPayload: Omit<Supplier, 'id' | 'dataCriacao'> = {
      nome,
      codigoMV,
      oficinaMV,
      codigoServico,
      cnpj,
      cprb,
      simplesNacional,
      status,
      inss: { incide: inssIncide, aliquota: inssIncide ? inssAliquota : 0, baseCalculoPadrao: inssBase },
      irrf: { incide: irrfIncide, aliquota: irrfIncide ? irrfAliquota : 0, baseCalculoPadrao: irrfBase },
      csrf: { incide: csrfIncide, aliquota: csrfIncide ? csrfAliquota : 0, baseCalculoPadrao: csrfBase },
      iss: { incide: issIncide, aliquota: issIncide ? issAliquota : 0, baseCalculoPadrao: issBase }
    };

    try {
      if (editingSupplier) {
        DBService.updateSupplier(editingSupplier.id, supplierPayload);
        setSuccessMessage(`Fornecedor "${nome}" atualizado com sucesso no ERP.`);
      } else {
        DBService.addSupplier(supplierPayload);
        setSuccessMessage(`Fornecedor "${nome}" cadastrado com sucesso.`);
      }

      setSuppliers(DBService.getSuppliers());
      resetForm();
    } catch (err: any) {
      setErrorMessage(err.message || 'Ocorreu um erro ao salvar o fornecedor.');
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingSupplier(null);
    setNome('');
    setCodigoMV('');
    setOficinaMV('');
    setCodigoServico('');
    setCnpj('');
    setCprb(false);
    setSimplesNacional(false);
    setStatus('Ativo');
    
    // Default taxes setup
    setInssIncide(true);
    setInssAliquota(11);
    setInssBase(TaxBaseOption.VALOR_NF_DEDUCOES);
    setIrrfIncide(true);
    setIrrfAliquota(1.5);
    setIrrfBase(TaxBaseOption.VALOR_NF);
    setCsrfIncide(true);
    setCsrfAliquota(4.65);
    setCsrfBase(TaxBaseOption.VALOR_NF);
    setIssIncide(false);
    setIssAliquota(5);
    setIssBase(TaxBaseOption.VALOR_NF);
  };

  const renderFormContent = () => (
    <>
      <div className="border-b border-gray-150 dark:border-zinc-800 pb-3 flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500">
          {editingSupplier ? `Editar Parâmetros: ${editingSupplier.nome}` : 'Parametrizar Novo Fornecedor contábil'}
        </h3>
        <span className="text-xs bg-gray-100 dark:bg-zinc-800 px-2 py-0.5 rounded text-gray-500 font-mono">
          Fórmula de Cálculo MV
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <label htmlFor="supplier-name" className="block text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase mb-1">
            Nome do Fornecedor *
          </label>
          <input
            id="supplier-name"
            type="text"
            required
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="MedClean Soluçoes Hospitalar"
            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label htmlFor="supplier-cnpj" className="block text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase mb-1">
            CNPJ (Oficial) *
          </label>
          <input
            id="supplier-cnpj"
            type="text"
            required
            value={cnpj}
            onChange={handleCnpjChange}
            placeholder="12.345.678/0001-90"
            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
          />
        </div>

        <div>
          <label htmlFor="supplier-codMV" className="block text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase mb-1">
            Código do Fornecedor (MV) *
          </label>
          <input
            id="supplier-codMV"
            type="text"
            required
            value={codigoMV}
            onChange={(e) => setCodigoMV(e.target.value)}
            placeholder="FORN-3050"
            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
          />
        </div>

        <div>
          <label htmlFor="supplier-oficina" className="block text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase mb-1">
            Oficina (MV) *
          </label>
          <input
            id="supplier-oficina"
            type="text"
            required
            value={oficinaMV}
            onChange={(e) => setOficinaMV(e.target.value)}
            placeholder="OF-HIGIENIZACAO"
            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label htmlFor="supplier-codServico" className="block text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase mb-1">
            Código de Serviço (LC 116) *
          </label>
          <input
            id="supplier-codServico"
            type="text"
            required
            value={codigoServico}
            onChange={(e) => setCodigoServico(e.target.value)}
            placeholder="07.01"
            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
          />
        </div>

        <div>
          <label htmlFor="supplier-status" className="block text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase mb-1">
            Status Operacional
          </label>
          <select
            id="supplier-status"
            value={status}
            onChange={(e) => setStatus(e.target.value as 'Ativo' | 'Inativo')}
            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="Ativo">Ativo</option>
            <option value="Inativo">Inativo</option>
          </select>
        </div>
      </div>

      {/* CPRB Switch */}
      <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-zinc-800/10 rounded-xl border border-gray-100 dark:border-zinc-800/60">
        <input
          id="supplier-cprb"
          type="checkbox"
          checked={cprb}
          onChange={(e) => handleCprbChange(e.target.checked)}
          className="w-4 h-4 rounded text-blue-600 border-gray-300 focus:ring-blue-500"
        />
        <label htmlFor="supplier-cprb" className="text-sm font-semibold text-gray-800 dark:text-zinc-200 cursor-pointer">
          Optante por CPRB (Contribuição Previdenciária sobre a Receita Bruta - Alíquota reduzida de INSS para 3.5%)
        </label>
      </div>

      {/* Simples Nacional Switch with Consultation Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-gray-50 dark:bg-zinc-800/10 rounded-xl border border-gray-100 dark:border-zinc-800/60">
        <div className="flex items-center gap-3">
          <input
            id="supplier-simples-nacional"
            type="checkbox"
            checked={simplesNacional}
            onChange={(e) => handleSimplesNacionalChange(e.target.checked)}
            className="w-4 h-4 rounded text-blue-600 border-gray-300 focus:ring-blue-500"
          />
          <label htmlFor="supplier-simples-nacional" className="text-sm font-semibold text-gray-800 dark:text-zinc-200 cursor-pointer">
            Optante do Simples Nacional (Microempresa / EPP)
          </label>
        </div>

        <a
          href="https://consopt.www8.receita.fazenda.gov.br/consultaoptantes"
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => {
            if (cnpj) {
              navigator.clipboard.writeText(cnpj.replace(/\D/g, ''));
              setSuccessMessage('CNPJ copiado para área de transferência! Cole no portal para consultar.');
              setTimeout(() => setSuccessMessage(''), 5500);
            }
          }}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/35 dark:hover:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900/30 rounded-xl transition shrink-0 cursor-pointer"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Verificar no Portal do Simples Nacional
        </a>
      </div>

      {/* Configuração de Imposto Retido */}
      <h4 className="text-xs font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest pt-2">
        Configuração Individual de Impostos
      </h4>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* INSS Config */}
        <div className="p-4 rounded-xl border border-gray-150 dark:border-zinc-800 bg-gray-50/25 dark:bg-zinc-900/40">
          <div className="flex items-center justify-between mb-3">
            <span className="font-bold text-sm text-gray-800 dark:text-zinc-200">INSS</span>
            <input
              id="incide-inss"
              type="checkbox"
              checked={inssIncide}
              onChange={(e) => setInssIncide(e.target.checked)}
              className="w-4 h-4 text-blue-500"
            />
          </div>
          
          {inssIncide && (
            <div className="space-y-3">
              <div>
                <label htmlFor="aliquota-inss" className="text-[10px] text-gray-400 uppercase font-bold block mb-1">Alíquota (%)</label>
                <input
                  id="aliquota-inss"
                  type="number"
                  step="0.01"
                  value={inssAliquota}
                  onChange={(e) => setInssAliquota(parseFloat(e.target.value) || 0)}
                  className="w-full px-2 py-1 text-xs rounded border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-50 font-mono"
                />
              </div>
              <div>
                <label htmlFor="base-inss" className="text-[10px] text-gray-400 uppercase font-bold block mb-1">Base Padrão</label>
                <select
                  id="base-inss"
                  value={inssBase}
                  onChange={(e) => setInssBase(e.target.value as TaxBaseOption)}
                  className="w-full px-2 py-1 text-xs rounded border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-50"
                >
                  <option value={TaxBaseOption.VALOR_NF}>Valor da Nota Fiscal</option>
                  <option value={TaxBaseOption.VALOR_NF_DEDUCOES}>Valor da Nota menos Deduções</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* IRRF Config */}
        <div className="p-4 rounded-xl border border-gray-150 dark:border-zinc-800 bg-gray-50/25 dark:bg-zinc-900/40">
          <div className="flex items-center justify-between mb-3">
            <span className="font-bold text-sm text-gray-800 dark:text-zinc-200">IRRF</span>
            <input
              id="incide-irrf"
              type="checkbox"
              checked={irrfIncide}
              onChange={(e) => setIrrfIncide(e.target.checked)}
              className="w-4 h-4 text-blue-500"
            />
          </div>
          
          {irrfIncide && (
            <div className="space-y-3">
              <div>
                <label htmlFor="aliquota-irrf" className="text-[10px] text-gray-400 uppercase font-bold block mb-1">Alíquota (%)</label>
                <input
                  id="aliquota-irrf"
                  type="number"
                  step="0.01"
                  value={irrfAliquota}
                  onChange={(e) => setIrrfAliquota(parseFloat(e.target.value) || 0)}
                  className="w-full px-2 py-1 text-xs rounded border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-50 font-mono"
                />
              </div>
              <div>
                <label htmlFor="base-irrf" className="text-[10px] text-gray-400 uppercase font-bold block mb-1">Base Padrão</label>
                <select
                  id="base-irrf"
                  value={irrfBase}
                  onChange={(e) => setIrrfBase(e.target.value as TaxBaseOption)}
                  className="w-full px-2 py-1 text-xs rounded border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-50"
                >
                  <option value={TaxBaseOption.VALOR_NF}>Valor da Nota Fiscal</option>
                  <option value={TaxBaseOption.VALOR_NF_DEDUCOES}>Valor da Nota menos Deduções</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* CSRF Config (CSLL, PIS, COFINS) */}
        <div className="p-4 rounded-xl border border-gray-150 dark:border-zinc-800 bg-gray-50/25 dark:bg-zinc-900/40">
          <div className="flex items-center justify-between mb-3">
            <span className="font-bold text-sm text-gray-800 dark:text-zinc-200">CSRF (PIS/COFINS/CSLL)</span>
            <input
              id="incide-csrf"
              type="checkbox"
              checked={csrfIncide}
              onChange={(e) => setCsrfIncide(e.target.checked)}
              className="w-4 h-4 text-blue-500"
            />
          </div>
          
          {csrfIncide && (
            <div className="space-y-3">
              <div>
                <label htmlFor="aliquota-csrf" className="text-[10px] text-gray-400 uppercase font-bold block mb-1">Alíquota (%)</label>
                <input
                  id="aliquota-csrf"
                  type="number"
                  step="0.01"
                  value={csrfAliquota}
                  onChange={(e) => setCsrfAliquota(parseFloat(e.target.value) || 0)}
                  className="w-full px-2 py-1 text-xs rounded border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-50 font-mono"
                />
              </div>
              <div>
                <label htmlFor="base-csrf" className="text-[10px] text-gray-400 uppercase font-bold block mb-1">Base Padrão</label>
                <select
                  id="base-csrf"
                  value={csrfBase}
                  onChange={(e) => setCsrfBase(e.target.value as TaxBaseOption)}
                  className="w-full px-2 py-1 text-xs rounded border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-50"
                >
                  <option value={TaxBaseOption.VALOR_NF}>Valor da Nota Fiscal</option>
                  <option value={TaxBaseOption.VALOR_NF_DEDUCOES}>Valor da Nota menos Deduções</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* ISS Config */}
        <div className="p-4 rounded-xl border border-gray-150 dark:border-zinc-800 bg-gray-50/25 dark:bg-zinc-900/40">
          <div className="flex items-center justify-between mb-3">
            <span className="font-bold text-sm text-gray-800 dark:text-zinc-200">ISS</span>
            <input
              id="incide-iss"
              type="checkbox"
              checked={issIncide}
              onChange={(e) => setIssIncide(e.target.checked)}
              className="w-4 h-4 text-blue-500"
            />
          </div>
          
          {issIncide && (
            <div className="space-y-3">
              <div>
                <label htmlFor="aliquota-iss" className="text-[10px] text-gray-400 uppercase font-bold block mb-1">Alíquota (%)</label>
                <input
                  id="aliquota-iss"
                  type="number"
                  step="0.01"
                  value={issAliquota}
                  onChange={(e) => setIssAliquota(parseFloat(e.target.value) || 0)}
                  className="w-full px-2 py-1 text-xs rounded border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-50 font-mono"
                />
              </div>
              <div>
                <label htmlFor="base-iss" className="text-[10px] text-gray-400 uppercase font-bold block mb-1">Base Padrão</label>
                <select
                  id="base-iss"
                  value={issBase}
                  onChange={(e) => setIssBase(e.target.value as TaxBaseOption)}
                  className="w-full px-2 py-1 text-xs rounded border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-50"
                >
                  <option value={TaxBaseOption.VALOR_NF}>Valor da Nota Fiscal</option>
                  <option value={TaxBaseOption.VALOR_NF_DEDUCOES}>Valor da Nota menos Deduções</option>
                </select>
              </div>
            </div>
          )}
        </div>

      </div>

      <div className="flex justify-end gap-3 border-t border-gray-150 dark:border-zinc-800 pt-4">
        <button
          id="btn-cancel-supplier"
          type="button"
          onClick={resetForm}
          className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg cursor-pointer transition text-center"
        >
          Cancelar
        </button>
        <button
          id="btn-save-supplier-submit"
          type="submit"
          className="px-5 py-2 text-xs font-semibold uppercase tracking-wider text-white bg-blue-600 hover:bg-blue-500 rounded-lg cursor-pointer shadow-md transition"
        >
          {editingSupplier ? 'Salvar Alterações' : 'Gravar no Banco'}
        </button>
      </div>
    </>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-zinc-50 tracking-tight font-sans">
            Módulo de Fornecedores
          </h2>
        </div>

        {!isReadOnly && (
          <button
            id="btn-trigger-add-supplier"
            onClick={() => {
              if (showForm) resetForm();
              else setShowForm(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 dark:bg-blue-500 dark:hover:bg-blue-400 text-white font-semibold rounded-xl text-xs uppercase tracking-wider cursor-pointer shadow-sm transition self-start sm:self-auto"
          >
            <PlusCircle className="w-4 h-4" />
            {showForm ? 'Fechar Form' : 'Novo Fornecedor'}
          </button>
        )}
      </div>

      {successMessage && (
        <div id="supplier-success-box" className="p-4 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center gap-3 text-sm font-semibold shadow-sm border border-emerald-100 dark:border-emerald-900/35">
          <ShieldCheck className="w-5 h-5 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div id="supplier-error-box" className="p-4 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 rounded-xl flex items-center gap-3 text-sm font-semibold shadow-sm border border-red-100 dark:border-red-900/35">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Formulário de Cadastro (Criação - Inline) */}
      {showForm && !editingSupplier && !isReadOnly && (
        <form onSubmit={handleSave} className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm space-y-6">
          {renderFormContent()}
        </form>
      )}

      {/* Modal de Edição (Janela Flutuante para Iframe safe) */}
      {showForm && editingSupplier && !isReadOnly && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200 overflow-y-auto">
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-850 rounded-3xl max-w-4xl w-full p-6 shadow-2xl space-y-6 my-8 text-left animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto relative">
            <button
              type="button"
              onClick={resetForm}
              className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 dark:hover:text-zinc-200 cursor-pointer transition p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800"
              title="Fechar Janela"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <form onSubmit={handleSave} className="space-y-6">
              {renderFormContent()}
            </form>
          </div>
        </div>
      )}

      {/* Barra de Pesquisa */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm p-4 flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
            <Search className="w-4 h-4" />
          </span>
          <input
            id="supplier-search-input"
            type="text"
            placeholder="Pesquisar fornecedores por nome, CNPJ, código ou oficina..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Tabela de Fornecedores (por Linhas) */}
      {filteredSuppliers.length === 0 ? (
        <div className="bg-white dark:bg-zinc-900 p-12 text-center rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm text-gray-400">
          Nenhum fornecedor localizado com os critérios informados.
        </div>
      ) : (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/75 dark:bg-zinc-800/20 border-b border-gray-100 dark:border-zinc-800 text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500">
                  <th className="px-6 py-4">Fornecedor / CNPJ</th>
                  <th className="px-6 py-4">Código (MV)</th>
                  <th className="px-6 py-4">Oficina / Serviço</th>
                  <th className="px-6 py-4">CPRB</th>
                  <th className="px-6 py-4">Retenções Tributárias</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-zinc-800/80">
                {filteredSuppliers.map((sup) => (
                  <tr 
                    key={sup.id} 
                    id={`supplier-row-${sup.id}`}
                    className="hover:bg-gray-50/30 dark:hover:bg-zinc-800/10 transition-colors text-xs text-gray-700 dark:text-zinc-300"
                  >
                    {/* Fornecedor / CNPJ */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 rounded-xl shrink-0">
                          <Building2 className="w-5 h-5" />
                        </div>
                        <div className="truncate max-w-[240px]">
                          <div className="font-bold text-sm text-gray-900 dark:text-zinc-100 leading-tight truncate">
                            {sup.nome}
                          </div>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className="text-[10px] text-gray-400 font-mono">
                              CNPJ: {sup.cnpj}
                            </span>
                            {sup.simplesNacional && (
                              <span className="text-[9px] font-bold bg-amber-50 dark:bg-amber-950/35 text-amber-700 dark:text-amber-400 border border-amber-200/50 dark:border-amber-900/30 px-1.5 py-0.5 rounded-lg shrink-0">
                                Simples Nacional
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Código MV */}
                    <td className="px-6 py-4 font-mono font-bold text-gray-800 dark:text-zinc-300">
                      {sup.codigoMV}
                    </td>

                    {/* Oficina / Serviço */}
                    <td className="px-6 py-4 space-y-1">
                      <div className="font-semibold text-gray-900 dark:text-zinc-200">
                        {sup.oficinaMV}
                      </div>
                      <div className="text-[10px] font-mono text-gray-400 dark:text-zinc-500">
                        Cód. LC 116: {sup.codigoServico}
                      </div>
                    </td>

                    {/* CPRB */}
                    <td className="px-6 py-4">
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full inline-block ${
                        sup.cprb 
                          ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-400 border border-emerald-100/30 dark:border-emerald-900/10' 
                          : 'bg-gray-50 text-gray-500 dark:bg-zinc-850 dark:text-zinc-400 border border-gray-100'
                      }`}>
                        {sup.cprb ? 'SIM (3.5%)' : 'NÃO (11%)'}
                      </span>
                    </td>

                    {/* Retenções Tributárias */}
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1.5">
                        {/* INSS */}
                        <span 
                          className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono border ${
                            sup.inss.incide 
                              ? 'bg-blue-50/50 text-blue-600 border-blue-100 dark:bg-blue-955/20 dark:text-blue-300 dark:border-blue-900/30' 
                              : 'bg-gray-50/50 text-gray-400 border-transparent dark:bg-zinc-800/40'
                          }`}
                          title={`INSS Base: ${sup.inss.baseCalculoPadrao}`}
                        >
                          INSS: {sup.inss.incide ? `${sup.inss.aliquota}%` : 'Não'}
                        </span>

                        {/* IRRF */}
                        <span 
                          className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono border ${
                            sup.irrf.incide 
                              ? 'bg-amber-50/50 text-amber-600 border-amber-100 dark:bg-amber-955/20 dark:text-amber-300 dark:border-amber-900/30' 
                              : 'bg-gray-50/50 text-gray-400 border-transparent dark:bg-zinc-800/40'
                          }`}
                          title={`IRRF Base: ${sup.irrf.baseCalculoPadrao}`}
                        >
                          IRRF: {sup.irrf.incide ? `${sup.irrf.aliquota}%` : 'Não'}
                        </span>

                        {/* CSRF */}
                        <span 
                          className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono border ${
                            sup.csrf.incide 
                              ? 'bg-purple-50/50 text-purple-600 border-purple-100 dark:bg-purple-955/20 dark:text-purple-300 dark:border-purple-900/30' 
                              : 'bg-gray-50/50 text-gray-400 border-transparent dark:bg-zinc-800/40'
                          }`}
                          title={`CSRF Base: ${sup.csrf.baseCalculoPadrao}`}
                        >
                          CSRF: {sup.csrf.incide ? `${sup.csrf.aliquota}%` : 'Não'}
                        </span>

                        {/* ISS */}
                        <span 
                          className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono border ${
                            sup.iss.incide 
                              ? 'bg-teal-50/50 text-teal-600 border-teal-100 dark:bg-teal-955/20 dark:text-teal-300 dark:border-teal-900/30' 
                              : 'bg-gray-50/50 text-gray-400 border-transparent dark:bg-zinc-800/40'
                          }`}
                          title={`ISS Base: ${sup.iss.baseCalculoPadrao}`}
                        >
                          ISS: {sup.iss.incide ? `${sup.iss.aliquota}%` : 'Não'}
                        </span>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4 text-center">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        sup.status === 'Ativo' 
                          ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400' 
                          : 'bg-red-50 text-red-800 dark:bg-red-950/30 dark:text-red-400'
                      }`}>
                        {sup.status}
                      </span>
                    </td>

                    {/* Ações */}
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {!isReadOnly ? (
                          <>
                            <button
                              id={`btn-edit-supplier-${sup.id}`}
                              onClick={() => handleEditClick(sup)}
                              title="Editar parametrização tributária"
                              className="p-1 px-2 bg-gray-50 hover:bg-blue-50 text-gray-500 hover:text-blue-600 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-400 dark:hover:text-blue-400 rounded transition font-bold flex items-center gap-1 cursor-pointer"
                            >
                              <Edit className="w-3.5 h-3.5" />
                              <span>Editar</span>
                            </button>
                            
                            <button
                              id={`btn-delete-supplier-${sup.id}`}
                              onClick={() => handleDeleteClick(sup)}
                              title="Excluir Fornecedor"
                              className="p-1 px-2 bg-red-50 hover:bg-red-100/65 text-red-500 hover:text-red-700 dark:bg-red-950/20 dark:hover:bg-red-950/40 dark:text-red-400 dark:hover:text-red-300 rounded transition font-bold flex items-center gap-1 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Excluir</span>
                            </button>
                          </>
                        ) : (
                          <span className="text-[10px] text-gray-400 dark:text-zinc-500 italic">Apenas Visualização</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão de Fornecedor */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-slate-900/85 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-850 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 font-sans text-left animate-in zoom-in-95 duration-200">
            <div className="flex items-start gap-3 text-red-600 dark:text-red-400">
              <AlertCircle className="w-6 h-6 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-zinc-50">Confirmação de Exclusão</h3>
                <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">
                  Confirma a exclusão definitiva do Fornecedor: <strong className="font-mono text-xs bg-gray-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">{deleteTarget.nome}</strong>?
                </p>
              </div>
            </div>
            
            <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 p-3 rounded-xl border border-amber-200 dark:border-amber-900/30">
              Esta operação é irreversível e removerá todos os vínculos paramétricos de faturamento relacionados a este cadastro no ERP.
            </p>

            <div className="flex justify-end gap-3 mt-4">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-700 dark:text-zinc-300 rounded-xl text-xs font-semibold cursor-pointer transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-semibold cursor-pointer transition shadow-sm"
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
