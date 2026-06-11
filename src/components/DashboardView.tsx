/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo } from 'react';
import { DBService } from '../services/db';
import { formatarMoeda, formatarCompetencia } from '../utils/validation';
import { 
  TrendingUp, Landmark, ShieldCheck, DollarSign, Calendar, RefreshCw, 
  ArrowUpRight, ArrowDownRight, Layers, FileText
} from 'lucide-react';
import { motion } from 'motion/react';

export default function DashboardView() {
  const [selectedPeriod, setSelectedPeriod] = useState<string>('todos'); // 'todos', 'maio', 'junho' 
  
  const processes = useMemo(() => {
    const list = DBService.getProcesses();
    if (selectedPeriod === 'maio') {
      return list.filter(p => p.competenciaServico === '2026-05');
    }
    if (selectedPeriod === 'junho') {
      return list.filter(p => p.competenciaServico === '2026-06');
    }
    return list;
  }, [selectedPeriod]);

  // Totais
  const stats = useMemo(() => {
    let bruteTotal = 0;
    let netTotal = 0;
    let inssTotal = 0;
    let irrfTotal = 0;
    let csrfTotal = 0;
    let issTotal = 0;

    processes.forEach(p => {
      bruteTotal += p.valorNotaFiscal;
      netTotal += p.valorLiquido;
      inssTotal += p.inssValor;
      irrfTotal += p.irrfValor;
      csrfTotal += p.csrfValor;
      issTotal += p.issValor;
    });

    const retentionTotal = inssTotal + irrfTotal + csrfTotal + issTotal;

    return {
      count: processes.length,
      bruteTotal,
      netTotal,
      inssTotal,
      irrfTotal,
      csrfTotal,
      issTotal,
      retentionTotal
    };
  }, [processes]);

  // Dados para Gráfico de Colunas (por processo)
  const chartData = useMemo(() => {
    return processes.map(p => ({
      name: `NF ${p.notaFiscal}`,
      bruto: p.valorNotaFiscal,
      retido: p.inssValor + p.irrfValor + p.csrfValor + p.issValor,
      liquido: p.valorLiquido
    })).slice(0, 6); // exibe até os 6 primeiros
  }, [processes]);

  return (
    <div className="space-y-6">
      
      {/* Header com Filtros de Período */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-zinc-50 tracking-tight font-sans">
            Painel Executivo
          </h2>

        </div>

        {/* Period selection */}
        <div className="flex items-center gap-2 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 p-1.5 rounded-xl self-start md:self-auto shadow-sm">
          <button
            id="btn-filter-period-all"
            onClick={() => setSelectedPeriod('todos')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase transition cursor-pointer ${
              selectedPeriod === 'todos'
                ? 'bg-blue-600 text-white dark:bg-blue-500'
                : 'text-gray-600 dark:text-zinc-400 hover:bg-gray-50 dark:hover:bg-zinc-800/50'
            }`}
          >
            Todas Competências
          </button>
          <button
            id="btn-filter-period-may" 
            onClick={() => setSelectedPeriod('maio')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase transition cursor-pointer ${
              selectedPeriod === 'maio'
                ? 'bg-blue-600 text-white dark:bg-blue-500'
                : 'text-gray-600 dark:text-zinc-400 hover:bg-gray-50 dark:hover:bg-zinc-800/50'
            }`}
          >
            Maio 2026
          </button>
          <button
            id="btn-filter-period-jun"
            onClick={() => setSelectedPeriod('junho')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase transition cursor-pointer ${
              selectedPeriod === 'junho'
                ? 'bg-blue-600 text-white dark:bg-blue-500'
                : 'text-gray-600 dark:text-zinc-400 hover:bg-gray-50 dark:hover:bg-zinc-800/50'
            }`}
          >
            Junho 2026
          </button>
        </div>
      </div>

      {/* Grid de KPIs Principais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* KPI 1: Qtd Processos */}
        <div id="kpi-process-count" className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-zinc-500 font-mono">
                Processos Ativos
              </p>
              <h3 className="text-3xl font-bold font-mono tracking-tight text-gray-900 dark:text-zinc-50 mt-1">
                {stats.count}
              </h3>
            </div>
            <div className="p-3 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-xl">
              <FileText className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-xs text-blue-600 dark:text-blue-400 font-medium font-sans">
            <ArrowUpRight className="w-4 h-4 mr-0.5" />
            <span>Processos faturados neste período</span>
          </div>
        </div>

        {/* KPI 2: Valor Bruto Total */}
        <div id="kpi-gross-value" className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-zinc-500 font-mono">
                Valor Bruto Total (Nota)
              </p>
              <h3 className="text-2xl font-black font-mono tracking-tight text-gray-900 dark:text-zinc-50 mt-1">
                {formatarMoeda(stats.bruteTotal)}
              </h3>
            </div>
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-xl">
              <Layers className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-xs text-amber-600 dark:text-amber-400 font-medium font-sans">
            <TrendingUp className="w-4 h-4 mr-0.5" />
            <span>Faturamento Bruto Consolidado</span>
          </div>
        </div>

        {/* KPI 3: Total Retido */}
        <div id="kpi-retention-value" className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-zinc-500 font-mono">
                Tributação Retida
              </p>
              <h3 className="text-2xl font-black font-mono tracking-tight text-red-600 dark:text-red-400 mt-1">
                {formatarMoeda(stats.retentionTotal)}
              </h3>
            </div>
            <div className="p-3 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 rounded-xl">
              <Landmark className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-xs text-red-600 dark:text-red-400 font-medium font-sans">
            <ArrowDownRight className="w-4 h-4 mr-0.5" />
            <span>{(stats.bruteTotal > 0 ? (stats.retentionTotal / stats.bruteTotal * 100).toFixed(1) : 0)}% de carga retida na fonte</span>
          </div>
        </div>

        {/* KPI 4: Valor Líquido total */}
        <div id="kpi-net-value" className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-zinc-500 font-mono">
                Valor Líquido a Pagar
              </p>
              <h3 className="text-2xl font-black font-mono tracking-tight text-emerald-600 dark:text-emerald-400 mt-1">
                {formatarMoeda(stats.netTotal)}
              </h3>
            </div>
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-xs text-emerald-600 dark:text-emerald-400 font-medium font-sans">
            <ShieldCheck className="w-4 h-4 mr-0.5" />
            <span>Consolidação após descontos</span>
          </div>
        </div>

      </div>

      {/* Grid de Impostos Retidos Detalhados */}
      <h3 className="text-sm font-semibold tracking-wider text-gray-400 dark:text-zinc-500 uppercase mt-8 block">
        Retenções por Tributo Específico (Conferência Geral)
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* INSS */}
        <div id="tax-inss-card" className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-gray-100 dark:border-zinc-800">
          <div className="text-xs font-semibold text-gray-500 dark:text-zinc-400">INSS Retido (11% / 3.5%)</div>
          <div className="text-lg font-bold font-mono text-gray-900 dark:text-zinc-50 mt-1">
            {formatarMoeda(stats.inssTotal)}
          </div>
          <div className="w-full bg-gray-100 dark:bg-zinc-800 h-1 rounded-full mt-3 overflow-hidden">
            <div 
              className="bg-blue-500 h-full rounded-full" 
              style={{ width: `${stats.retentionTotal > 0 ? (stats.inssTotal / stats.retentionTotal * 100) : 0}%` }}
            ></div>
          </div>
        </div>
        
        {/* IRRF */}
        <div id="tax-irrf-card" className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-gray-100 dark:border-zinc-800">
          <div className="text-xs font-semibold text-gray-500 dark:text-zinc-400">IRRF Retido</div>
          <div className="text-lg font-bold font-mono text-gray-900 dark:text-zinc-50 mt-1">
            {formatarMoeda(stats.irrfTotal)}
          </div>
          <div className="w-full bg-gray-100 dark:bg-zinc-800 h-1 rounded-full mt-3 overflow-hidden">
            <div 
              className="bg-amber-500 h-full rounded-full" 
              style={{ width: `${stats.retentionTotal > 0 ? (stats.irrfTotal / stats.retentionTotal * 100) : 0}%` }}
            ></div>
          </div>
        </div>

        {/* CSRF */}
        <div id="tax-csrf-card" className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-gray-100 dark:border-zinc-800">
          <div className="text-xs font-semibold text-gray-500 dark:text-zinc-400">CSRF Retido (4.65%)</div>
          <div className="text-lg font-bold font-mono text-gray-900 dark:text-zinc-50 mt-1">
            {formatarMoeda(stats.csrfTotal)}
          </div>
          <div className="w-full bg-gray-100 dark:bg-zinc-800 h-1 rounded-full mt-3 overflow-hidden">
            <div 
              className="bg-purple-500 h-full rounded-full" 
              style={{ width: `${stats.retentionTotal > 0 ? (stats.csrfTotal / stats.retentionTotal * 100) : 0}%` }}
            ></div>
          </div>
        </div>

        {/* ISS */}
        <div id="tax-iss-card" className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-gray-100 dark:border-zinc-800">
          <div className="text-xs font-semibold text-gray-500 dark:text-zinc-400">ISS Retido</div>
          <div className="text-lg font-bold font-mono text-gray-900 dark:text-zinc-50 mt-1">
            {formatarMoeda(stats.issTotal)}
          </div>
          <div className="w-full bg-gray-100 dark:bg-zinc-800 h-1 rounded-full mt-3 overflow-hidden">
            <div 
              className="bg-teal-500 h-full rounded-full" 
              style={{ width: `${stats.retentionTotal > 0 ? (stats.issTotal / stats.retentionTotal * 100) : 0}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Seção Analítica de Processamento e Auditoria */}
      <div className="grid grid-cols-1 gap-6 pt-2">
        
        {/* Gráfico Analítico SVG Customizado - 100% Responsivo e livre de erros */}
        <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm w-full">
          <h4 className="text-sm font-bold text-gray-800 dark:text-zinc-200 mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-500" />
            Análise Comparativa de Notas Fiscais ({processes.length} Lançados)
          </h4>
          
          {chartData.length === 0 ? (
            <div className="h-52 flex items-center justify-center text-xs text-gray-400">
              Não há dados suficientes no período selecionado.
            </div>
          ) : (
            <div className="space-y-4">
              {chartData.map((data, idx) => {
                const total = Math.max(...chartData.map(d => d.bruto));
                const percentBruto = (data.bruto / total) * 100;
                const percentRetido = (data.retido / data.bruto) * 100;
                
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-gray-700 dark:text-zinc-300 font-mono">{data.name}</span>
                      <span className="font-mono text-gray-500 dark:text-zinc-400">
                        Bruto: {formatarMoeda(data.bruto)} | Retido: {formatarMoeda(data.retido)}
                      </span>
                    </div>
                    
                    {/* Barra de Progresso Compartilhada */}
                    <div className="w-full bg-gray-100 dark:bg-zinc-800 h-3 rounded-full flex overflow-hidden">
                      {/* Retido */}
                      <div 
                        className="bg-red-500 h-full" 
                        style={{ width: `${percentBruto * (percentRetido / 100)}%` }}
                        title={`Retido: ${percentRetido.toFixed(1)}%`}
                      ></div>
                      {/* Líquido */}
                      <div 
                        className="bg-emerald-500 h-full" 
                        style={{ width: `${percentBruto * (1 - percentRetido / 100)}%` }}
                        title="Vl. Líquido"
                      ></div>
                    </div>
                  </div>
                );
              })}
              <div className="pt-2 border-t border-gray-100 dark:border-zinc-800 flex justify-between text-[10px] text-gray-400">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 bg-red-500 rounded"></span> Impostos Retidos
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 bg-emerald-500 rounded"></span> Líquido Pago
                </span>
              </div>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
