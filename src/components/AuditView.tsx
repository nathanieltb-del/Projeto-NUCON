/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import { useState, useMemo } from 'react';
import { DBService } from '../services/db';
import { AuditLog } from '../types';
import { formatarDataHora } from '../utils/validation';
import { ShieldCheck, Search, Eye, Calendar, User, Info, Terminal } from 'lucide-react';

export default function AuditView() {
  const [logs, setLogs] = useState<AuditLog[]>(() => DBService.getAuditLogs());
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const filteredLogs = useMemo(() => {
    return logs.filter(l => 
      l.operacao.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.details?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.usuarioNome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.usuarioLogin.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.detalhes.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [logs, searchTerm]);

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-zinc-50 tracking-tight font-sans">
          Trilha de Auditoria e Logs
        </h2>
        <p className="text-sm text-gray-500 dark:text-zinc-400">
          Auditoria retroativa e rastreio de alterações cadastrais e lançamentos de faturamento no ERP.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Lista de Logs */}
        <div className="lg:col-span-2 space-y-4">
          
          {/* Barra de Busca */}
          <div className="bg-white dark:bg-zinc-900 p-3 rounded-xl border border-gray-150 dark:border-zinc-800 flex items-center gap-2">
            <span className="text-gray-400 pl-2">
              <Search className="w-4 h-4" />
            </span>
            <input
              id="audit-search-input"
              type="text"
              placeholder="Pesquisar logs por operação, analista, login ou detalhes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs bg-transparent text-gray-900 dark:text-zinc-50 placeholder-gray-400 focus:outline-none"
            />
          </div>

          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm overflow-hidden">
            <div className="max-h-[500px] overflow-y-auto divide-y divide-gray-100 dark:divide-zinc-800/80">
              {filteredLogs.length === 0 ? (
                <div className="p-8 text-center text-xs text-gray-400">
                  Nenhum registro de log confere com os filtros de busca.
                </div>
              ) : (
                filteredLogs.map((log) => {
                  const isCurrentSelected = selectedLog?.id === log.id;
                  return (
                    <div 
                      key={log.id} 
                      id={`audit-log-item-${log.id}`}
                      onClick={() => setSelectedLog(log)}
                      className={`p-4 text-xs cursor-pointer hover:bg-gray-50/40 dark:hover:bg-zinc-800/20 transition flex items-start justify-between gap-4 ${
                        isCurrentSelected ? 'bg-blue-50/20 dark:bg-blue-950/10 border-l-4 border-blue-500' : ''
                      }`}
                    >
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-900 dark:text-zinc-200 uppercase bg-gray-50 dark:bg-zinc-800 px-2 py-0.5 rounded font-mono text-[10px]">
                            {log.operacao}
                          </span>
                          <span className="text-gray-400 font-mono text-[10px] flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatarDataHora(log.dataHora)}
                          </span>
                        </div>
                        <p className="text-gray-700 dark:text-zinc-300 leading-relaxed">
                          {log.detalhes}
                        </p>
                        <div className="text-[10px] text-gray-400 flex items-center gap-1">
                          <User className="w-3 h-3 text-gray-400" />
                          <span>Analista: <span className="font-semibold text-gray-650 dark:text-zinc-400">{log.usuarioNome}</span> ({log.perfil})</span>
                        </div>
                      </div>
                      <span className="text-gray-300 hover:text-blue-500 transition self-center shrink-0">
                        <Eye className="w-4 h-4" />
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Detalhes do Log selecionado */}
        <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm self-start space-y-4">
          <div className="border-b border-gray-150 dark:border-zinc-800 pb-3 flex items-center gap-2">
            <Terminal className="w-4 h-4 text-blue-500" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500">
              Metadados do Relato Técnico
            </h3>
          </div>

          {!selectedLog ? (
            <div className="text-center p-8 text-xs text-gray-400 italic">
              Selecione qualquer registro de auditoria ao lado para inspecionar os valores alterados em formato JSON.
            </div>
          ) : (
            <div className="space-y-4 text-xs">
              <div>
                <span className="font-bold text-gray-400 dark:text-zinc-500 uppercase block text-[10px] mb-0.5">Identificador Log</span>
                <span className="font-mono text-gray-800 dark:text-zinc-300 bg-gray-100 dark:bg-zinc-800 px-2 py-0.5 rounded">{selectedLog.id}</span>
              </div>

              <div>
                <span className="font-bold text-gray-400 dark:text-zinc-500 uppercase block text-[10px] mb-0.5">Operador do Sistema</span>
                <p className="text-gray-800 dark:text-zinc-200 font-semibold">{selectedLog.usuarioNome}</p>
                <p className="text-gray-500 font-mono text-[10px]">login: {selectedLog.usuarioLogin} | Perfil: {selectedLog.perfil}</p>
              </div>

              {selectedLog.valoresAnteriores && (
                <div>
                  <span className="font-bold text-red-650 dark:text-red-400 uppercase block text-[10px] mb-1">Valores Anteriores (Diferencial)</span>
                  <pre id="audit-previous-json" className="bg-red-50/20 dark:bg-red-950/10 border border-red-100 dark:border-red-900/30 p-2.5 rounded-lg overflow-x-auto text-[10px] font-mono whitespace-pre-wrap text-red-700 dark:text-red-300 max-h-48">
                    {(() => {
                      try {
                        return JSON.stringify(JSON.parse(selectedLog.valoresAnteriores), null, 2);
                      } catch {
                        return selectedLog.valoresAnteriores;
                      }
                    })()}
                  </pre>
                </div>
              )}

              {selectedLog.valoresNovos && (
                <div>
                  <span className="font-bold text-emerald-700 dark:text-emerald-400 uppercase block text-[10px] mb-1">Valores Novos Consolidados</span>
                  <pre id="audit-new-json" className="bg-emerald-50/20 dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-900/30 p-2.5 rounded-lg overflow-x-auto text-[10px] font-mono whitespace-pre-wrap text-emerald-800 dark:text-emerald-300 max-h-48">
                    {(() => {
                      try {
                        return JSON.stringify(JSON.parse(selectedLog.valoresNovos), null, 2);
                      } catch {
                        return selectedLog.valoresNovos;
                      }
                    })()}
                  </pre>
                </div>
              )}

              <div className="p-3 bg-gray-50 dark:bg-zinc-800/40 border border-gray-100 dark:border-zinc-800 rounded-xl text-[10px] leading-relaxed text-gray-400">
                <Info className="w-3.5 h-3.5 inline mr-1 mb-0.5 text-emerald-500" />
                Estes registros são permanentes e protegidos contra edição física. Estão indexados no ledger local para fins de conformidade com auditoria externa.
              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
