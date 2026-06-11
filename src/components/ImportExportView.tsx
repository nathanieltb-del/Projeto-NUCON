/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { DBService } from '../services/db';
import { Supplier, CostCenter, Unit, TaxBaseOption, UserProfile } from '../types';
import { formatarCNPJ } from '../utils/validation';
import { 
  FileSpreadsheet, Upload, Download, Check, AlertTriangle, 
  HelpCircle, RefreshCw, FileText, Settings, Database,
  FileJson, Trash2, AlertCircle, ShieldAlert
} from 'lucide-react';
import * as XLSX from 'xlsx';

export default function ImportExportView() {
  const [activeTab, setActiveTab] = useState<'xlsx' | 'backup'>('xlsx');

  // Core XLSX import states (original)
  const [targetCollection, setTargetCollection] = useState<'suppliers' | 'cost-centers' | 'units'>('suppliers');
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [parsedPreview, setParsedPreview] = useState<any[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [successMsg, setSuccessMsg] = useState('');

  // Core Backup & Restore states
  const [backupFile, setBackupFile] = useState<File | null>(null);
  const [backupMode, setBackupMode] = useState<'merge' | 'overwrite'>('merge');
  const [backupStringContent, setBackupStringContent] = useState<string>('');
  const [backupSuccess, setBackupSuccess] = useState('');
  const [backupError, setBackupError] = useState('');
  const [isResetConfirming, setIsResetConfirming] = useState(false);
  const [isRestoreOverwriteConfirming, setIsRestoreOverwriteConfirming] = useState(false);

  // Stats for the backup visual dashboard
  const userCount = DBService.getUsers().length;
  const supplierCount = DBService.getSuppliers().length;
  const ccCount = DBService.getCostCenters().length;
  const unitCount = DBService.getUnits().length;
  const processCount = DBService.getProcesses().length;
  const logsCount = DBService.getAuditLogs().length;

  const currentUser = DBService.getCurrentUser();
  const isAdmin = currentUser?.perfil === UserProfile.ADMINISTRADOR;

  // original xlsx spreadsheet download
  const downloadTemplate = () => {
    const wb = XLSX.utils.book_new();
    let ws;

    if (targetCollection === 'suppliers') {
      const headers = [
        ['Fornecedor', 'CNPJ', 'MV_Codigo', 'MV_Oficina', 'Servico_Codigo', 'CPRB_Sim_Nao', 'INSS_Incide_Sim_Nao', 'INSS_Aliquota', 'IRRF_Incide_Sim_Nao', 'IRRF_Aliquota', 'CSRF_Incide_Sim_Nao', 'CSRF_Aliquota', 'ISS_Incide_Sim_Nao', 'ISS_Aliquota'],
        ['Hospitalar Clean Ltda', '12.345.678/0001-90', 'FORN-3050', 'OF-HIGIENIZACAO', '07.01', 'Não', 'Sim', 11, 'Sim', 1.5, 'Sim', 4.65, 'Não', 0],
        ['TechMed Imagem S/A', '98.765.432/0001-21', 'FORN-8840', 'OF-MANUT_EQUIP', '14.01', 'Sim', 'Sim', 3.5, 'Sim', 1.5, 'Sim', 4.65, 'Sim', 5]
      ];
      ws = XLSX.utils.aoa_to_sheet(headers);
    } else if (targetCollection === 'cost-centers') {
      const headers = [
        ['Codigo', 'Descricao', 'Status'],
        ['60101', 'Ambulatório de Especialidade de Pele', 'Ativo'],
        ['70202', 'Pesquisa de Patologias e Vírus', 'Inativo']
      ];
      ws = XLSX.utils.aoa_to_sheet(headers);
    } else {
      const headers = [
        ['Codigo_MV', 'Nome_Unidade', 'Status'],
        ['HOSP-ZONASUL', 'Hospital Regional Zona Sul', 'Ativo'],
        ['UPA-OESTE', 'Pronto Atendimento Zona Oeste', 'Ativo']
      ];
      ws = XLSX.utils.aoa_to_sheet(headers);
    }

    XLSX.utils.book_append_sheet(wb, ws, 'Modelo Importacao');
    XLSX.writeFile(wb, `modelo_importacao_${targetCollection}.xlsx`);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = (selectedFile: File) => {
    setFile(selectedFile);
    setErrors([]);
    setParsedPreview([]);
    setSuccessMsg('');

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];

        if (data.length <= 1) {
          setErrors(['A planilha está vazia ou não possui cabeçalhos.']);
          return;
        }

        const headers = data[0].map(h => String(h).trim());
        const rows = data.slice(1);

        if (targetCollection === 'suppliers') {
          const required = ['Fornecedor', 'CNPJ', 'MV_Codigo', 'MV_Oficina', 'Servico_Codigo'];
          const missing = required.filter(h => !headers.includes(h));
          if (missing.length > 0) {
            setErrors([`Colunas obrigatórias ausentes na planilha de Fornecedores: ${missing.join(', ')}`]);
            return;
          }

          const suppliersResult: any[] = [];
          rows.forEach((row) => {
            if (row.length === 0 || !row[0]) return;
            
            const getVal = (colName: string) => {
              const idx = headers.indexOf(colName);
              return idx !== -1 ? row[idx] : undefined;
            };

            const nome = String(getVal('Fornecedor') || '').trim();
            const cnpj = formatarCNPJ(String(getVal('CNPJ') || '').trim());
            const codigoMV = String(getVal('MV_Codigo') || '').trim();
            const oficinaMV = String(getVal('MV_Oficina') || '').trim();
            const codigoServico = String(getVal('Servico_Codigo') || '').trim();
            const cprb = String(getVal('CPRB_Sim_Nao') || '').toLowerCase().trim() === 'sim';
            
            const inssIncide = String(getVal('INSS_Incide_Sim_Nao') || '').toLowerCase().trim() !== 'não';
            const inssAliq = Number(getVal('INSS_Aliquota') || (cprb ? 3.5 : 11));

            const irrfIncide = String(getVal('IRRF_Incide_Sim_Nao') || '').toLowerCase().trim() !== 'não';
            const irrfAliq = Number(getVal('IRRF_Aliquota') || 1.5);

            const csrfIncide = String(getVal('CSRF_Incide_Sim_Nao') || '').toLowerCase().trim() !== 'não';
            const csrfAliq = Number(getVal('CSRF_Aliquota') || 4.65);

            const issIncide = String(getVal('ISS_Incide_Sim_Nao') || '').toLowerCase().trim() === 'sim';
            const issAliq = Number(getVal('ISS_Aliquota') || 5);

            suppliersResult.push({
              nome, cnpj, codigoMV, oficinaMV, codigoServico, cprb,
              inss: { incide: inssIncide, aliquota: inssAliq, baseCalculoPadrao: TaxBaseOption.VALOR_NF_DEDUCOES },
              irrf: { incide: irrfIncide, aliquota: irrfAliq, baseCalculoPadrao: TaxBaseOption.VALOR_NF },
              csrf: { incide: csrfIncide, aliquota: csrfAliq, baseCalculoPadrao: TaxBaseOption.VALOR_NF },
              iss: { incide: issIncide, aliquota: issAliq, baseCalculoPadrao: TaxBaseOption.VALOR_NF },
              status: 'Ativo'
            });
          });

          setParsedPreview(suppliersResult);

        } else if (targetCollection === 'cost-centers') {
          const required = ['Codigo', 'Descricao'];
          const missing = required.filter(h => !headers.includes(h));
          if (missing.length > 0) {
            setErrors([`Colunas obrigatórias ausentes na planilha de Centros de Custo: ${missing.join(', ')}`]);
            return;
          }

          const ccResult: any[] = [];
          rows.forEach(row => {
            if (row.length === 0 || !row[0]) return;
            const getVal = (colName: string) => {
              const idx = headers.indexOf(colName);
              return idx !== -1 ? row[idx] : undefined;
            };

            ccResult.push({
              id: String(getVal('Codigo') || '').trim(),
              descricao: String(getVal('Descricao') || '').trim(),
              status: String(getVal('Status') || '').toLowerCase() === 'inativo' ? 'Inativo' : 'Ativo'
            });
          });

          setParsedPreview(ccResult);

        } else {
          const required = ['Codigo_MV', 'Nome_Unidade'];
          const missing = required.filter(h => !headers.includes(h));
          if (missing.length > 0) {
            setErrors([`Colunas obrigatórias ausentes na planilha de Unidades: ${missing.join(', ')}`]);
            return;
          }

          const unitsResult: any[] = [];
          rows.forEach(row => {
            if (row.length === 0 || !row[0]) return;
            const getVal = (colName: string) => {
              const idx = headers.indexOf(colName);
              return idx !== -1 ? row[idx] : undefined;
            };

            unitsResult.push({
              id: String(getVal('Codigo_MV') || '').toUpperCase().trim(),
              nome: String(getVal('Nome_Unidade') || '').trim(),
              status: String(getVal('Status') || '').toLowerCase() === 'inativo' ? 'Inativo' : 'Ativo'
            });
          });

          setParsedPreview(unitsResult);
        }

      } catch (err) {
        setErrors([`Erro na carga do arquivo: ${err instanceof Error ? err.message : 'Planilha inválida'}`]);
      }
    };
    reader.readAsBinaryString(selectedFile);
  };

  const handleImporterConfirm = () => {
    if (parsedPreview.length === 0) return;

    let countAdded = 0;
    let countUpdated = 0;

    if (targetCollection === 'suppliers') {
      const currentSuppliers = DBService.getSuppliers();
      parsedPreview.forEach((imported: Omit<Supplier, 'id' | 'dataCriacao'>) => {
        const existing = currentSuppliers.find(s => s.cnpj === imported.cnpj || s.codigoMV === imported.codigoMV);
        if (existing) {
          DBService.updateSupplier(existing.id, imported);
          countUpdated++;
        } else {
          DBService.addSupplier(imported);
          countAdded++;
        }
      });
      DBService.addAuditLog('Carga Importação Fornecedores', `Carga em massa efetuada. ${countAdded} incluídos, ${countUpdated} atualizados.`);

    } else if (targetCollection === 'cost-centers') {
      const currentCC = DBService.getCostCenters();
      parsedPreview.forEach((imported: Omit<CostCenter, 'dataCriacao'>) => {
        const existing = currentCC.find(c => c.id === imported.id);
        if (existing) {
          DBService.updateCostCenter(existing.id, { descricao: imported.descricao, status: imported.status });
          countUpdated++;
        } else {
          DBService.addCostCenter(imported);
          countAdded++;
        }
      });
      DBService.addAuditLog('Carga Importação Centro de Custos', `Carga em massa efetuada. ${countAdded} cadastros CC incluídos, ${countUpdated} atualizados.`);

    } else {
      const currentUnits = DBService.getUnits();
      parsedPreview.forEach((imported: Omit<Unit, 'dataCriacao'>) => {
        const existing = currentUnits.find(u => u.id === imported.id);
        if (existing) {
          DBService.updateUnit(existing.id, { nome: imported.nome, status: imported.status });
          countUpdated++;
        } else {
          DBService.addUnit(imported);
          countAdded++;
        }
      });
      DBService.addAuditLog('Carga Importação Unidades MV', `Carga em massa de unidades efetuada. ${countAdded} filias incluídas, ${countUpdated} atualizadas.`);
    }

    setSuccessMsg(`Carga de ${targetCollection === 'suppliers' ? 'Fornecedores' : targetCollection === 'cost-centers' ? 'Centros de Custo' : 'Unidades MV'} concluída com sucesso! Registrados: ${countAdded} novos, Atualizados em massa: ${countUpdated}.`);
    setParsedPreview([]);
    setFile(null);
  };

  // Systems backup & states export
  const handleExportBackup = () => {
    try {
      const backupString = DBService.exportBackup();
      const blob = new Blob([backupString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const dateStr = new Date().toISOString().slice(0, 10);
      const timeStr = new Date().toTimeString().slice(0, 8).replace(/:/g, '-');
      link.href = url;
      link.download = `backup_sistema_retencoes_${dateStr}_${timeStr}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      setBackupSuccess('Cópia de segurança (.json) gerada e baixada com sucesso!');
      setBackupError('');
      
      DBService.addAuditLog('Exportação de Backup', 'Cópia de segurança completa do banco de dados baixada pelo usuário.');
    } catch (err: any) {
      setBackupError(`Erro ao compilar cópia de segurança: ${err.message || err}`);
      setBackupSuccess('');
    }
  };

  const handleBackupFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setBackupFile(selected);
      setBackupSuccess('');
      setBackupError('');
      
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const content = String(evt.target?.result || '');
          setBackupStringContent(content);
          // basic validation
          const parsed = JSON.parse(content);
          if (!parsed || typeof parsed !== 'object' || !parsed.data) {
            setBackupError('Estrutura do arquivo de backup inválida ou não suportada.');
            setBackupFile(null);
            setBackupStringContent('');
          }
        } catch (err: any) {
          setBackupError('Este arquivo não pôde ser interpretado como JSON legítimo. Verifique se é uma cópia de segurança do ERP.');
          setBackupFile(null);
          setBackupStringContent('');
        }
      };
      reader.readAsText(selected);
    }
  };

  const handleRestoreConfirm = () => {
    if (!backupStringContent) return;
    
    if (backupMode === 'overwrite') {
      setIsRestoreOverwriteConfirming(true);
    } else {
      const result = DBService.importBackup(backupStringContent, 'merge');
      if (result.success && result.stats) {
        setBackupSuccess(`Restauração efetuada com sucesso! Novos registros mesclados: Usuários: ${result.stats.users}, Fornecedores: ${result.stats.suppliers}, Centros de Custo: ${result.stats.costCenters}, Unidades: ${result.stats.units}, Processos: ${result.stats.processes}, Logs incorporados: ${result.stats.auditLogs}.`);
        setBackupError('');
        setBackupFile(null);
        setBackupStringContent('');
        
        // Force soft reload after 2s so state refetches on outer views
        setTimeout(() => {
          window.location.reload();
        }, 2500);
      } else {
        setBackupError(result.error || 'Erro interno na extração do backup.');
        setBackupSuccess('');
      }
    }
  };

  const handleResetDatabase = () => {
    try {
      DBService.resetDatabaseToDefault();
      setBackupSuccess('Banco de dados completamente resetado para os parâmetros de semente originais!');
      setBackupError('');
      setIsResetConfirming(false);
      
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (err: any) {
      setBackupError(`Falha ao resetar banco: ${err.message || err}`);
      setIsResetConfirming(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Visual Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-zinc-50 tracking-tight font-sans">
            Carga de Dados & Cópias de Segurança
          </h2>
        </div>
        
        {/* Tab Selector Links */}
        <div className="bg-gray-150 dark:bg-zinc-850 p-1 rounded-xl flex items-center border border-gray-200 dark:border-zinc-800 self-start">
          <button
            id="subtab-bulk-xlsx"
            onClick={() => setActiveTab('xlsx')}
            className={`px-4 py-2 text-xs font-bold rounded-lg cursor-pointer flex items-center gap-2 transition ${
              activeTab === 'xlsx'
                ? 'bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-50 shadow-sm'
                : 'text-gray-500 hover:text-gray-900 dark:hover:text-zinc-300'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4 text-blue-500" />
            Carga em Lote (.xlsx)
          </button>
          
          <button
            id="subtab-system-backup"
            onClick={() => setActiveTab('backup')}
            className={`px-4 py-2 text-xs font-bold rounded-lg cursor-pointer flex items-center gap-2 transition ${
              activeTab === 'backup'
                ? 'bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-50 shadow-sm'
                : 'text-gray-500 hover:text-gray-900 dark:hover:text-zinc-300'
            }`}
          >
            <Database className="w-4 h-4 text-emerald-500" />
            Backup do Sistema (.json)
          </button>
        </div>
      </div>

      {/* RENDER EXCEL BULK LOADER SCREEN */}
      {activeTab === 'xlsx' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-150">
          
          {/* Main loader panel */}
          <div className="lg:col-span-2 space-y-4">
            
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm space-y-4">
              
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase mb-2">
                  Qual banco de dados alimentar / atualizar em lote?
                </label>
                
                <div className="grid grid-cols-3 gap-2 col-span-3">
                  <button
                    id="tab-import-forn"
                    onClick={() => {
                      setTargetCollection('suppliers');
                      setParsedPreview([]);
                      setFile(null);
                    }}
                    className={`py-3 px-2 rounded-xl text-xs font-semibold uppercase text-center border cursor-pointer transition ${
                      targetCollection === 'suppliers'
                        ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border-blue-250 dark:border-blue-900'
                        : 'bg-white dark:bg-zinc-900 text-gray-600 dark:text-zinc-400 hover:bg-gray-50 dark:hover:bg-zinc-800/60 border-gray-200 dark:border-zinc-800'
                    }`}
                  >
                    Fornecedores
                  </button>

                  <button
                    id="tab-import-cc"
                    onClick={() => {
                      setTargetCollection('cost-centers');
                      setParsedPreview([]);
                      setFile(null);
                    }}
                    className={`py-3 px-2 rounded-xl text-xs font-semibold uppercase text-center border cursor-pointer transition ${
                      targetCollection === 'cost-centers'
                        ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border-blue-250 dark:border-blue-900'
                        : 'bg-white dark:bg-zinc-900 text-gray-600 dark:text-zinc-400 hover:bg-gray-50 dark:hover:bg-zinc-800/60 border-gray-200 dark:border-zinc-800'
                    }`}
                  >
                    Centros de Custo
                  </button>

                  <button
                    id="tab-import-unidades"
                    onClick={() => {
                      setTargetCollection('units');
                      setParsedPreview([]);
                      setFile(null);
                    }}
                    className={`py-3 px-2 rounded-xl text-xs font-semibold uppercase text-center border cursor-pointer transition ${
                      targetCollection === 'units'
                        ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border-blue-250 dark:border-blue-900'
                        : 'bg-white dark:bg-zinc-900 text-gray-600 dark:text-zinc-400 hover:bg-gray-50 dark:hover:bg-zinc-800/60 border-gray-200 dark:border-zinc-800'
                    }`}
                  >
                    Unidades MV
                  </button>
                </div>
              </div>

              {successMsg && (
                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/45 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-start gap-2.5 text-xs font-semibold">
                  <Check className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{successMsg}</span>
                </div>
              )}

              {errors.map((err, i) => (
                <div key={i} className="p-4 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 rounded-xl flex items-start gap-2 text-xs font-semibold">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{err}</span>
                </div>
              ))}

              {/* Excel Drag and Drop Box */}
              <div 
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-2xl p-8 text-center transition flex flex-col items-center justify-center cursor-pointer ${
                  dragActive 
                    ? 'border-blue-500 bg-blue-50/20 dark:bg-blue-950/10' 
                    : 'border-gray-300 hover:border-gray-450 dark:border-zinc-800 dark:hover:border-zinc-750 bg-gray-50/25 dark:bg-zinc-900/40'
                }`}
                onClick={() => document.getElementById('file-upload-raw')?.click()}
              >
                <input 
                  id="file-upload-raw"
                  type="file" 
                  className="hidden" 
                  accept=".xlsx, .xls"
                  onChange={handleFileChange} 
                />
                <Upload className="w-10 h-10 text-blue-600 dark:text-blue-500 mb-3" />
                
                {file ? (
                  <div>
                    <p className="text-sm font-bold text-gray-800 dark:text-zinc-200">Arquivo Carregado</p>
                    <p className="text-xs text-gray-500 font-mono mt-1">{file.name} ({(file.size / 1024).toFixed(1)} KB)</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm font-semibold text-gray-800 dark:text-zinc-200">Arraste a planilha de faturamento .xlsx para cá</p>
                    <p className="text-xs text-gray-500 mt-1">ou clique aqui para abrir o explorador</p>
                  </div>
                )}
              </div>

              {/* Preview mapping template */}
              {parsedPreview.length > 0 && (
                <div className="space-y-3 pt-2">
                  <div className="flex justify-between items-center bg-gray-50 dark:bg-zinc-850 p-3 rounded-lg text-xs md:flex-row flex-col gap-2.5">
                    <span className="font-semibold text-gray-700 dark:text-zinc-300">
                      Mapeia: <span className="font-mono bg-blue-100 dark:bg-blue-950 px-1.5 py-0.5 rounded font-bold text-blue-800 dark:text-blue-300">{parsedPreview.length} linhas</span>
                    </span>
                    
                    <button
                      id="btn-confirm-bulk-import"
                      type="button"
                      onClick={handleImporterConfirm}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg cursor-pointer transition shadow-md text-xs"
                    >
                      Gravar Tudo no Banco
                    </button>
                  </div>

                  <div className="border border-gray-150 dark:border-zinc-800 rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                    <table className="w-full text-left text-[10px] divide-y divide-gray-150 dark:divide-zinc-800">
                      <thead>
                        <tr className="bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-zinc-405 uppercase font-mono font-bold">
                          {targetCollection === 'suppliers' ? (
                            <>
                              <th className="p-2">Fornecedor</th>
                              <th className="p-2">CNPJ</th>
                              <th className="p-2">Cod MV</th>
                              <th className="p-2">INSS</th>
                              <th className="p-2">IRRF</th>
                              <th className="p-2">CSRF</th>
                            </>
                          ) : targetCollection === 'cost-centers' ? (
                            <>
                              <th className="p-2">Codigo</th>
                              <th className="p-2">Descricao</th>
                              <th className="p-2">Status</th>
                            </>
                          ) : (
                            <>
                              <th className="p-2">Codigo MV</th>
                              <th className="p-2">Nome Unidade</th>
                              <th className="p-2">Status</th>
                            </>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-zinc-850">
                        {parsedPreview.slice(0, 15).map((prev, idx) => (
                          <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-zinc-800/10 divide-x divide-gray-100 dark:divide-zinc-800">
                            {targetCollection === 'suppliers' ? (
                              <>
                                <td className="p-2 truncate max-w-[120px] font-semibold text-gray-800 dark:text-zinc-200">{prev.nome}</td>
                                <td className="p-2 font-mono">{prev._validatedCnpj || prev.cnpj}</td>
                                <td className="p-2 font-mono">{prev.codigoMV}</td>
                                <td className="p-2 font-mono">{prev.inss.incide ? `${prev.inss.aliquota}%` : 'Não'}</td>
                                <td className="p-2 font-mono">{prev.irrf.incide ? `${prev.irrf.aliquota}%` : 'Não'}</td>
                                <td className="p-2 font-mono">{prev.csrf.incide ? `${prev.csrf.aliquota}%` : 'Não'}</td>
                              </>
                            ) : targetCollection === 'cost-centers' ? (
                              <>
                                <td className="p-2 font-mono font-bold text-gray-800 dark:text-zinc-200">{prev.id}</td>
                                <td className="p-2 truncate max-w-[160px] text-gray-600 dark:text-zinc-400">{prev.descricao}</td>
                                <td className="p-2 text-gray-600 dark:text-zinc-400">{prev.status}</td>
                              </>
                            ) : (
                              <>
                                <td className="p-2 font-mono font-bold text-gray-800 dark:text-zinc-200">{prev.id}</td>
                                <td className="p-2 truncate max-w-[160px] text-gray-600 dark:text-zinc-400">{prev.nome}</td>
                                <td className="p-2 text-gray-600 dark:text-zinc-400">{prev.status}</td>
                              </>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {parsedPreview.length > 15 && (
                      <p className="text-[10px] text-gray-400 italic text-center p-2 border-t border-gray-100 dark:border-zinc-800 bg-gray-50/10">
                        Exibindo as primeiras 15 linhas como amostra...
                      </p>
                    )}
                  </div>
                </div>
              )}

            </div>
          </div>

          {/* Guidelines Sidebar */}
          <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm self-start space-y-4">
            <div className="flex items-center gap-2 border-b border-gray-150 dark:border-zinc-800 pb-3">
              <HelpCircle className="w-5 h-5 text-emerald-500" />
              <span className="font-bold text-sm text-gray-800 dark:text-zinc-200">Estruturas e Modelos</span>
            </div>

            <p className="text-xs text-gray-600 dark:text-zinc-400 leading-relaxed font-sans">
              Para garantir que as importações em massa de novos parâmetros faturamento ocorram sem falhas contábeis, utilize nossos modelos excel oficiais.
            </p>

            <button
              id="btn-download-spreadsheet-template"
              onClick={downloadTemplate}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-3 bg-gray-50 hover:bg-gray-100 dark:bg-zinc-800/80 dark:hover:bg-zinc-800 text-xs font-bold font-sans rounded-xl border border-gray-200 dark:border-zinc-700 cursor-pointer transition text-gray-700 dark:text-zinc-300 shadow-sm"
            >
              <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Planilha de Modelo ({targetCollection === 'suppliers' ? 'Fornecedores' : targetCollection === 'cost-centers' ? 'Custos' : 'Unidades'})
            </button>

            <div className="text-[10px] text-gray-500 dark:text-zinc-400 border-t border-gray-100 dark:border-zinc-800 pt-4 space-y-2 leading-relaxed">
              <p className="font-bold">Informações Técnicas:</p>
              <ul className="list-disc pl-4 space-y-1">
                <li>Não altere os nomes padrões das colunas.</li>
                <li>CPRB e incidências de impostos validam as strings 'Sim' ou 'Não'.</li>
                <li>Mapeamentos duplicados de CNPJ farão atualizações automáticas em lote dos fornecedores existentes.</li>
              </ul>
            </div>
          </div>

        </div>
      )}

      {/* RENDER SYSTEM BACKUP & RESTORE (.json) TAB */}
      {activeTab === 'backup' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-150">
          
          {/* Main system backup and restore controls */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Status alerts */}
            {backupSuccess && (
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/45 text-emerald-600 dark:text-emerald-400 rounded-2xl border border-emerald-100 dark:border-emerald-900/20 flex items-start gap-3 text-xs font-semibold animate-in slide-in-from-top-2">
                <Check className="w-5 h-5 shrink-0 text-emerald-500" />
                <div className="space-y-1">
                  <p className="font-bold text-emerald-800 dark:text-emerald-200">Operação de Backup Efetuada</p>
                  <p className="text-emerald-600 dark:text-emerald-400 font-medium leading-relaxed">{backupSuccess}</p>
                </div>
              </div>
            )}

            {backupError && (
              <div className="p-4 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 rounded-2xl border border-red-100 dark:border-red-900/30 flex items-start gap-3 text-xs font-semibold animate-in slide-in-from-top-2">
                <AlertCircle className="w-5 h-5 shrink-0 text-red-500" />
                <div className="space-y-1">
                  <p className="font-bold text-red-800 dark:text-red-300">Falha na Operação</p>
                  <p className="text-red-600 dark:text-red-400 leading-relaxed">{backupError}</p>
                </div>
              </div>
            )}

            <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm space-y-6">
              
              {/* Back up generation card */}
              <div className="space-y-4">
                <div className="flex gap-2.5 items-center">
                  <div className="p-2 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-xl">
                    <Download className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 dark:text-zinc-50">1. Gerar e Baixar Cópia de Segurança</h3>
                    <p className="text-xs text-gray-500 dark:text-zinc-400">Gere um arquivo estruturado criptografado localmente no formato JSON com todo o banco.</p>
                  </div>
                </div>

                <div className="p-4 bg-gray-50 dark:bg-zinc-850 rounded-xl flex items-center justify-between gap-4 flex-wrap border border-gray-150 dark:border-zinc-800">
                  <div className="text-left space-y-1">
                    <p className="text-xs text-gray-500 dark:text-zinc-450 uppercase font-mono tracking-wider font-semibold">Tamanho estimado do backup</p>
                    <p className="text-xs text-gray-700 dark:text-zinc-300 font-bold">
                      Completo contendo os cadastros de {supplierCount} Fornecedores, {ccCount} CCs, {unitCount} Filiais, {processCount} Notas e {logsCount} Auditorias.
                    </p>
                  </div>

                  <button
                    id="btn-generate-backup-json"
                    type="button"
                    onClick={handleExportBackup}
                    className="px-5 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl cursor-pointer transition shadow-md text-xs flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Gerar Cópia (.json)
                  </button>
                </div>
              </div>

              <hr className="border-gray-100 dark:border-zinc-850" />

              {/* Restore database card */}
              <div className="space-y-4">
                <div className="flex gap-2.5 items-center">
                  <div className="p-2 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-xl">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 dark:text-zinc-50">2. Restaurar Banco de Dados</h3>
                    <p className="text-xs text-gray-500 dark:text-zinc-400">Importe um arquivo de cópia de segurança gerado anteriormente para atualizar o ERP de retenções.</p>
                  </div>
                </div>

                {/* Restore execution mode radios */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <label htmlFor="mode-merge" className={`p-4 rounded-xl border cursor-pointer flex items-start gap-3 transition ${
                    backupMode === 'merge'
                      ? 'border-blue-500 bg-blue-50/15 dark:bg-blue-950/10'
                      : 'border-gray-200 dark:border-zinc-800 hover:bg-gray-50/55 dark:hover:bg-zinc-850/40'
                  }`}>
                    <input
                      id="mode-merge"
                      type="radio"
                      name="restore-mode"
                      checked={backupMode === 'merge'}
                      onChange={() => setBackupMode('merge')}
                      className="mt-1 accent-blue-600"
                    />
                    <div>
                      <p className="text-xs font-bold text-gray-800 dark:text-zinc-200">Mesclar Registros (Seguro)</p>
                      <p className="text-[10px] text-gray-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                        Apenas adiciona dados inéditos sem comprometer nenhum lançamento contábil atual de sua empresa.
                      </p>
                    </div>
                  </label>

                  <label htmlFor="mode-overwrite" className={`p-4 rounded-xl border cursor-pointer flex items-start gap-3 transition ${
                    backupMode === 'overwrite'
                      ? 'border-red-500 bg-red-50/10 dark:bg-red-950/10 font-bold'
                      : 'border-gray-200 dark:border-zinc-800 hover:bg-gray-50/55 dark:hover:bg-zinc-850/40'
                  }`}>
                    <input
                      id="mode-overwrite"
                      type="radio"
                      name="restore-mode"
                      checked={backupMode === 'overwrite'}
                      onChange={() => setBackupMode('overwrite')}
                      className="mt-1 accent-red-600"
                    />
                    <div>
                      <p className="text-xs font-bold text-red-600 dark:text-red-400">Substituição Completa (Limpar ERP)</p>
                      <p className="text-[10px] text-gray-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                        Esvazia o banco de dados local atual antes de escrever as informações da cópia. Dados atuais serão perdidos.
                      </p>
                    </div>
                  </label>
                </div>

                {backupMode === 'overwrite' && (
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 rounded-xl border border-amber-200 dark:border-amber-900/30 text-xs font-medium leading-relaxed">
                    Você selecionou a substituição completa. Esse modo só deve ser usado em caso de colapsos, migrações completas de máquinas de produção ou simulações.
                  </div>
                )}

                {/* Drag and drop for JSON */}
                <div 
                  className="border-2 border-dashed border-gray-300 dark:border-zinc-800 hover:border-gray-450 dark:hover:border-zinc-750 bg-gray-50/25 dark:bg-zinc-900/40 rounded-2xl p-6 text-center transition flex flex-col items-center justify-center cursor-pointer"
                  onClick={() => document.getElementById('backup-upload-raw')?.click()}
                >
                  <input 
                    id="backup-upload-raw"
                    type="file" 
                    className="hidden" 
                    accept=".json"
                    onChange={handleBackupFileChange} 
                  />
                  <FileJson className="w-10 h-10 text-emerald-600 dark:text-emerald-500 mb-2" />
                  
                  {backupFile ? (
                    <div>
                      <p className="text-xs font-bold text-gray-800 dark:text-zinc-200">Arquivo de Segurança Localizado</p>
                      <p className="text-[10px] text-gray-500 font-mono mt-0.5">{backupFile.name} ({(backupFile.size / 1024).toFixed(1)} KB)</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-xs font-semibold text-gray-800 dark:text-zinc-200">Selecione ou clique para buscar a cópia .json</p>
                      <p className="text-[10px] text-gray-500 mt-0.5">Sistemas interpretam e validam assinaturas de backup</p>
                    </div>
                  )}
                </div>

                {/* Trigger confirmation */}
                {backupFile && backupStringContent && (
                  <div className="pt-2 text-right">
                    <button
                      id="btn-confirm-database-restore"
                      type="button"
                      onClick={handleRestoreConfirm}
                      className={`px-5 py-2.5 font-bold rounded-xl cursor-pointer text-white transition text-xs shadow-md ${
                        backupMode === 'overwrite'
                          ? 'bg-red-600 hover:bg-red-500'
                          : 'bg-blue-600 hover:bg-blue-500'
                      }`}
                    >
                      Processar Restauração agora ({backupMode === 'overwrite' ? 'Substituir Tudo' : 'Mesclar Inéditos'})
                    </button>
                  </div>
                )}

              </div>

            </div>

            {/* Factoring/Database reset area (Only for ADMIN profile) */}
            {isAdmin && (
              <div className="bg-red-50/40 dark:bg-red-950/10 p-6 rounded-2xl border border-red-150 dark:border-red-900/20 space-y-4 text-left animate-in fade-in">
                <div className="flex gap-2.5 items-start">
                  <ShieldAlert className="w-5 h-5 text-red-650 dark:text-red-400 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-xs font-bold text-red-950 dark:text-red-200 uppercase tracking-wide">Área Restrita Administrativa: Reinício</h3>
                    <p className="text-xs text-red-750 dark:text-red-400 mt-1 leading-relaxed">
                      Caso necessite apagar todos os testes, contas fictícias ou limpezas e requisições para redefinir o ERP com as configurações de seed de fábrica (MedClean, SulSeg, faturamentos modelo do mês):
                    </p>
                  </div>
                </div>

                {isResetConfirming ? (
                  <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-red-200 dark:border-red-900/30 space-y-3 animate-in zoom-in-95 duration-150">
                    <p className="text-xs font-bold text-red-600 dark:text-red-400">Deseja mesmo redefinir TODA a estrutura do banco?</p>
                    <p className="text-[11px] text-gray-500 dark:text-zinc-400 leading-relaxed">
                      Todas as notas cadastradas por sua equipe, fornecedores novos cadastrados e parametrizações operacionais serão apagados sem possibilidades de retorno.
                    </p>
                    <div className="flex gap-2 justify-end">
                      <button
                        type="button"
                        onClick={() => setIsResetConfirming(false)}
                        className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-700 dark:text-zinc-300 rounded-lg text-xs font-bold font-sans cursor-pointer transition"
                      >
                        Cancelar
                      </button>
                      <button
                        id="btn-confirm-system-reset-factory"
                        type="button"
                        onClick={handleResetDatabase}
                        className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold font-sans cursor-pointer transition"
                      >
                        Sim, Resetar Banco
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    id="btn-trigger-factory-reset"
                    type="button"
                    onClick={() => setIsResetConfirming(true)}
                    className="px-4 py-2 bg-red-600 hover:bg-red-550 text-white font-bold rounded-xl cursor-pointer transition text-xs shadow-sm"
                  >
                    Resetar Banco para Configuração Padrão (Seed)
                  </button>
                )}
              </div>
            )}

          </div>

          {/* Backup visual metrics summary sidebar */}
          <div className="space-y-4">
            
            <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-gray-150 dark:border-zinc-800 pb-3">
                <Database className="w-5 h-5 text-emerald-500" />
                <span className="font-bold text-sm text-gray-800 dark:text-zinc-200">Inventário de Objetos</span>
              </div>

              <p className="text-xs text-gray-600 dark:text-zinc-400 leading-relaxed">
                As cópias de segurança coletam os esquemas e valores de todas as tabelas locais disponíveis de forma coerente. Veja o que está incluído nos arquivos salvos:
              </p>

              <div className="space-y-2 pt-1 font-mono text-[11px]">
                <div className="flex justify-between items-center bg-gray-55 dark:bg-zinc-850 p-2 rounded-lg">
                  <span className="text-gray-500 dark:text-zinc-455">Contas de Usuários</span>
                  <span className="font-bold text-gray-800 dark:text-zinc-200 bg-gray-200/50 dark:bg-zinc-800 px-1.5 py-0.5 rounded">{userCount}</span>
                </div>
                <div className="flex justify-between items-center bg-gray-55 dark:bg-zinc-850 p-2 rounded-lg">
                  <span className="text-gray-500 dark:text-zinc-455">Fornecedores Parametrizados</span>
                  <span className="font-bold text-gray-800 dark:text-zinc-200 bg-gray-200/50 dark:bg-zinc-800 px-1.5 py-0.5 rounded">{supplierCount}</span>
                </div>
                <div className="flex justify-between items-center bg-gray-55 dark:bg-zinc-850 p-2 rounded-lg">
                  <span className="text-gray-500 dark:text-zinc-455">Centros de Custo (CC)</span>
                  <span className="font-bold text-gray-800 dark:text-zinc-200 bg-gray-200/50 dark:bg-zinc-800 px-1.5 py-0.5 rounded">{ccCount}</span>
                </div>
                <div className="flex justify-between items-center bg-gray-55 dark:bg-zinc-850 p-2 rounded-lg">
                  <span className="text-gray-500 dark:text-zinc-455">Unidades Hospitalares MV</span>
                  <span className="font-bold text-gray-800 dark:text-zinc-200 bg-gray-200/50 dark:bg-zinc-800 px-1.5 py-0.5 rounded">{unitCount}</span>
                </div>
                <div className="flex justify-between items-center bg-gray-55 dark:bg-zinc-850 p-2 rounded-lg">
                  <span className="text-gray-500 dark:text-zinc-455">Notas e Processos</span>
                  <span className="font-bold text-gray-850 dark:text-emerald-400 bg-emerald-100/35 dark:bg-emerald-950/30 px-1.5 py-0.5 rounded">{processCount}</span>
                </div>
                <div className="flex justify-between items-center bg-gray-55 dark:bg-zinc-850 p-2 rounded-lg">
                  <span className="text-gray-500 dark:text-zinc-455">Logs de Trilha Auditoria</span>
                  <span className="font-bold text-gray-850 dark:text-zinc-200 bg-gray-200/50 dark:bg-zinc-800 px-1.5 py-0.5 rounded">{logsCount}</span>
                </div>
              </div>
            </div>

            <div className="bg-emerald-50/30 dark:bg-emerald-950/10 p-5 rounded-2xl border border-emerald-100 dark:border-emerald-950/20 text-left space-y-2">
              <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300">Auditoria & Segurança</p>
              <p className="text-[11px] text-emerald-700 dark:text-zinc-400 leading-relaxed font-sans">
                Toda geração de arquivos de backup ou restauração de dados críticos aciona um alerta imediato na <strong>Trilha de Auditoria</strong> do sistema. Isso preenche a documentação de compliance de faturamento.
              </p>
            </div>

          </div>

        </div>
      )}

      {/* OVERWRITE RESTORE WARNING DECORATIVE MODAL (Iframe Safe) */}
      {isRestoreOverwriteConfirming && (
        <div className="fixed inset-0 bg-black/65 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-3xl max-w-md w-full p-6 shadow-xl space-y-4 animate-in zoom-in-95 duration-200 text-left">
            <div className="flex items-start gap-3">
              <div className="p-3 bg-red-100 dark:bg-red-950/45 text-red-600 dark:text-red-400 rounded-2xl shrink-0">
                <AlertTriangle className="w-6 h-6 animate-pulse" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-gray-900 dark:text-zinc-50 font-sans">
                  Substituir Base de Dados?
                </h3>
                <p className="text-xs text-gray-500 dark:text-zinc-400 font-medium leading-relaxed">
                  Esta ação é irreversível. Todas as notas contábeis, parceiros, fornecedores cadastrados e trilhas de auditoria atuais serão apagados e substituídos inteiramente pelas informações do arquivo de backup importado.
                </p>
              </div>
            </div>
            
            <div className="p-3.5 bg-red-50/60 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 rounded-xl text-[11px] text-red-700 dark:text-red-400 font-semibold leading-relaxed">
              ⚠ Recomendamos baixar um backup de segurança atual antes de confirmar para evitar perdas acidentais de registros.
            </div>
            
            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setIsRestoreOverwriteConfirming(false)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-700 dark:text-zinc-350 rounded-xl text-xs font-bold font-sans cursor-pointer transition"
              >
                Cancelar
              </button>
              <button
                id="btn-confirm-restore-overwrite-final"
                type="button"
                onClick={() => {
                  setIsRestoreOverwriteConfirming(false);
                  const result = DBService.importBackup(backupStringContent, 'overwrite');
                  if (result.success && result.stats) {
                    setBackupSuccess(`Restauração efetuada com sucesso! Base reiniciada e carregada: Usuários: ${result.stats.users}, Fornecedores: ${result.stats.suppliers}, Centros de Custo: ${result.stats.costCenters}, Unidades: ${result.stats.units}, Processos: ${result.stats.processes}, Logs incorporados: ${result.stats.auditLogs}.`);
                    setBackupError('');
                    setBackupFile(null);
                    setBackupStringContent('');
                    
                    setTimeout(() => {
                      window.location.reload();
                    }, 2500);
                  } else {
                    setBackupError(result.error || 'Erro interno na extração do backup.');
                    setBackupSuccess('');
                  }
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-550 text-white rounded-xl text-xs font-bold font-sans cursor-pointer transition shadow-md"
              >
                Sim, Substituir Tudo
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
