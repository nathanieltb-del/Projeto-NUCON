/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum UserProfile {
  ADMINISTRADOR = 'Administrador',
  OPERADOR = 'Operador',
  CONSULTA = 'Consulta'
}

export enum TaxBaseOption {
  VALOR_NF = 'Valor da Nota Fiscal',
  VALOR_NF_DEDUCOES = 'Valor da Nota Fiscal menos Deduções',
  BASE_PERSONALIZADA = 'Base Personalizada'
}

export interface TaxConfig {
  incide: boolean;
  aliquota: number; // Porcentagem (ex: 4.65 ou 11)
  baseCalculoPadrao: TaxBaseOption;
  basePersonalizadaValor?: number; // Para quando a base for personalizada
}

export interface Supplier {
  id: string;
  nome: string;
  codigoMV: string; // Código do Fornecedor MV
  oficinaMV: string; // Oficina MV
  codigoServico: string; // Código de Serviço
  cnpj: string;
  cprb: boolean; // Sim/Não
  simplesNacional?: boolean; // Optante pelo Simples Nacional
  
  // Configurações tributárias individuais
  inss: TaxConfig;
  irrf: TaxConfig;
  csrf: TaxConfig;
  iss: TaxConfig;
  
  status: 'Ativo' | 'Inativo';
  dataCriacao: string;
}

export interface CostCenter {
  id: string; // Código do Centro de Custo
  descricao: string;
  status: 'Ativo' | 'Inativo';
  dataCriacao: string;
}

export interface Unit {
  id: string; // Código da Unidade (MV)
  nome: string;
  status: 'Ativo' | 'Inativo';
  dataCriacao: string;
}

export interface User {
  id: string;
  nome: string;
  email: string;
  login: string;
  senhaCriptografada: string; // Simulação segura
  perfil: UserProfile;
  status: 'Ativo' | 'Inativo';
  dataCriacao: string;
  ultimoAcesso?: string;
}

export interface AccountingProcess {
  id: string; // ID interno gerado
  numeroSEI: string; // Formato: XXXXX-XXXXXXXX/XXXX-XX
  fornecedorId: string;
  notaFiscal: string;
  contrato: string;
  competenciaServico: string; // ex: "2026-06"
  dataEmissao: string;
  dataAtesto: string;
  centroCustoId: string;
  unidadeId: string;
  
  // Valores informados pelo usuário
  valorNotaFiscal: number;
  deducoesINSS: number;
  
  // Campos de cálculo calculados em tempo real na criação - persistidos no processo
  baseCalculoCalculada: number;
  
  inssIncide: boolean;
  inssBase: number;
  inssAliquota: number;
  inssValor: number;
  
  irrfIncide: boolean;
  irrfBase: number;
  irrfAliquota: number;
  irrfValor: number;
  
  csrfIncide: boolean;
  csrfBase: number;
  csrfAliquota: number;
  csrfValor: number;
  
  issIncide: boolean;
  issBase: number;
  issAliquota: number;
  issValor: number;
  
  valorLiquido: number;
  descricaoServicos: string;
  
  status: 'Processado' | 'Pendente' | 'Cancelado';
  criadoPor: string; // Nome do usuário
  criadoPorId: string;
  dataCriacao: string;
  dataAlteracao?: string;
}

export interface AuditLog {
  id: string;
  usuarioId: string;
  usuarioNome: string;
  usuarioLogin: string;
  perfil: UserProfile;
  dataHora: string;
  operacao: string; // ex: "Login", "Criação de Processo", "Edição de Fornecedor"
  detalhes: string; // ex: "Alterou alíquota de INSS de 11% para 3%"
  valoresAnteriores?: string; // JSON String ou texto
  valoresNovos?: string; // JSON String ou texto
}

export interface DailyProcess {
  id: string;
  numeroSEI: string; // Formato: XXXXX-XXXXXXXX/XXXX-XX ou livre com validação
  fornecedorId: string; // buscado na tabela de fornecedores
  colaboradorId: string; // buscado nos usuários cadastrados (id do usuário)
  dataEncaminhadoFinanceiro: string; // data ISO ou YYYY-MM-DD
  observacao?: string; // Campo opcional de observações do processo
  dataCriacao: string;
  criadoPorId: string;
}
