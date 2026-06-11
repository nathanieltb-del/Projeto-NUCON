/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { DBService } from '../services/db';
import { AccountingProcess, Supplier, CostCenter, Unit, UserProfile, TaxBaseOption } from '../types';
import { 
  formatarMoeda, formatarCNPJ, formatarSEI, validarProcessoSEI, 
  formatarDataHora, formatarCompetencia 
} from '../utils/validation';
import { 
  Search, FilePlus2, Printer, Download, Eye, Edit, Trash2, 
  Info, AlertCircle, CheckCircle2, ChevronDown, ChevronUp, FileSpreadsheet, Scale,
  History, ClipboardCopy
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';

interface ProcessesProps {
  currentUserProfile: UserProfile;
}

export default function ProcessesView({ currentUserProfile }: ProcessesProps) {
  const [processes, setProcesses] = useState<AccountingProcess[]>(() => DBService.getProcesses());
  const [suppliers, setSuppliers] = useState<Supplier[]>(() => DBService.getSuppliers().filter(s => s.status === 'Ativo'));
  const [costCenters, setCostCenters] = useState<CostCenter[]>(() => DBService.getCostCenters().filter(cc => cc.status === 'Ativo'));
  const [units, setUnits] = useState<Unit[]>(() => DBService.getUnits().filter(u => u.status === 'Ativo'));

  // Sincronização em tempo real via Firestore / DBService
  useEffect(() => {
    const unsubscribe = DBService.subscribe(() => {
      setProcesses(DBService.getProcesses());
      setSuppliers(DBService.getSuppliers().filter(s => s.status === 'Ativo'));
      setCostCenters(DBService.getCostCenters().filter(cc => cc.status === 'Ativo'));
      setUnits(DBService.getUnits().filter(u => u.status === 'Ativo'));
    });
    return unsubscribe;
  }, []);

  // Filtros de pesquisa
  const [filterSEI, setFilterSEI] = useState('');
  const [filterFornecedorId, setFilterFornecedorId] = useState('');
  const [filterNotaFiscal, setFilterNotaFiscal] = useState('');
  const [filterCompetencia, setFilterCompetencia] = useState('');
  const [filterCentroCusto, setFilterCentroCusto] = useState('');
  const [filterUnidade, setFilterUnidade] = useState('');
  const [filterContrato, setFilterContrato] = useState('');
  
  // Controle de Visualização
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProcessId, setEditingProcessId] = useState<string | null>(null);
  const [viewingProcess, setViewingProcess] = useState<AccountingProcess | null>(null);
  const [isPrintingReport, setIsPrintingReport] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string, sei: string } | null>(null);
  const [historyTargetProcess, setHistoryTargetProcess] = useState<AccountingProcess | null>(null);
  const [copiedHistory, setCopiedHistory] = useState(false);

  // Form Fields
  const [numeroSEI, setNumeroSEI] = useState('');
  const [fornecedorId, setFornecedorId] = useState('');
  const [notaFiscal, setNotaFiscal] = useState('');
  const [contrato, setContrato] = useState('');
  const [competenciaServico, setCompetenciaServico] = useState(''); // ex: "2026-06"
  const [dataEmissao, setDataEmissao] = useState('');
  const [dataAtesto, setDataAtesto] = useState('');
  const [centroCustoId, setCentroCustoId] = useState('');
  const [unidadeId, setUnidadeId] = useState('');
  const [valorNotaFiscal, setValorNotaFiscal] = useState<number>(0);
  const [deducoesINSS, setDeducoesINSS] = useState<number>(0);
  const [descricaoServicos, setDescricaoServicos] = useState('');

  // Estados de erro e validações
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  const isReadOnly = currentUserProfile === UserProfile.CONSULTA;
  const canDelete = currentUserProfile === UserProfile.ADMINISTRADOR;

  // Auto-completar do Fornecedor ao selecionar
  const selectedSupplier = useMemo(() => {
    return suppliers.find(s => s.id === fornecedorId) || null;
  }, [fornecedorId, suppliers]);

  // Alimenta deduções recomendadas caso haja alteração de fornecedor
  useEffect(() => {
    if (selectedSupplier && !editingProcessId) {
      // Configurações padrão ou resets podem ser preenchidos se necessário
    }
  }, [selectedSupplier, editingProcessId]);

  // Cálculos em tempo real
  const calculations = useMemo(() => {
    const rawNF = Number(valorNotaFiscal) || 0;
    const rawDed = Number(deducoesINSS) || 0;
    
    // Regra: Base de Cálculo = Valor da Nota Fiscal - Deduções do INSS
    const baseCalculo = Math.max(0, rawNF - rawDed);

    if (!selectedSupplier) {
      return {
        baseCalculo,
        inssVal: 0, inssBase: 0,
        irrfVal: 0, irrfBase: 0,
        csrfVal: 0, csrfBase: 0,
        issVal: 0, issBase: 0,
        liquido: baseCalculo
      };
    }

    const s = selectedSupplier;

    // Helper para decidir o valor da Base conforme parametrização do Fornecedor
    const obterBaseValue = (option: TaxBaseOption) => {
      if (option === TaxBaseOption.VALOR_NF_DEDUCOES) {
        return baseCalculo; // Valor da Nota menos Deduções
      }
      return rawNF; // Valor da Nota Fiscal padrão
    };

    // 1. INSS
    let inssBase = 0;
    let inssVal = 0;
    let inssAliq = s.inss.aliquota;

    if (s.inss.incide) {
      inssBase = obterBaseValue(s.inss.baseCalculoPadrao);
      
      // Regra CPRB: Se CPRB = SIM, alíquota de INSS geralmente é reduzida (ex: 3.5%) e já vem configurada no fornecedor
      inssVal = inssBase * (inssAliq / 100);
    }

    // 2. IRRF
    let irrfBase = 0;
    let irrfVal = 0;
    if (s.irrf.incide) {
      irrfBase = obterBaseValue(s.irrf.baseCalculoPadrao);
      irrfVal = irrfBase * (s.irrf.aliquota / 100);
    }

    // 3. CSRF
    let csrfBase = 0;
    let csrfVal = 0;
    if (s.csrf.incide) {
      csrfBase = obterBaseValue(s.csrf.baseCalculoPadrao);
      csrfVal = csrfBase * (s.csrf.aliquota / 100);
    }

    // 4. ISS
    let issBase = 0;
    let issVal = 0;
    if (s.iss.incide) {
      issBase = obterBaseValue(s.iss.baseCalculoPadrao);
      issVal = issBase * (s.iss.aliquota / 100);
    }

    // Cálculo do valor líquido conforme requisito literal:
    // Valor Líquido = Base de Cálculo - INSS - IRRF - CSRF - ISS
    const liquido = Math.max(0, baseCalculo - inssVal - irrfVal - csrfVal - issVal);

    return {
      baseCalculo,
      inssBase, inssVal, inssAliq,
      irrfBase, irrfVal,
      csrfBase, csrfVal,
      issBase, issVal,
      liquido
    };
  }, [valorNotaFiscal, deducoesINSS, selectedSupplier]);

  // Filtros Avançados de Processos
  const filteredProcesses = useMemo(() => {
    return processes.filter(p => {
      const matchSEI = !filterSEI || p.numeroSEI.includes(filterSEI);
      const matchForn = !filterFornecedorId || p.fornecedorId === filterFornecedorId;
      const matchNF = !filterNotaFiscal || p.notaFiscal.includes(filterNotaFiscal);
      const matchComp = !filterCompetencia || p.competenciaServico === filterCompetencia;
      const matchCC = !filterCentroCusto || p.centroCustoId === filterCentroCusto;
      const matchUnidade = !filterUnidade || p.unidadeId === filterUnidade;
      const matchContrato = !filterContrato || p.contrato.toLowerCase().includes(filterContrato.toLowerCase());
      
      return matchSEI && matchForn && matchNF && matchComp && matchCC && matchUnidade && matchContrato;
    });
  }, [processes, filterSEI, filterFornecedorId, filterNotaFiscal, filterCompetencia, filterCentroCusto, filterUnidade, filterContrato]);

  const formatarDataLocal = (dateStr: string) => {
    if (!dateStr || !dateStr.includes('-')) return dateStr;
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  const totals = useMemo(() => {
    return filteredProcesses.reduce(
      (acc, p) => {
        acc.valorNotaFiscal += p.valorNotaFiscal;
        acc.deducoesINSS += p.deducoesINSS || 0;
        acc.baseCalculoCalculada += p.baseCalculoCalculada || 0;
        acc.inssValor += p.inssValor;
        acc.irrfValor += p.irrfValor;
        acc.csrfValor += p.csrfValor;
        acc.issValor += p.issValor;
        acc.totalRetido += p.inssValor + p.irrfValor + p.csrfValor + p.issValor;
        acc.valorLiquido += p.valorLiquido;
        return acc;
      },
      {
        valorNotaFiscal: 0,
        deducoesINSS: 0,
        baseCalculoCalculada: 0,
        inssValor: 0,
        irrfValor: 0,
        csrfValor: 0,
        issValor: 0,
        totalRetido: 0,
        valorLiquido: 0,
      }
    );
  }, [filteredProcesses]);

  const handleSeiChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNumeroSEI(formatarSEI(e.target.value));
  };

  const handleOpenAdd = () => {
    if (isReadOnly) return;
    setEditingProcessId(null);
    setViewingProcess(null);

    setNumeroSEI('');
    setFornecedorId('');
    setNotaFiscal('');
    setContrato('');
    setCompetenciaServico('');
    setDataEmissao('');
    setDataAtesto('');
    setCentroCustoId('');
    setUnidadeId('');
    setValorNotaFiscal(0);
    setDeducoesINSS(0);
    setDescricaoServicos('');
    setFormError('');
    setFormSuccess('');

    setIsFormOpen(true);
  };

  const handleEdit = (p: AccountingProcess) => {
    if (isReadOnly) return;
    setEditingProcessId(p.id);
    setViewingProcess(null);

    setNumeroSEI(p.numeroSEI);
    setFornecedorId(p.fornecedorId);
    setNotaFiscal(p.notaFiscal);
    setContrato(p.contrato);
    setCompetenciaServico(p.competenciaServico);
    setDataEmissao(p.dataEmissao);
    setDataAtesto(p.dataAtesto);
    setCentroCustoId(p.centroCustoId);
    setUnidadeId(p.unidadeId);
    setValorNotaFiscal(p.valorNotaFiscal);
    setDeducoesINSS(p.deducoesINSS);
    setDescricaoServicos(p.descricaoServicos);
    setFormError('');
    setFormSuccess('');

    setIsFormOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = (id: string, sei: string) => {
    if (!canDelete) {
      return;
    }
    setDeleteTarget({ id, sei });
  };

  const handleSaveProcess = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (isReadOnly) return;

    // VALIDATION RULES
    if (!numeroSEI || !fornecedorId || !notaFiscal || !contrato || !competenciaServico || !dataEmissao || !dataAtesto || !centroCustoId || !unidadeId) {
      setFormError('Todos os campos obrigatórios (*) devem ser preenchidos.');
      return;
    }

    if (!validarProcessoSEI(numeroSEI)) {
      setFormError('Formato inválido do Processo SEI. Use o padrão oficial: XXXXX-XXXXXXXX/XXXX-XX.');
      return;
    }

    if (Number(valorNotaFiscal) <= 0) {
      setFormError('O Valor da Nota Fiscal precisa ser um número positivo.');
      return;
    }

    if (Number(deducoesINSS) < 0) {
      setFormError('As deduções do INSS não podem ser valores negativos.');
      return;
    }

    // Validações de datas simples
    const emissaoDate = new Date(dataEmissao);
    const atestoDate = new Date(dataAtesto);
    if (isNaN(emissaoDate.getTime()) || isNaN(atestoDate.getTime())) {
      setFormError('Insira datas válidas.');
      return;
    }

    const processPayload: Omit<AccountingProcess, 'id' | 'dataCriacao' | 'criadoPor' | 'criadoPorId'> = {
      numeroSEI,
      fornecedorId,
      notaFiscal,
      contrato,
      competenciaServico,
      dataEmissao,
      dataAtesto,
      centroCustoId,
      unidadeId,
      
      valorNotaFiscal: Number(valorNotaFiscal),
      deducoesINSS: Number(deducoesINSS),
      
      baseCalculoCalculada: calculations.baseCalculo,
      
      inssIncide: selectedSupplier!.inss.incide,
      inssBase: calculations.inssBase,
      inssAliquota: calculations.inssAliq,
      inssValor: calculations.inssVal,
      
      irrfIncide: selectedSupplier!.irrf.incide,
      irrfBase: calculations.irrfBase,
      irrfAliquota: selectedSupplier!.irrf.aliquota,
      irrfValor: calculations.irrfVal,
      
      csrfIncide: selectedSupplier!.csrf.incide,
      csrfBase: calculations.csrfBase,
      csrfAliquota: selectedSupplier!.csrf.aliquota,
      csrfValor: calculations.csrfVal,
      
      issIncide: selectedSupplier!.iss.incide,
      issBase: calculations.issBase,
      issAliquota: selectedSupplier!.iss.aliquota,
      issValor: calculations.issVal,
      
      valorLiquido: calculations.liquido,
      descricaoServicos,
      status: 'Processado'
    };

    if (editingProcessId) {
      DBService.updateProcess(editingProcessId, processPayload);
      setFormSuccess('Processo contábil atualizado e relatórios consolidados!');
    } else {
      DBService.addProcess(processPayload);
      setFormSuccess('Processo SEI faturado e salvo com sucesso!');
    }

    setProcesses(DBService.getProcesses());
    setTimeout(() => {
      setIsFormOpen(false);
      setEditingProcessId(null);
    }, 1500);
  };

  // Exportar Excel usando SheetJS
  const exportToExcel = () => {
    const dataToExport = filteredProcesses.map(p => {
      const f = suppliers.find(sup => sup.id === p.fornecedorId);
      const cc = costCenters.find(c => c.id === p.centroCustoId);
      const u = units.find(un => un.id === p.unidadeId);

      return {
        'Processo SEI': p.numeroSEI,
        'Fornecedor': f?.nome || 'Não especificado',
        'CNPJ Fornecedor': f?.cnpj || '',
        'Oficina MV': f?.oficinaMV || '',
        'Código Serviço': f?.codigoServico || '',
        'Nota Fiscal': p.notaFiscal,
        'Contrato': p.contrato,
        'Competência': formatarCompetencia(p.competenciaServico),
        'Data Emissão': p.dataEmissao,
        'Data Atesto': p.dataAtesto,
        'Centro de Custo': cc ? `${cc.id} - ${cc.descricao}` : '',
        'Unidade MV': u ? `${u.id} - ${u.nome}` : '',
        'Valor Bruto NF': p.valorNotaFiscal,
        'Deduções INSS': p.deducoesINSS,
        'Base de Cálculo': p.baseCalculoCalculada,
        'INSS Retido': p.inssValor,
        'IRRF Retido': p.irrfValor,
        'CSRF Retido': p.csrfValor,
        'ISS Retido': p.issValor,
        'Valor Líquido': p.valorLiquido,
        'Descrição Serviços': p.descricaoServicos,
        'Criado Por': p.criadoPor,
        'Data de Registro': formatarDataHora(p.dataCriacao)
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Processos e Retenções');
    
    // Auto-ajusta largura das colunas
    const max_len = dataToExport.reduce((w, r) => Math.max(w, Object.values(r).join('').length), 10);
    worksheet['!cols'] = Array(24).fill({ wch: 18 });

    XLSX.writeFile(workbook, `Processos_Contabeis_Retencoes_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handlePrint = (p: AccountingProcess) => {
    setIsPrintingReport(false);
    setViewingProcess(p);
    setTimeout(() => {
      window.print();
    }, 500);
  };

  return (
    <div className="space-y-6">
      
      {/* Imprimir via CSS de Mídia para PDF elegante */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
            background: white !important;
            color: black !important;
          }
          #print-area, #print-area * {
            visibility: visible;
          }
          #print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 30px;
          }
        }
      `}</style>

      {/* Visualização de Impressão com Pré-visualização Elegante em Tela */}
      {viewingProcess && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto print:p-0 print:bg-transparent print:backdrop-blur-none animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full flex flex-col max-h-[90vh] shadow-xl font-sans print:border-none print:bg-white print:max-h-full print:shadow-none print:rounded-none">
            
            {/* Cabeçalho do Visualizador (Oculto na impressão real) */}
            <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950 rounded-t-2xl print:hidden">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-blue-500" />
                <h3 className="text-sm font-bold text-white font-sans">Comprovante de Conferência Tributária</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold cursor-pointer flex items-center gap-1.5 transition"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Imprimir Comprovante
                </button>
                <button
                  type="button"
                  onClick={() => setViewingProcess(null)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold cursor-pointer transition"
                >
                  Fechar
                </button>
              </div>
            </div>

            {/* Área de Visualização com Scroll */}
            <div className="overflow-y-auto p-6 bg-slate-950/20 print:p-0 print:overflow-visible print:bg-white flex justify-center w-full">
              <div id="print-area" className="bg-white text-black p-8 font-sans w-full max-w-[800px] shadow-lg rounded-xl border border-gray-200 print:shadow-none print:border-none print:rounded-none print:p-0 text-left">
          <div className="border-b-4 border-emerald-600 pb-4 mb-6 flex justify-between items-center">
            <div>
              <h1 className="text-xl font-bold uppercase text-gray-900">Comprovante de Conferência Tributária</h1>
              <p className="text-xs text-gray-500 font-mono mt-1">ERP Integrado MV | Controle SEI</p>
            </div>
            <div className="text-right">
              <span className="text-xs bg-gray-100 px-3 py-1.5 rounded font-bold font-mono">
                SEI {viewingProcess.numeroSEI}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs mb-6">
            <div>
              <p className="font-bold uppercase text-gray-500">Dados do Fornecedor</p>
              <p className="font-semibold text-sm text-gray-800">{suppliers.find(s => s.id === viewingProcess.fornecedorId)?.nome}</p>
              <p className="font-mono">CNPJ: {suppliers.find(s => s.id === viewingProcess.fornecedorId)?.cnpj}</p>
              <p className="font-mono">Oficina MV: {suppliers.find(s => s.id === viewingProcess.fornecedorId)?.oficinaMV}</p>
              <p className="font-mono">Cód de Serviço: {suppliers.find(s => s.id === viewingProcess.fornecedorId)?.codigoServico}</p>
            </div>
            <div>
              <p className="font-bold uppercase text-gray-500">Dados do Faturamento</p>
              <p className="font-semibold">Nota Fiscal: {viewingProcess.notaFiscal}</p>
              <p>Contrato: {viewingProcess.contrato}</p>
              <p>Competência: {formatarCompetencia(viewingProcess.competenciaServico)}</p>
              <p>Emissão: {viewingProcess.dataEmissao} | Atesto: {viewingProcess.dataAtesto}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs mb-6">
            <div>
              <p className="font-bold uppercase text-gray-500">Alocação Setorial</p>
              <p>Centro de Custo: {costCenters.find(cc => cc.id === viewingProcess.centroCustoId)?.id} - {costCenters.find(cc => cc.id === viewingProcess.centroCustoId)?.descricao}</p>
              <p>Unidade (MV): {units.find(u => u.id === viewingProcess.unidadeId)?.id} - {units.find(u => u.id === viewingProcess.unidadeId)?.nome}</p>
            </div>
          </div>

          <table className="w-full text-xs text-left border-collapse border border-gray-200 mb-6">
            <thead>
              <tr className="bg-gray-100 font-bold border-b border-gray-250">
                <th className="p-2 border border-gray-200">Tributo Retido</th>
                <th className="p-2 border border-gray-200">Alíquota parametrizada</th>
                <th className="p-2 border border-gray-200">Base de Cálculo Aplicada</th>
                <th className="p-2 border border-gray-200 text-right">Valor Descontado</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="p-2 border border-gray-200">INSS Retido (CPRB: {suppliers.find(s => s.id === viewingProcess.fornecedorId)?.cprb ? 'Sim' : 'Não'})</td>
                <td className="p-2 border border-gray-200 font-mono">{viewingProcess.inssAliquota}%</td>
                <td className="p-2 border border-gray-200 font-mono">{formatarMoeda(viewingProcess.inssBase)}</td>
                <td className="p-2 border border-gray-200 font-mono text-right">{formatarMoeda(viewingProcess.inssValor)}</td>
              </tr>
              <tr>
                <td className="p-2 border border-gray-200 font-bold">IRRF Retido</td>
                <td className="p-2 border border-gray-200 font-mono">{viewingProcess.irrfAliquota}%</td>
                <td className="p-2 border border-gray-200 font-mono">{formatarMoeda(viewingProcess.irrfBase)}</td>
                <td className="p-2 border border-gray-200 font-mono text-right">{formatarMoeda(viewingProcess.irrfValor)}</td>
              </tr>
              <tr>
                <td className="p-2 border border-gray-200 font-bold">CSRF Retido</td>
                <td className="p-2 border border-gray-200 font-mono">{viewingProcess.csrfAliquota}%</td>
                <td className="p-2 border border-gray-200 font-mono">{formatarMoeda(viewingProcess.csrfBase)}</td>
                <td className="p-2 border border-gray-200 font-mono text-right">{formatarMoeda(viewingProcess.csrfValor)}</td>
              </tr>
              <tr>
                <td className="p-2 border border-gray-200 font-bold">ISS Retido</td>
                <td className="p-2 border border-gray-200 font-mono">{viewingProcess.issAliquota}%</td>
                <td className="p-2 border border-gray-200 font-mono">{formatarMoeda(viewingProcess.issBase)}</td>
                <td className="p-2 border border-gray-200 font-mono text-right">{formatarMoeda(viewingProcess.issValor)}</td>
              </tr>
            </tbody>
          </table>

          <div className="p-4 bg-gray-50 border border-gray-200 rounded grid grid-cols-3 gap-2 text-xs mb-6">
            <div>
              <p className="text-gray-500">Valor Bruto Nota</p>
              <p className="font-mono font-bold text-sm">{formatarMoeda(viewingProcess.valorNotaFiscal)}</p>
            </div>
            <div>
              <p className="text-gray-500">Deduções INSS</p>
              <p className="font-mono font-bold text-sm">{formatarMoeda(viewingProcess.deducoesINSS)}</p>
            </div>
            <div className="text-right">
              <p className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded inline-block font-bold">Líquido a Pagar</p>
              <p className="font-mono font-black text-base text-gray-900">{formatarMoeda(viewingProcess.valorLiquido)}</p>
            </div>
          </div>

          <div className="text-xs mb-10">
            <p className="font-bold uppercase text-gray-500">Descrição do Serviço Prestado</p>
            <p className="p-3 bg-gray-50 border border-gray-200 rounded italic mt-1 leading-relaxed">
              {viewingProcess.descricaoServicos || 'Sem descrição cadastrada'}
            </p>
          </div>

          <div className="flex justify-between items-end border-t border-gray-300 pt-8 text-[10px] text-gray-400 font-mono">
            <div>
              <p>Analista: {viewingProcess.criadoPor}</p>
              <p>Registro: {formatarDataHora(viewingProcess.dataCriacao)}</p>
            </div>
            <div className="text-right">
              ___________________________________________
              <p className="mt-1">Assinatura / Carimbo Setorial</p>
            </div>
          </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Visualização de Impressão do Relatório Analítico de Retenções */}
      {isPrintingReport && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto print:p-0 print:bg-transparent print:backdrop-blur-none animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-6xl w-full flex flex-col max-h-[90vh] shadow-xl font-sans print:border-none print:bg-white print:max-h-full print:shadow-none print:rounded-none">
            
            {/* Cabeçalho do Visualizador (Oculto na impressão real) */}
            <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950 rounded-t-2xl print:hidden">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-blue-500" />
                <h3 className="text-sm font-bold text-white font-sans">Relatório de Retenções Filtradas (PDF)</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold cursor-pointer flex items-center gap-1.5 transition animate-pulse"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Imprimir / Salvar PDF
                </button>
                <button
                  type="button"
                  onClick={() => setIsPrintingReport(false)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold cursor-pointer transition"
                >
                  Fechar
                </button>
              </div>
            </div>

            {/* Área de Visualização com Scroll */}
            <div className="overflow-y-auto p-6 bg-slate-950/20 print:p-0 print:overflow-visible print:bg-white flex justify-center w-full">
              <div id="print-area" className="bg-white text-black p-8 font-sans w-full max-w-[1100px] shadow-lg rounded-xl border border-gray-200 print:shadow-none print:border-none print:rounded-none print:p-0 text-left">
                {/* Header do Relatório */}
                <div className="border-b-4 border-blue-600 pb-4 mb-6 flex justify-between items-start">
                  <div>
                    <h1 className="text-lg font-black uppercase text-gray-900 tracking-tight">Relatório Analítico de Retenções Contábeis</h1>
                    <p className="text-xs text-gray-500 mt-1 font-mono">Retenções ERP - Integração MV</p>
                    {/* Filtros ativos */}
                    <div className="mt-2 text-xs text-gray-600 flex flex-wrap gap-2 print:hidden">
                      <span className="font-semibold text-gray-700 text-[10px]">Filtros Ativos: </span>
                      {filterSEI && <span className="bg-gray-150 px-1.5 py-0.5 rounded font-mono text-[9px] text-gray-800">SEI: {filterSEI}</span>}
                      {filterFornecedorId && <span className="bg-gray-150 px-1.5 py-0.5 rounded font-mono text-[9px] text-gray-800">Fornecedor: {suppliers.find(s => s.id === filterFornecedorId)?.nome}</span>}
                      {filterNotaFiscal && <span className="bg-gray-150 px-1.5 py-0.5 rounded font-mono text-[9px] text-gray-800">NF: {filterNotaFiscal}</span>}
                      {filterCompetencia && <span className="bg-gray-150 px-1.5 py-0.5 rounded font-mono text-[9px] text-gray-800">Comp: {formatarCompetencia(filterCompetencia)}</span>}
                      {filterCentroCusto && <span className="bg-gray-150 px-1.5 py-0.5 rounded font-mono text-[9px] text-gray-800">CC: {filterCentroCusto}</span>}
                      {filterUnidade && <span className="bg-gray-150 px-1.5 py-0.5 rounded font-mono text-[9px] text-gray-800">Unidade: {filterUnidade}</span>}
                      {filterContrato && <span className="bg-gray-150 px-1.5 py-0.5 rounded font-mono text-[9px] text-gray-800">Contrato: {filterContrato}</span>}
                      {!filterSEI && !filterFornecedorId && !filterNotaFiscal && !filterCompetencia && !filterCentroCusto && !filterUnidade && !filterContrato && (
                        <span className="text-gray-400 italic text-[10px]">Nenhum filtro aplicado (Lista completa)</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right text-[10px] font-mono text-gray-500">
                    <p>Emissão: {new Date().toLocaleDateString('pt-BR')} {new Date().toLocaleTimeString('pt-BR')}</p>
                    <p>Usuário-Analista: {DBService.getCurrentUser()?.nome || 'Analista'}</p>
                    <p className="text-blue-600 font-bold mt-1 text-[11px]">Total de Itens: {filteredProcesses.length}</p>
                  </div>
                </div>

                {/* Tabela do Relatório */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[9px] border-collapse mb-8 min-w-[1000px]">
                    <thead>
                      <tr className="border-b-2 border-gray-300 bg-gray-50 text-gray-700 uppercase font-bold text-[8px]">
                        <th className="py-2 px-1 border-b w-[10%]">SEI</th>
                        <th className="py-2 px-1 border-b w-[18%]">Fornecedor</th>
                        <th className="py-2 px-1 border-b w-[8%] text-center">Nota Fiscal</th>
                        <th className="py-2 px-1 border-b w-[6%] text-center">Comp.</th>
                        <th className="py-2 px-1 border-b w-[9%] text-right">V. Bruto</th>
                        <th className="py-2 px-1 border-b w-[7%] text-right text-gray-500">Deduções</th>
                        <th className="py-2 px-1 border-b w-[8%] text-right text-gray-600">Base Calc.</th>
                        <th className="py-2 px-1 border-b w-[6%] text-right text-blue-700">INSS</th>
                        <th className="py-2 px-1 border-b w-[6%] text-right text-amber-700">IRRF</th>
                        <th className="py-2 px-1 border-b w-[6%] text-right text-purple-700">CSRF</th>
                        <th className="py-2 px-1 border-b w-[6%] text-right text-teal-700">ISS</th>
                        <th className="py-2 px-1 border-b w-[8%] text-right text-red-700 font-bold">Total Retido</th>
                        <th className="py-2 px-1 border-b w-[10%] text-right text-emerald-700 font-bold">V. Líquido</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {filteredProcesses.map((p) => {
                        const forn = suppliers.find(su => su.id === p.fornecedorId);
                        const totalRetido = p.inssValor + p.irrfValor + p.csrfValor + p.issValor;
                        return (
                          <tr key={p.id} className="hover:bg-gray-50 font-sans">
                            <td className="py-1.5 px-0.5 font-mono text-[9px] font-semibold text-gray-800">{p.numeroSEI}</td>
                            <td className="py-1.5 px-0.5 leading-tight">
                              <span className="font-semibold block truncate text-gray-900 max-w-[180px]">{forn?.nome || 'Não localizado'}</span>
                              <span className="text-[8px] text-gray-500 font-mono block">{forn ? formatarCNPJ(forn.cnpj) : ''}</span>
                            </td>
                            <td className="py-1.5 px-0.5 font-mono text-center text-gray-700">{p.notaFiscal}</td>
                            <td className="py-1.5 px-0.5 font-mono text-center text-gray-700">{formatarCompetencia(p.competenciaServico)}</td>
                            <td className="py-1.5 px-0.5 text-right font-mono text-gray-800 font-medium">{formatarMoeda(p.valorNotaFiscal)}</td>
                            <td className="py-1.5 px-0.5 text-right font-mono text-gray-500">{formatarMoeda(p.deducoesINSS || 0)}</td>
                            <td className="py-1.5 px-0.5 text-right font-mono text-gray-600">{formatarMoeda(p.baseCalculoCalculada)}</td>
                            <td className="py-1.5 px-0.5 text-right font-mono text-blue-700">{p.inssValor > 0 ? formatarMoeda(p.inssValor) : '-'}</td>
                            <td className="py-1.5 px-0.5 text-right font-mono text-amber-700">{p.irrfValor > 0 ? formatarMoeda(p.irrfValor) : '-'}</td>
                            <td className="py-1.5 px-0.5 text-right font-mono text-purple-700">{p.csrfValor > 0 ? formatarMoeda(p.csrfValor) : '-'}</td>
                            <td className="py-1.5 px-0.5 text-right font-mono text-teal-700">{p.issValor > 0 ? formatarMoeda(p.issValor) : '-'}</td>
                            <td className="py-1.5 px-0.5 text-right font-mono text-red-700 font-bold">{formatarMoeda(totalRetido)}</td>
                            <td className="py-1.5 px-0.5 text-right font-mono text-emerald-800 font-bold bg-emerald-50/20">{formatarMoeda(p.valorLiquido)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-gray-400 bg-gray-100 font-bold text-gray-900 border-b-2 text-[8px]">
                        <td colSpan={4} className="py-2.5 px-0.5 text-left font-sans uppercase">Soma Totais ({filteredProcesses.length})</td>
                        <td className="py-2.5 px-0.5 text-right font-mono">{formatarMoeda(totals.valorNotaFiscal)}</td>
                        <td className="py-2.5 px-0.5 text-right font-mono text-gray-500">{formatarMoeda(totals.deducoesINSS)}</td>
                        <td className="py-2.5 px-0.5 text-right font-mono text-gray-600">{formatarMoeda(totals.baseCalculoCalculada)}</td>
                        <td className="py-2.5 px-0.5 text-right font-mono text-blue-800">{formatarMoeda(totals.inssValor)}</td>
                        <td className="py-2.5 px-0.5 text-right font-mono text-amber-800">{formatarMoeda(totals.irrfValor)}</td>
                        <td className="py-2.5 px-0.5 text-right font-mono text-purple-800">{formatarMoeda(totals.csrfValor)}</td>
                        <td className="py-2.5 px-0.5 text-right font-mono text-teal-800">{formatarMoeda(totals.issValor)}</td>
                        <td className="py-2.5 px-0.5 text-right font-mono text-red-800">{formatarMoeda(totals.totalRetido)}</td>
                        <td className="py-2.5 px-0.5 text-right font-mono text-emerald-950 bg-emerald-100/30">{formatarMoeda(totals.valorLiquido)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Notas e rodapé do PDF */}
                <div className="grid grid-cols-2 gap-4 mt-8 pt-6 border-t border-gray-250 font-sans">
                  <div className="text-[9px] text-gray-500 pr-4 leading-relaxed">
                    <p className="font-bold uppercase text-gray-700">Responsabilidade Fiscal e Conferência</p>
                    <p className="mt-1">
                      Este documento reflete as retenções tributárias consolidadas de conformidade com as legislações federais e municipais vigentes, prontas para faturamento no ERP MV.
                    </p>
                  </div>
                  <div className="text-right flex flex-col justify-end items-end text-[9px] text-gray-600 space-y-1">
                    <div className="w-[200px] border-b border-gray-400 text-center pb-1 font-semibold text-gray-900">
                      {DBService.getCurrentUser()?.nome || 'Analista Contábil'}
                    </div>
                    <span className="mr-14 mt-1 font-mono text-[8px] text-gray-400">Assinatura do Analista Responsável</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header Central */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-zinc-50 tracking-tight font-sans">
            Processos Contábeis e Retenções
          </h2>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            id="btn-export-excel-processes"
            onClick={exportToExcel}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-gray-100 hover:bg-gray-250 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-700 dark:text-zinc-300 font-semibold rounded-xl text-xs uppercase tracking-wider cursor-pointer border border-transparent hover:border-gray-250 dark:hover:border-zinc-700 transition"
          >
            <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            Exportar Excel
          </button>

          <button
            id="btn-export-pdf-processes"
            onClick={() => {
              setViewingProcess(null);
              setIsPrintingReport(true);
            }}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-gray-100 hover:bg-gray-250 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-700 dark:text-zinc-300 font-semibold rounded-xl text-xs uppercase tracking-wider cursor-pointer border border-transparent hover:border-gray-250 dark:hover:border-zinc-700 transition"
          >
            <Printer className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            Relatório PDF
          </button>

          {!isReadOnly && (
            <button
              id="btn-open-form-process"
              onClick={handleOpenAdd}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 dark:bg-blue-500 dark:hover:bg-blue-400 text-white font-semibold rounded-xl text-xs uppercase tracking-wider cursor-pointer shadow-sm transition"
            >
              <FilePlus2 className="w-4 h-4" />
              Lançar Faturamento
            </button>
          )}
        </div>
      </div>

      {/* Formulário de Lançamento / Edição */}
      {isFormOpen && !isReadOnly && (
        <form onSubmit={handleSaveProcess} className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm space-y-6 print:hidden">
          
          <div className="border-b border-gray-150 dark:border-zinc-800 pb-3 flex justify-between items-center">
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500">
              {editingProcessId ? 'Editar Detalhes do Faturamento' : 'Lançar Novo Faturamento e Calcular Retenções'}
            </h3>
            <span className="text-[10px] font-mono bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300 px-2 py-0.5 rounded uppercase font-bold">
              Cálculo Automático Ativo
            </span>
          </div>

          {formError && (
            <div className="p-4 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 rounded-xl flex items-center gap-2 text-xs font-semibold">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {formSuccess && (
            <div className="p-4 bg-emerald-50 dark:bg-emerald-955/20 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center gap-2 text-xs font-semibold">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{formSuccess}</span>
            </div>
          )}

          {/* Seção 1: Dados Gerais do Faturamento */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider">
              1. Dados Gerais & Identificação das Oficinas MV
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              
              {/* Processo SEI com validação */}
              <div>
                <label htmlFor="process-sei" className="block text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase mb-1">
                  Processo SEI *
                </label>
                <input
                  id="process-sei"
                  type="text"
                  required
                  placeholder="Format: 12345-12345678/2026-01"
                  value={numeroSEI}
                  onChange={handleSeiChange}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
                <p className="text-[10px] text-gray-400 mt-1">Utilize o formato regular brasileiro de processos SEI.</p>
              </div>

              {/* Fornecedor */}
              <div>
                <label htmlFor="process-supplier" className="block text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase mb-1">
                  Fornecedor Parametrizado *
                </label>
                <select
                  id="process-supplier"
                  value={fornecedorId}
                  onChange={(e) => setFornecedorId(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 focus:outline-none"
                >
                  <option value="">Selecione o Fornecedor...</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.nome} ({s.codigoMV})
                    </option>
                  ))}
                </select>
              </div>

              {/* Nota Fiscal */}
              <div>
                <label htmlFor="process-nf" className="block text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase mb-1">
                  Número da Nota Fiscal *
                </label>
                <input
                  id="process-nf"
                  type="text"
                  required
                  placeholder="Ex: 0001042"
                  value={notaFiscal}
                  onChange={(e) => setNotaFiscal(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 focus:outline-none font-mono"
                />
              </div>

              {/* Contrato */}
              <div>
                <label htmlFor="process-contract" className="block text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase mb-1">
                  Identificador de Contrato *
                </label>
                <input
                  id="process-contract"
                  type="text"
                  required
                  placeholder="Ex: CT-2025/104"
                  value={contrato}
                  onChange={(e) => setContrato(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Competência do Serviço (AAAA-MM) */}
              <div>
                <label htmlFor="process-competence" className="block text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase mb-1">
                  Competência do Serviço *
                </label>
                <input
                  id="process-competence"
                  type="month"
                  required
                  value={competenciaServico}
                  onChange={(e) => setCompetenciaServico(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>

              {/* Data Emissão */}
              <div>
                <label htmlFor="process-emissao" className="block text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase mb-1">
                  Data de Emissão *
                </label>
                <input
                  id="process-emissao"
                  type="date"
                  required
                  value={dataEmissao}
                  onChange={(e) => setDataEmissao(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>

              {/* Data Atesto */}
              <div>
                <label htmlFor="process-atesto" className="block text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase mb-1">
                  Data de Atesto / Recebimento *
                </label>
                <input
                  id="process-atesto"
                  type="date"
                  required
                  value={dataAtesto}
                  onChange={(e) => setDataAtesto(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>

              {/* Centro de Custo */}
              <div>
                <label htmlFor="process-cc" className="block text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase mb-1">
                  Centro de Custo de Rateio *
                </label>
                <select
                  id="process-cc"
                  value={centroCustoId}
                  onChange={(e) => setCentroCustoId(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 focus:outline-none"
                >
                  <option value="">Selecione o Centro de Custo...</option>
                  {costCenters.map(cc => (
                    <option key={cc.id} value={cc.id}>
                      {cc.id} - {cc.descricao}
                    </option>
                  ))}
                </select>
              </div>

              {/* Unidade */}
              <div>
                <label htmlFor="process-unit" className="block text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase mb-1">
                  Unidade Hospitalar / Filial *
                </label>
                <select
                  id="process-unit"
                  value={unidadeId}
                  onChange={(e) => setUnidadeId(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 focus:outline-none"
                >
                  <option value="">Selecione a Unidade...</option>
                  {units.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.nome} ({u.id})
                    </option>
                  ))}
                </select>
              </div>

            </div>
          </div>

          {/* Dados Automáticos (Exibição Dinâmica do Fornecedor / Unidade selecionado) */}
          <div className="p-4 bg-gray-50 dark:bg-zinc-800/40 rounded-xl border border-gray-100 dark:border-zinc-800 grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
            <div>
              <div className="font-bold text-gray-400 dark:text-zinc-500 uppercase text-[10px]">Cód Fornecedor MV</div>
              <span id="auto-cod-supplier" className="font-mono font-bold text-gray-800 dark:text-zinc-300">{selectedSupplier?.codigoMV || '-'}</span>
            </div>
            <div>
              <div className="font-bold text-gray-400 dark:text-zinc-500 uppercase text-[10px]">Oficina MV</div>
              <span id="auto-oficina" className="font-mono font-bold text-gray-800 dark:text-zinc-300 truncate block">{selectedSupplier?.oficinaMV || '-'}</span>
            </div>
            <div>
              <div className="font-bold text-gray-400 dark:text-zinc-500 uppercase text-[10px]">CNPJ do Fornecedor</div>
              <span id="auto-cnpj" className="font-mono font-bold text-gray-800 dark:text-zinc-300">{selectedSupplier?.cnpj || '-'}</span>
            </div>
            <div>
              <div className="font-bold text-gray-400 dark:text-zinc-500 uppercase text-[10px]">CPRB (Desonerado)</div>
              <span id="auto-cprb" className="font-mono font-bold text-gray-800 dark:text-zinc-300">
                {selectedSupplier ? (selectedSupplier.cprb ? 'SIM (3.5%)' : 'NÃO (11%)') : '-'}
              </span>
            </div>
            <div>
              <div className="font-bold text-gray-400 dark:text-zinc-500 uppercase text-[10px]">Código da Unidade (MV)</div>
              <span id="auto-unit" className="font-mono font-bold text-emerald-600 dark:text-emerald-400 uppercase font-bold">{unidadeId || '-'}</span>
            </div>
          </div>

          {/* Seção 2: Dados Financeiros de Conferência */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider">
              2. Dados Financeiros & Descontos Iniciais
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Valor da Nota Fiscal */}
              <div>
                <label htmlFor="process-gross-value" className="block text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase mb-1">
                  Valor da Nota Fiscal (R$) *
                </label>
                <input
                  id="process-gross-value"
                  type="number"
                  step="0.01"
                  required
                  value={valorNotaFiscal === 0 ? '' : valorNotaFiscal}
                  onChange={(e) => setValorNotaFiscal(Math.max(0, parseFloat(e.target.value) || 0))}
                  placeholder="0,00"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-lg font-bold"
                />
              </div>

              {/* Deduções INSS */}
              <div>
                <label htmlFor="process-deductions" className="block text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase mb-1">
                  Deduções Legais de Material/Mão de Obra (INSS)
                </label>
                <input
                  id="process-deductions"
                  type="number"
                  step="0.01"
                  value={deducoesINSS === 0 ? '' : deducoesINSS}
                  onChange={(e) => setDeducoesINSS(Math.max(0, parseFloat(e.target.value) || 0))}
                  placeholder="0,00"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-lg font-bold"
                />
              </div>

              {/* Base de Cálculo Calculada */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase mb-1">
                  Base de Cálculo Própria do INSS (Líquido do Imposto)
                </label>
                <div id="display-calc-base" className="px-3 py-2 rounded-lg border border-gray-150 bg-gray-50 dark:bg-zinc-800/40 dark:border-zinc-800 font-mono text-lg font-bold text-gray-700 dark:text-zinc-300">
                  {formatarMoeda(calculations.baseCalculo)}
                </div>
                <p className="text-[10px] text-gray-400 mt-1">Fórmula: Valor da Nota - Deduções.</p>
              </div>

            </div>
          </div>

          {/* Seção 3: Demonstrativo Auxiliar de Impostos Retidos na Fonte */}
          <div className="bg-gray-50/50 dark:bg-zinc-900/60 p-5 rounded-2xl border border-gray-100 dark:border-zinc-800">
            <h4 className="text-xs font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Scale className="w-4 h-4 text-emerald-500" />
              Retenções calculadas em tempo real pelas parametrizações do Fornecedor
            </h4>

            {!selectedSupplier ? (
              <p className="text-xs text-gray-400 italic text-center py-4">
                Selecione um Fornecedor parametriziado para simular e calcular os impostos retidos.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                
                {/* INSS */}
                <div className="p-3 bg-white dark:bg-zinc-800/60 rounded-xl border border-gray-150 dark:border-zinc-700">
                  <div className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase">INSS Retido ({calculations.inssAliq}%)</div>
                  <div id="calc-inss" className="text-base font-black text-blue-600 dark:text-blue-400 mt-1 font-mono">
                    {formatarMoeda(calculations.inssVal)}
                  </div>
                  <div className="text-[9px] text-gray-400 mt-1 font-mono">Base: {formatarMoeda(calculations.inssBase)}</div>
                </div>

                {/* IRRF */}
                <div className="p-3 bg-white dark:bg-zinc-800/60 rounded-xl border border-gray-150 dark:border-zinc-700">
                  <div className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase">IRRF Retido ({selectedSupplier.irrf.aliquota}%)</div>
                  <div id="calc-irrf" className="text-base font-black text-amber-600 dark:text-amber-400 mt-1 font-mono">
                    {formatarMoeda(calculations.irrfVal)}
                  </div>
                  <div className="text-[9px] text-gray-400 mt-1 font-mono">Base: {formatarMoeda(calculations.irrfBase)}</div>
                </div>

                {/* CSRF (CSLL/PIS/COFINS) */}
                <div className="p-3 bg-white dark:bg-zinc-800/60 rounded-xl border border-gray-150 dark:border-zinc-700">
                  <div className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase">CSRF Retido ({selectedSupplier.csrf.aliquota}%)</div>
                  <div id="calc-csrf" className="text-base font-black text-purple-600 dark:text-purple-400 mt-1 font-mono">
                    {formatarMoeda(calculations.csrfVal)}
                  </div>
                  <div className="text-[9px] text-gray-400 mt-1 font-mono">Base: {formatarMoeda(calculations.csrfBase)}</div>
                </div>

                {/* ISS */}
                <div className="p-3 bg-white dark:bg-zinc-800/60 rounded-xl border border-gray-150 dark:border-zinc-700">
                  <div className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase">ISS Retido ({selectedSupplier.iss.aliquota}%)</div>
                  <div id="calc-iss" className="text-base font-black text-teal-600 dark:text-teal-400 mt-1 font-mono">
                    {formatarMoeda(calculations.issVal)}
                  </div>
                  <div className="text-[9px] text-gray-400 mt-1 font-mono">Base: {formatarMoeda(calculations.issBase)}</div>
                </div>

              </div>
            )}
          </div>

          {/* Destaque do Valor Líquido */}
          <div className="bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 p-5 rounded-2xl flex flex-col md:flex-row justify-between items-center gap-4 border border-emerald-100 dark:border-emerald-900/30">
            <div>
              <p className="text-xs uppercase font-bold text-emerald-600 dark:text-emerald-400">
                Valor Líquido Apurado a Pagar (Em Destaque)
              </p>
              <p className="text-[11px] opacity-80 mt-1">
                Fórmula: Base de Cálculo - (Soma dos Impostos Retidos na Fonte)
              </p>
            </div>
            <div id="display-net-value" className="text-3xl font-black font-mono">
              {formatarMoeda(calculations.liquido)}
            </div>
          </div>

          {/* Descrição Longa dos Serviços */}
          <div className="space-y-1">
            <label htmlFor="process-desc" className="block text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase">
              Descrição Detalhada do Serviço Prestado / Observações
            </label>
            <textarea
              id="process-desc"
              rows={4}
              required
              placeholder="Digite aqui o objeto faturado na nota, materiais utilizados, ordem de serviço correspondente ou demais especificações tributárias necessárias..."
              value={descricaoServicos}
              onChange={(e) => setDescricaoServicos(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-sans"
            />
          </div>

          {/* Control Actions Form */}
          <div className="flex justify-end gap-3 border-t border-gray-150 dark:border-zinc-800 pt-4">
            <button
              id="btn-close-form"
              type="button"
              onClick={() => {
                setIsFormOpen(false);
                setEditingProcessId(null);
              }}
              className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg cursor-pointer transition"
            >
              Cancelar Lançamento
            </button>
            <button
              id="btn-save-process-submit"
              type="submit"
              className="px-5 py-2 text-xs font-semibold uppercase tracking-wider text-white bg-blue-600 hover:bg-blue-500 rounded-lg cursor-pointer shadow-md transition"
            >
              {editingProcessId ? 'Salvar Edição' : 'Consolidar Lançamento'}
            </button>
          </div>

        </form>
      )}

      {/* Grid de Busca Avançada de Faturamento */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm p-5 space-y-4 print:hidden">
        <h4 className="text-xs font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest flex items-center gap-2">
          <Search className="w-4 h-4 text-blue-500" />
          Filtros de Pesquisa Avançados
        </h4>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* SEI */}
          <div>
            <label htmlFor="filter-sei-input" className="text-[10px] text-gray-400 uppercase font-bold block mb-1">Processo SEI</label>
            <input
              id="filter-sei-input"
              type="text"
              placeholder="Ex: 12345-12345678/2026-01"
              value={filterSEI}
              onChange={(e) => setFilterSEI(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 focus:outline-none"
            />
          </div>

          {/* Fornecedor */}
          <div>
            <label htmlFor="filter-supplier-id" className="text-[10px] text-gray-400 uppercase font-bold block mb-1">Fornecedor</label>
            <select
              id="filter-supplier-id"
              value={filterFornecedorId}
              onChange={(e) => setFilterFornecedorId(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 focus:outline-none"
            >
              <option value="">Todos Fornecedores</option>
              {suppliers.map(s => (
                <option key={s.id} value={s.id}>{s.nome}</option>
              ))}
            </select>
          </div>

          {/* Nota Fiscal */}
          <div>
            <label htmlFor="filter-nf-input" className="text-[10px] text-gray-400 uppercase font-bold block mb-1">Nota Fiscal</label>
            <input
              id="filter-nf-input"
              type="text"
              placeholder="Número NF"
              value={filterNotaFiscal}
              onChange={(e) => setFilterNotaFiscal(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 focus:outline-none"
            />
          </div>

          {/* Competência (AAAA-MM) */}
          <div>
            <label htmlFor="filter-competence-month" className="text-[10px] text-gray-400 uppercase font-bold block mb-1">Competência</label>
            <input
              id="filter-competence-month"
              type="month"
              value={filterCompetencia}
              onChange={(e) => setFilterCompetencia(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 focus:outline-none"
            />
          </div>

          {/* Centro de Custo */}
          <div>
            <label htmlFor="filter-cc-rateio" className="text-[10px] text-gray-400 uppercase font-bold block mb-1">Centro de Custo</label>
            <select
              id="filter-cc-rateio"
              value={filterCentroCusto}
              onChange={(e) => setFilterCentroCusto(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 focus:outline-none"
            >
              <option value="">Todos os CCs</option>
              {costCenters.map(cc => (
                <option key={cc.id} value={cc.id}>{cc.id} - {cc.descricao}</option>
              ))}
            </select>
          </div>

          {/* Unidade */}
          <div>
            <label htmlFor="filter-unit-mv" className="text-[10px] text-gray-400 uppercase font-bold block mb-1">Unidade MV</label>
            <select
              id="filter-unit-mv"
              value={filterUnidade}
              onChange={(e) => setFilterUnidade(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 focus:outline-none"
            >
              <option value="">Todas Unidades</option>
              {units.map(u => (
                <option key={u.id} value={u.id}>{u.nome}</option>
              ))}
            </select>
          </div>

          {/* Contrato */}
          <div>
            <label htmlFor="filter-contract-id" className="text-[10px] text-gray-400 uppercase font-bold block mb-1">Contrato</label>
            <input
              id="filter-contract-id"
              type="text"
              placeholder="Número Contrato"
              value={filterContrato}
              onChange={(e) => setFilterContrato(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 focus:outline-none"
            />
          </div>

          {/* Limpar Filtros */}
          <div className="flex items-end">
            <button
              id="btn-clear-filters"
              type="button"
              onClick={() => {
                setFilterSEI('');
                setFilterFornecedorId('');
                setFilterNotaFiscal('');
                setFilterCompetencia('');
                setFilterCentroCusto('');
                setFilterUnidade('');
                setFilterContrato('');
              }}
              className="w-full py-1.5 px-3 border border-gray-200 dark:border-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-850 text-gray-600 dark:text-zinc-400 text-xs font-semibold uppercase tracking-wider rounded-lg transition cursor-pointer"
            >
              Limpar Filtros
            </button>
          </div>

        </div>
      </div>

      {/* Lista de Faturamento / Grid de Processos */}
      {filteredProcesses.length === 0 ? (
        <div className="bg-white dark:bg-zinc-900 p-12 text-center rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm text-gray-400 print:hidden col-span-full">
          Nenhum processo contábil faturado confere com tais filtros aplicados.
        </div>
      ) : (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm overflow-hidden print:hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-gray-100 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-900/60 font-mono">
                  <th className="px-4 py-3.5 text-xs font-semibold text-gray-400 dark:text-zinc-500 uppercase whitespace-nowrap">SEI</th>
                  <th className="px-4 py-3.5 text-xs font-semibold text-gray-400 dark:text-zinc-500 uppercase whitespace-nowrap">FORNECEDOR</th>
                  <th className="px-4 py-3.5 text-xs font-semibold text-gray-400 dark:text-zinc-500 uppercase whitespace-nowrap">CNPJ</th>
                  <th className="px-4 py-3.5 text-xs font-semibold text-gray-400 dark:text-zinc-500 uppercase whitespace-nowrap">NOTA FISCAL</th>
                  <th className="px-4 py-3.5 text-xs font-semibold text-gray-400 dark:text-zinc-500 uppercase whitespace-nowrap">OFICINA</th>
                  <th className="px-4 py-3.5 text-xs font-semibold text-gray-400 dark:text-zinc-500 uppercase whitespace-nowrap">CÓD FORNECEDOR (MV)</th>
                  <th className="px-4 py-3.5 text-xs font-semibold text-gray-400 dark:text-zinc-500 uppercase whitespace-nowrap">CPRB</th>
                  <th className="px-4 py-3.5 text-xs font-semibold text-gray-400 dark:text-zinc-500 uppercase whitespace-nowrap">CENTRO DE CUSTO</th>
                  <th className="px-4 py-3.5 text-xs font-semibold text-gray-400 dark:text-zinc-500 uppercase whitespace-nowrap">CONTRATO</th>
                  <th className="px-4 py-3.5 text-xs font-semibold text-gray-400 dark:text-zinc-500 uppercase whitespace-nowrap">COMP. SERVIÇO</th>
                  <th className="px-4 py-3.5 text-xs font-semibold text-gray-400 dark:text-zinc-500 uppercase whitespace-nowrap">DATA DE EMISSÃO</th>
                  <th className="px-4 py-3.5 text-xs font-semibold text-gray-400 dark:text-zinc-500 uppercase whitespace-nowrap">DATA DE ATESTO</th>
                  <th className="px-4 py-3.5 text-xs font-semibold text-gray-400 dark:text-zinc-500 uppercase text-right whitespace-nowrap">VALOR DA NOTA FISCAL</th>
                  <th className="px-4 py-3.5 text-xs font-semibold text-gray-400 dark:text-zinc-500 uppercase text-right whitespace-nowrap">DEDUÇÕES INSS</th>
                  <th className="px-4 py-3.5 text-xs font-semibold text-gray-400 dark:text-zinc-500 uppercase text-right whitespace-nowrap">BASE DE CALCULO DOS IMPOSTOS</th>
                  <th className="px-4 py-3.5 text-xs font-semibold text-blue-500 dark:text-blue-400 uppercase text-right whitespace-nowrap">INSS</th>
                  <th className="px-4 py-3.5 text-xs font-semibold text-amber-500 dark:text-amber-400 uppercase text-right whitespace-nowrap">IRRF</th>
                  <th className="px-4 py-3.5 text-xs font-semibold text-purple-500 dark:text-purple-400 uppercase text-right whitespace-nowrap">CSRF</th>
                  <th className="px-4 py-3.5 text-xs font-semibold text-teal-500 dark:text-teal-400 uppercase text-right whitespace-nowrap">ISS</th>
                  <th className="px-4 py-3.5 text-xs font-semibold text-gray-400 dark:text-zinc-500 uppercase text-right whitespace-nowrap">RETIDO TOTAL</th>
                  <th className="px-4 py-3.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase text-right whitespace-nowrap">VALOR LÍQUIDO</th>
                  <th className="px-4 py-3.5 text-xs font-semibold text-gray-400 dark:text-zinc-500 uppercase text-center whitespace-nowrap">AÇÕES</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-zinc-800/80">
                {filteredProcesses.map((p) => {
                  const forn = suppliers.find(s => s.id === p.fornecedorId);
                  const cc = costCenters.find(c => c.id === p.centroCustoId);
                  const un = units.find(u => u.id === p.unidadeId);
                  const totalRetido = p.inssValor + p.irrfValor + p.csrfValor + p.issValor;

                  return (
                    <tr key={p.id} className="hover:bg-gray-50/40 dark:hover:bg-zinc-800/10 transition">
                      
                      {/* SEI */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="font-mono text-xs font-bold text-gray-900 dark:text-zinc-50">{p.numeroSEI}</span>
                      </td>

                      {/* FORNECEDOR */}
                      <td className="px-4 py-3.5">
                        <div className="text-xs font-medium text-gray-900 dark:text-zinc-100 truncate max-w-[150px]" title={forn?.nome}>
                          {forn?.nome || 'Não localizado'}
                        </div>
                      </td>

                      {/* CNPJ */}
                      <td className="px-4 py-3.5 whitespace-nowrap font-mono text-xs text-gray-600 dark:text-zinc-400">
                        {forn ? formatarCNPJ(forn.cnpj) : 'Não localizado'}
                      </td>

                      {/* NOTA FISCAL */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="text-xs font-bold text-gray-800 dark:text-zinc-300 font-mono">{p.notaFiscal}</span>
                      </td>

                      {/* OFICINA */}
                      <td className="px-4 py-3.5 whitespace-nowrap text-xs text-gray-600 dark:text-zinc-400">
                        {forn?.oficinaMV || '-'}
                      </td>

                      {/* CÓD FORNECEDOR (MV) */}
                      <td className="px-4 py-3.5 whitespace-nowrap font-mono text-xs text-gray-600 dark:text-zinc-400">
                        {forn?.codigoMV || '-'}
                      </td>

                      {/* CPRB */}
                      <td className="px-4 py-3.5 whitespace-nowrap text-xs font-medium">
                        {forn ? (
                          forn.cprb ? (
                            <span className="text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/20 px-2 py-0.5 rounded">Sim</span>
                          ) : (
                            <span className="text-gray-500 dark:text-zinc-400 bg-gray-50 dark:bg-zinc-855 px-2 py-0.5 rounded">Não</span>
                          )
                        ) : '-'}
                      </td>

                      {/* CENTRO DE CUSTO */}
                      <td className="px-4 py-3.5 whitespace-nowrap" title={cc?.descricao}>
                        <div className="text-xs text-gray-800 dark:text-zinc-350 font-mono font-medium">{p.centroCustoId}</div>
                        {cc && (
                          <div className="text-[10px] text-gray-400 dark:text-zinc-500 font-sans truncate max-w-[120px]">{cc.descricao}</div>
                        )}
                      </td>

                      {/* CONTRATO */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="text-xs text-gray-650 dark:text-zinc-400 font-medium font-mono">{p.contrato}</span>
                      </td>

                      {/* COMP. SERVIÇO */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="text-xs text-gray-550 dark:text-zinc-400 font-mono">{formatarCompetencia(p.competenciaServico)}</span>
                      </td>

                      {/* DATA DE EMISSÃO */}
                      <td className="px-4 py-3.5 whitespace-nowrap text-xs font-mono text-gray-650 dark:text-zinc-400">
                        {formatarDataLocal(p.dataEmissao)}
                      </td>

                      {/* DATA DE ATESTO */}
                      <td className="px-4 py-3.5 whitespace-nowrap text-xs font-mono text-gray-650 dark:text-zinc-400">
                        {formatarDataLocal(p.dataAtesto)}
                      </td>

                      {/* VALOR DA NOTA FISCAL */}
                      <td className="px-4 py-3.5 text-right font-mono text-xs font-semibold text-gray-750 dark:text-zinc-300 whitespace-nowrap">
                        {formatarMoeda(p.valorNotaFiscal)}
                      </td>

                      {/* DEDUÇÕES INSS */}
                      <td className="px-4 py-3.5 text-right font-mono text-xs text-gray-600 dark:text-zinc-400 whitespace-nowrap">
                        {formatarMoeda(p.deducoesINSS || 0)}
                      </td>

                      {/* BASE DE CALCULO DOS IMPOSTOS */}
                      <td className="px-4 py-3.5 text-right font-mono text-xs text-gray-700 dark:text-zinc-300 whitespace-nowrap">
                        {formatarMoeda(p.baseCalculoCalculada)}
                      </td>

                      {/* INSS */}
                      <td className="px-4 py-3.5 text-right font-mono text-xs whitespace-nowrap">
                        <div className={p.inssValor > 0 ? "text-blue-600 dark:text-blue-400 font-semibold" : "text-gray-300 dark:text-zinc-700"}>
                          {formatarMoeda(p.inssValor)}
                        </div>
                        {p.inssValor > 0 && (
                          <div className="text-[9px] text-gray-400 dark:text-zinc-500 font-sans">
                            ({p.inssAliquota}%)
                          </div>
                        )}
                      </td>

                      {/* IRRF */}
                      <td className="px-4 py-3.5 text-right font-mono text-xs whitespace-nowrap">
                        <div className={p.irrfValor > 0 ? "text-amber-600 dark:text-amber-400 font-semibold" : "text-gray-300 dark:text-zinc-700"}>
                          {formatarMoeda(p.irrfValor)}
                        </div>
                        {p.irrfValor > 0 && (
                          <div className="text-[9px] text-gray-400 dark:text-zinc-500 font-sans">
                            ({p.irrfAliquota}%)
                          </div>
                        )}
                      </td>

                      {/* CSRF */}
                      <td className="px-4 py-3.5 text-right font-mono text-xs whitespace-nowrap">
                        <div className={p.csrfValor > 0 ? "text-purple-600 dark:text-purple-400 font-semibold" : "text-gray-300 dark:text-zinc-700"}>
                          {formatarMoeda(p.csrfValor)}
                        </div>
                        {p.csrfValor > 0 && (
                          <div className="text-[9px] text-gray-400 dark:text-zinc-500 font-sans">
                            ({p.csrfAliquota}%)
                          </div>
                        )}
                      </td>

                      {/* ISS */}
                      <td className="px-4 py-3.5 text-right font-mono text-xs whitespace-nowrap">
                        <div className={p.issValor > 0 ? "text-teal-600 dark:text-teal-400 font-semibold" : "text-gray-300 dark:text-zinc-700"}>
                          {formatarMoeda(p.issValor)}
                        </div>
                        {p.issValor > 0 && (
                          <div className="text-[9px] text-gray-400 dark:text-zinc-500 font-sans">
                            ({p.issAliquota}%)
                          </div>
                        )}
                      </td>

                      {/* RETIDO TOTAL */}
                      <td className="px-4 py-3.5 text-right font-mono text-xs text-red-600 dark:text-red-400 font-semibold whitespace-nowrap">
                        {formatarMoeda(totalRetido)}
                      </td>

                      {/* VALOR LÍQUIDO */}
                      <td className="px-4 py-3.5 text-right font-mono text-xs font-black text-emerald-600 dark:text-emerald-400 whitespace-nowrap bg-emerald-50/10 dark:bg-emerald-950/5">
                        {formatarMoeda(p.valorLiquido)}
                      </td>

                      {/* AÇÕES */}
                      <td className="px-4 py-3.5 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-2">
                          
                          {/* Imprimir Comprovante */}
                          <button
                            id={`btn-print-process-${p.id}`}
                            onClick={() => handlePrint(p)}
                            title="Imprimir Comprovante PDF"
                            className="p-1 px-2 border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-500 hover:text-blue-500 transition rounded shadow-sm cursor-pointer"
                          >
                            <Printer className="w-4 h-4" />
                          </button>

                          {/* Gerar Histórico */}
                          <button
                            id={`btn-history-process-${p.id}`}
                            onClick={() => setHistoryTargetProcess(p)}
                            title="Gerar Histórico de Lançamento"
                            className="p-1 px-2 border border-blue-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-blue-500 hover:text-blue-600 transition rounded shadow-sm cursor-pointer"
                          >
                            <History className="w-4 h-4" />
                          </button>

                          {/* Editar */}
                          {!isReadOnly && (
                            <button
                              id={`btn-edit-process-${p.id}`}
                              onClick={() => handleEdit(p)}
                              title="Editar Lançamento"
                              className="p-1 px-2 border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-500 hover:text-blue-500 transition rounded shadow-sm cursor-pointer"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Excluir (Só admin) */}
                          {canDelete && (
                            <button
                              id={`btn-delete-process-${p.id}`}
                              onClick={() => handleDelete(p.id, p.numeroSEI)}
                              title="Excluir Processo contábil"
                              className="p-1 px-2 border border-red-200 dark:border-red-950 bg-white dark:bg-red-950/25 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30 transition rounded shadow-sm cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}

                        </div>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="border-t-2 border-gray-200 dark:border-zinc-700 bg-gray-50/50 dark:bg-zinc-900/60 font-mono font-bold text-xs">
                <tr className="bg-gray-100/30 dark:bg-zinc-900/40">
                  <td colSpan={12} className="px-4 py-4 text-xs font-bold text-gray-500 dark:text-zinc-400 uppercase font-sans text-left border-r border-gray-100 dark:border-zinc-800/60">
                    Soma Totais ({filteredProcesses.length})
                  </td>
                  
                  {/* VALOR DA NOTA FISCAL */}
                  <td className="px-4 py-4 text-right font-mono text-xs font-bold text-gray-900 dark:text-zinc-100 whitespace-nowrap">
                    {formatarMoeda(totals.valorNotaFiscal)}
                  </td>

                  {/* DEDUÇÕES INSS */}
                  <td className="px-4 py-4 text-right font-mono text-xs font-bold text-gray-700 dark:text-zinc-300 whitespace-nowrap">
                    {formatarMoeda(totals.deducoesINSS)}
                  </td>

                  {/* BASE DE CALCULO DOS IMPOSTOS */}
                  <td className="px-4 py-4 text-right font-mono text-xs font-bold text-gray-900 dark:text-zinc-100 whitespace-nowrap">
                    {formatarMoeda(totals.baseCalculoCalculada)}
                  </td>
                  
                  {/* INSS */}
                  <td className="px-4 py-4 text-right font-mono text-xs font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                    {formatarMoeda(totals.inssValor)}
                  </td>
                  
                  {/* IRRF */}
                  <td className="px-4 py-4 text-right font-mono text-xs font-bold text-amber-600 dark:text-amber-400 whitespace-nowrap">
                    {formatarMoeda(totals.irrfValor)}
                  </td>
                  
                  {/* CSRF */}
                  <td className="px-4 py-4 text-right font-mono text-xs font-bold text-purple-600 dark:text-purple-400 whitespace-nowrap">
                    {formatarMoeda(totals.csrfValor)}
                  </td>
                  
                  {/* ISS */}
                  <td className="px-4 py-4 text-right font-mono text-xs font-bold text-teal-600 dark:text-teal-400 whitespace-nowrap">
                    {formatarMoeda(totals.issValor)}
                  </td>
                  
                  {/* RETIDO TOTAL */}
                  <td className="px-4 py-4 text-right font-mono text-xs font-bold text-red-600 dark:text-red-400 whitespace-nowrap border-r border-gray-100 dark:border-zinc-800/60">
                    {formatarMoeda(totals.totalRetido)}
                  </td>
                  
                  {/* VALOR LÍQUIDO */}
                  <td className="px-4 py-4 text-right font-mono text-xs font-black text-emerald-600 dark:text-emerald-400 whitespace-nowrap bg-emerald-500/10 dark:bg-emerald-950/20">
                    {formatarMoeda(totals.valorLiquido)}
                  </td>
                  
                  {/* Ações empty */}
                  <td className="px-4 py-4"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão do Processo */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-slate-900/85 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-850 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 font-sans text-left animate-in zoom-in-95 duration-200">
            <div className="flex items-start gap-3 text-red-600 dark:text-red-400">
              <AlertCircle className="w-6 h-6 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-zinc-50">Confirmação de Exclusão</h3>
                <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">
                  Confirma a exclusão definitiva do Processo SEI: <strong className="font-mono text-xs bg-gray-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">{deleteTarget.sei}</strong>?
                </p>
              </div>
            </div>
            
            <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 p-3 rounded-xl border border-amber-200 dark:border-amber-900/30">
              Esta operação é irreversível e gerará um registro de exclusão definitivo na trilha de auditoria contábil do ERP.
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
                onClick={() => {
                  DBService.deleteProcess(deleteTarget.id);
                  setProcesses(DBService.getProcesses());
                  setDeleteTarget(null);
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-semibold cursor-pointer transition shadow-sm"
              >
                Confirmar Exclusão
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para Gerar e Copiar o Histórico de Lançamento */}
      {historyTargetProcess && (() => {
        const historyText = `SEI: ${historyTargetProcess.numeroSEI} - CONTRATO ${historyTargetProcess.contrato || 'N/A'} - COMP. SERVIÇO ${formatarCompetencia(historyTargetProcess.competenciaServico)} - ATESTO ${formatarDataLocal(historyTargetProcess.dataAtesto)}`;
        return (
          <div className="fixed inset-0 bg-slate-900/85 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
            <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-850 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 font-sans text-left animate-in zoom-in-95 duration-200">
              <div className="flex items-start gap-4">
                <div className="p-2.5 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-xl">
                  <History className="w-6 h-6 shrink-0 mt-0.5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-zinc-50 font-sans">Histórico de Lançamento</h3>
                  <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1 leading-relaxed">
                    Histórico gerado seguindo o padrão SEI, Contrato, Competência e Data de Atesto para colar no sistema externo.
                  </p>
                </div>
              </div>

              <div className="relative mt-2 p-4 bg-gray-50 dark:bg-zinc-800/25 border border-gray-150 dark:border-zinc-700/60 rounded-xl">
                <textarea
                  id="txt-history-content"
                  readOnly
                  value={historyText}
                  className="w-full h-20 bg-transparent border-0 focus:outline-none focus:ring-0 text-xs font-mono text-gray-800 dark:text-zinc-100 resize-none font-semibold leading-relaxed"
                  onClick={(e) => (e.target as HTMLTextAreaElement).select()}
                />
                
                <button
                  id="btn-copy-history"
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(historyText);
                    setCopiedHistory(true);
                    setTimeout(() => setCopiedHistory(false), 3000);
                  }}
                  className="absolute bottom-3 right-3 flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-[10px] uppercase cursor-pointer transition shadow-md"
                >
                  {copiedHistory ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Copiado!
                    </>
                  ) : (
                    <>
                      <ClipboardCopy className="w-3.5 h-3.5" />
                      Copiar texto
                    </>
                  )}
                </button>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  id="btn-close-history-modal"
                  type="button"
                  onClick={() => {
                    setHistoryTargetProcess(null);
                    setCopiedHistory(false);
                  }}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-700 dark:text-zinc-300 rounded-xl text-xs font-bold font-sans cursor-pointer transition"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
