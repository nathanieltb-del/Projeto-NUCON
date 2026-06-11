/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  User, UserProfile, Supplier, CostCenter, Unit, 
  AccountingProcess, AuditLog, TaxBaseOption, DailyProcess 
} from '../types';

// Chaves para o LocalStorage
const STORAGE_KEYS = {
  USERS: 'retencoes_users',
  SUPPLIERS: 'retencoes_suppliers',
  COST_CENTERS: 'retencoes_cost_centers',
  UNITS: 'retencoes_units',
  PROCESSES: 'retencoes_processes',
  DAILY_PROCESSES: 'retencoes_daily_processes',
  AUDIT_LOGS: 'retencoes_audit_logs',
  CURRENT_USER: 'retencoes_current_user',
  THEME: 'retencoes_theme'
};

const DEFAULT_DAILY_PROCESSES: DailyProcess[] = [
  {
    id: 'dp1',
    numeroSEI: '12345-12345678/2026-01',
    fornecedorId: 's1',
    colaboradorId: 'u2',
    dataEncaminhadoFinanceiro: '2026-06-08',
    dataCriacao: new Date('2026-06-08T10:15:00Z').toISOString(),
    criadoPorId: 'u2'
  },
  {
    id: 'dp2',
    numeroSEI: '04016-00074671/2026-36',
    fornecedorId: 's3',
    colaboradorId: 'u1',
    dataEncaminhadoFinanceiro: '2026-06-10',
    dataCriacao: new Date('2026-06-10T11:30:00Z').toISOString(),
    criadoPorId: 'u1'
  }
];

// Dados semente (Seed Data) padrão
const DEFAULT_USERS: User[] = [
  {
    id: 'u1',
    nome: 'Carlos Souza (Administrador)',
    email: 'carlos.souza@empresa.com',
    login: 'admin',
    senhaCriptografada: 'admin123', // Em produção seria hash, aqui mantemos legível para fins do protótipo/ERP
    perfil: UserProfile.ADMINISTRADOR,
    status: 'Ativo',
    dataCriacao: new Date('2026-01-10T10:00:00Z').toISOString()
  },
  {
    id: 'u2',
    nome: 'Mariana Silva (Operadora)',
    email: 'mariana.silva@empresa.com',
    login: 'operador',
    senhaCriptografada: 'operador123',
    perfil: UserProfile.OPERADOR,
    status: 'Ativo',
    dataCriacao: new Date('2026-01-15T14:30:00Z').toISOString()
  },
  {
    id: 'u3',
    nome: 'Roberto Costa (Consulta)',
    email: 'roberto.costa@empresa.com',
    login: 'consulta',
    senhaCriptografada: 'consulta123',
    perfil: UserProfile.CONSULTA,
    status: 'Ativo',
    dataCriacao: new Date('2026-02-01T09:00:00Z').toISOString()
  }
];

const DEFAULT_COST_CENTERS: CostCenter[] = [
  { id: '10101', descricao: 'Diretoria Geral / Administrativo', status: 'Ativo', dataCriacao: new Date('2026-01-01').toISOString() },
  { id: '10202', descricao: 'Faturamento e Contratos', status: 'Ativo', dataCriacao: new Date('2026-01-01').toISOString() },
  { id: '20101', descricao: 'Manutenção Predial e Infraestrutura', status: 'Ativo', dataCriacao: new Date('2026-01-01').toISOString() },
  { id: '30405', descricao: 'Tecnologia da Informação e Segurança', status: 'Ativo', dataCriacao: new Date('2026-01-01').toISOString() },
  { id: '40102', descricao: 'Recursos Humanos e Pessoal', status: 'Ativo', dataCriacao: new Date('2026-01-01').toISOString() },
  { id: '50103', descricao: 'Serviço de Limpeza e Conservação', status: 'Ativo', dataCriacao: new Date('2026-01-01').toISOString() }
];

const DEFAULT_UNITS: Unit[] = [
  { id: 'HMG-01', nome: 'Hospital Regional Metropolitano', status: 'Ativo', dataCriacao: new Date('2026-01-01').toISOString() },
  { id: 'UPA-LESTE', nome: 'Unidade de Pronto Atendimento - Zona Leste', status: 'Ativo', dataCriacao: new Date('2026-01-01').toISOString() },
  { id: 'AMB-CP', nome: 'Ambulatório Central de Especialidades', status: 'Ativo', dataCriacao: new Date('2026-01-01').toISOString() },
  { id: 'LAB-CENTRAL', nome: 'Laboratório Central de Patologia', status: 'Ativo', dataCriacao: new Date('2026-01-01').toISOString() }
];

const DEFAULT_SUPPLIERS: Supplier[] = [
  {
    id: 's1',
    nome: 'MedClean Soluções de Limpeza Hospitalar Ltda',
    codigoMV: 'FORN-3050',
    oficinaMV: 'OF-HIGIENIZACAO',
    codigoServico: '07.01',
    cnpj: '12.345.678/0001-90',
    cprb: false, // Não optante CPRB
    inss: { incide: true, aliquota: 11, baseCalculoPadrao: TaxBaseOption.VALOR_NF_DEDUCOES },
    irrf: { incide: true, aliquota: 1.5, baseCalculoPadrao: TaxBaseOption.VALOR_NF },
    csrf: { incide: true, aliquota: 4.65, baseCalculoPadrao: TaxBaseOption.VALOR_NF },
    iss: { incide: true, aliquota: 5, baseCalculoPadrao: TaxBaseOption.VALOR_NF },
    status: 'Ativo',
    dataCriacao: new Date('2026-01-10').toISOString()
  },
  {
    id: 's2',
    nome: 'TechMed Sistemas de Diagnóstico e Imagem Corp',
    codigoMV: 'FORN-8840',
    oficinaMV: 'OF-MANUT_EQUIP',
    codigoServico: '14.01',
    cnpj: '98.765.432/0001-21',
    cprb: true, // Sim, optante CPRB (alíquota CPRB diferenciada, INSS calculado como 3.5%)
    inss: { incide: true, aliquota: 3.5, baseCalculoPadrao: TaxBaseOption.VALOR_NF }, // Alíquota especial CPRB
    irrf: { incide: true, aliquota: 1.5, baseCalculoPadrao: TaxBaseOption.VALOR_NF },
    csrf: { incide: true, aliquota: 4.65, baseCalculoPadrao: TaxBaseOption.VALOR_NF },
    iss: { incide: false, aliquota: 0, baseCalculoPadrao: TaxBaseOption.VALOR_NF },
    status: 'Ativo',
    dataCriacao: new Date('2026-01-12').toISOString()
  },
  {
    id: 's3',
    nome: 'SulSeg Segurança Eletrônica e Vigilância Eireli',
    codigoMV: 'FORN-1025',
    oficinaMV: 'OF-VIGILANCIA',
    codigoServico: '11.02',
    cnpj: '45.102.394/0001-55',
    cprb: false,
    inss: { incide: true, aliquota: 11, baseCalculoPadrao: TaxBaseOption.VALOR_NF },
    irrf: { incide: true, aliquota: 1.0, baseCalculoPadrao: TaxBaseOption.VALOR_NF },
    csrf: { incide: true, aliquota: 4.65, baseCalculoPadrao: TaxBaseOption.VALOR_NF },
    iss: { incide: true, aliquota: 3, baseCalculoPadrao: TaxBaseOption.VALOR_NF },
    status: 'Ativo',
    dataCriacao: new Date('2026-01-20').toISOString()
  },
  {
    id: 's4',
    nome: 'GlobalConsult Assessoria e Auditoria Contábil',
    codigoMV: 'FORN-1002',
    oficinaMV: 'OF-AUDITORIA',
    codigoServico: '17.01',
    cnpj: '00.123.456/0001-00',
    cprb: false,
    inss: { incide: false, aliquota: 0, baseCalculoPadrao: TaxBaseOption.VALOR_NF },
    irrf: { incide: true, aliquota: 1.5, baseCalculoPadrao: TaxBaseOption.VALOR_NF },
    csrf: { incide: true, aliquota: 4.65, baseCalculoPadrao: TaxBaseOption.VALOR_NF },
    iss: { incide: true, aliquota: 2, baseCalculoPadrao: TaxBaseOption.VALOR_NF },
    status: 'Ativo',
    dataCriacao: new Date('2026-02-15').toISOString()
  }
];

const DEFAULT_PROCESSES: AccountingProcess[] = [
  {
    id: 'p1',
    numeroSEI: '12345-12345678/2026-01',
    fornecedorId: 's1',
    notaFiscal: '0001402',
    contrato: 'CT-2025/089',
    competenciaServico: '2026-05',
    dataEmissao: '2026-05-20',
    dataAtesto: '2026-05-22',
    centroCustoId: '50103', // Serviço de Limpeza
    unidadeId: 'HMG-01', // Hospital Metropolitano
    valorNotaFiscal: 50000.00,
    deducoesINSS: 5000.00,
    baseCalculoCalculada: 45000.00,
    
    inssIncide: true,
    inssBase: 45000.00, // Valor da NF menos deduções
    inssAliquota: 11,
    inssValor: 4950.00,
    
    irrfIncide: true,
    irrfBase: 50000.00, // Valor da NF
    irrfAliquota: 1.5,
    irrfValor: 750.00,
    
    csrfIncide: true,
    csrfBase: 50000.00,
    csrfAliquota: 4.65,
    csrfValor: 2325.00,
    
    issIncide: true,
    issBase: 50000.00,
    issAliquota: 5,
    issValor: 2500.00,
    
    valorLiquido: 34475.00, // 45000 - 4950 - 750 - 2325 - 2500
    descricaoServicos: 'Prestação de serviços de higienização, desinfecção hospitalar e limpeza de áreas críticas, referente ao período de 01 a 31 de maio de 2026.',
    status: 'Processado',
    criadoPor: 'Mariana Silva (Operadora)',
    criadoPorId: 'u2',
    dataCriacao: new Date('2026-05-23T15:20:00Z').toISOString()
  },
  {
    id: 'p2',
    numeroSEI: '30200-98765432/2026-02',
    fornecedorId: 's2',
    notaFiscal: '02049',
    contrato: 'CT-2024/012',
    competenciaServico: '2026-05',
    dataEmissao: '2026-05-18',
    dataAtesto: '2026-05-20',
    centroCustoId: '30405', // Tecnologia da Informação
    unidadeId: 'UPA-LESTE',
    valorNotaFiscal: 15000.00,
    deducoesINSS: 0.00,
    baseCalculoCalculada: 15000.00,
    
    inssIncide: true,
    inssBase: 15000.00, // CPRB = SIM -> Alíquota 3.5%
    inssAliquota: 3.5,
    inssValor: 525.00,
    
    irrfIncide: true,
    irrfBase: 15000.00,
    irrfAliquota: 1.5,
    irrfValor: 225.00,
    
    csrfIncide: true,
    csrfBase: 15000.00,
    csrfAliquota: 4.65,
    csrfValor: 697.50,
    
    issIncide: false,
    issBase: 15000.00,
    issAliquota: 0,
    issValor: 0.00,
    
    valorLiquido: 13552.50, // 15000 - 525 - 225 - 697.50
    descricaoServicos: 'Manutenção preventiva e corretiva de equipamentos de diagnóstico por imagem e ultrassom, conforme contrato anual.',
    status: 'Processado',
    criadoPor: 'Carlos Souza (Administrador)',
    criadoPorId: 'u1',
    dataCriacao: new Date('2026-05-21T11:15:00Z').toISOString()
  },
  {
    id: 'p3',
    numeroSEI: '22110-44556677/2026-03',
    fornecedorId: 's3',
    notaFiscal: '10982',
    contrato: 'CT-2026/001',
    competenciaServico: '2026-06',
    dataEmissao: '2026-06-02',
    dataAtesto: '2026-06-05',
    centroCustoId: '20101', // Manutenção Predial
    unidadeId: 'HMG-01',
    valorNotaFiscal: 8500.00,
    deducoesINSS: 0.00,
    baseCalculoCalculada: 8500.00,
    
    inssIncide: true,
    inssBase: 8500.00,
    inssAliquota: 11,
    inssValor: 935.00,
    
    irrfIncide: true,
    irrfBase: 8500.00,
    irrfAliquota: 1.0,
    irrfValor: 85.00,
    
    csrfIncide: true,
    csrfBase: 8500.00,
    csrfAliquota: 4.65,
    csrfValor: 395.25,
    
    issIncide: true,
    issBase: 8500.00,
    issAliquota: 3,
    issValor: 255.00,
    
    valorLiquido: 6829.75,
    descricaoServicos: 'Monitoramento remoto de segurança e vigilância de portaria e recepção principal do Hospital Metropolitano.',
    status: 'Pendente',
    criadoPor: 'Mariana Silva (Operadora)',
    criadoPorId: 'u2',
    dataCriacao: new Date('2026-06-06T14:40:00Z').toISOString()
  }
];

const DEFAULT_LOGS: AuditLog[] = [
  {
    id: 'l1',
    usuarioId: 'u1',
    usuarioNome: 'Carlos Souza (Administrador)',
    usuarioLogin: 'admin',
    perfil: UserProfile.ADMINISTRADOR,
    dataHora: new Date('2026-05-20T08:00:00Z').toISOString(),
    operacao: 'Semente do Sistema',
    detalhes: 'Base de dados inicial configurada com parâmetros tributários padrão brasileiros.'
  }
];

export class DBService {
  private static get<T>(key: string, defaultVal: T): T {
    const val = localStorage.getItem(key);
    if (!val) {
      localStorage.setItem(key, JSON.stringify(defaultVal));
      return defaultVal;
    }
    try {
      return JSON.parse(val);
    } catch {
      return defaultVal;
    }
  }

  private static set<T>(key: string, data: T): void {
    localStorage.setItem(key, JSON.stringify(data));
  }

  // Inicializa a persistência local
  public static init(): void {
    if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
      this.set(STORAGE_KEYS.USERS, DEFAULT_USERS);
    }
    if (!localStorage.getItem(STORAGE_KEYS.SUPPLIERS)) {
      this.set(STORAGE_KEYS.SUPPLIERS, DEFAULT_SUPPLIERS);
    }
    if (!localStorage.getItem(STORAGE_KEYS.COST_CENTERS)) {
      this.set(STORAGE_KEYS.COST_CENTERS, DEFAULT_COST_CENTERS);
    }
    if (!localStorage.getItem(STORAGE_KEYS.UNITS)) {
      this.set(STORAGE_KEYS.UNITS, DEFAULT_UNITS);
    }
    if (!localStorage.getItem(STORAGE_KEYS.PROCESSES)) {
      this.set(STORAGE_KEYS.PROCESSES, DEFAULT_PROCESSES);
    }
    if (!localStorage.getItem(STORAGE_KEYS.DAILY_PROCESSES)) {
      this.set(STORAGE_KEYS.DAILY_PROCESSES, DEFAULT_DAILY_PROCESSES);
    }
    if (!localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS)) {
      this.set(STORAGE_KEYS.AUDIT_LOGS, DEFAULT_LOGS);
    }
    if (!localStorage.getItem(STORAGE_KEYS.CURRENT_USER)) {
      // Login padrão de demonstração de administrador
      this.set(STORAGE_KEYS.CURRENT_USER, DEFAULT_USERS[0]);
    }
  }

  // MULTIUSER & AUTH
  public static getUsers(): User[] {
    return this.get<User[]>(STORAGE_KEYS.USERS, DEFAULT_USERS);
  }

  public static saveUsers(users: User[]): void {
    this.set(STORAGE_KEYS.USERS, users);
  }

  public static getCurrentUser(): User | null {
    return this.get<User | null>(STORAGE_KEYS.CURRENT_USER, null);
  }

  public static setCurrentUser(user: User | null): void {
    if (user) {
      // Atualiza o último acesso
      const updatedUser = { ...user, ultimoAcesso: new Date().toISOString() };
      const allUsers = this.getUsers().map(u => u.id === user.id ? updatedUser : u);
      this.saveUsers(allUsers);
      this.set(STORAGE_KEYS.CURRENT_USER, updatedUser);
      this.addAuditLog('Login', `Início de sessão efetuado com sucesso por ${user.nome}.`, '', JSON.stringify(updatedUser));
    } else {
      const currentUser = this.getCurrentUser();
      if (currentUser) {
        this.addAuditLog('Logout', `Finalização de sessão para o usuário ${currentUser.nome}.`);
      }
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    }
  }

  public static addUser(user: Omit<User, 'id' | 'dataCriacao'>): User {
    const users = this.getUsers();
    const newUser: User = {
      ...user,
      id: 'u_' + Math.random().toString(36).substr(2, 9),
      dataCriacao: new Date().toISOString()
    };
    users.push(newUser);
    this.saveUsers(users);
    this.addAuditLog('Criação de Usuário', `Cadastrou o usuário ${newUser.nome} (${newUser.perfil}).`, '', JSON.stringify(newUser));
    return newUser;
  }

  public static updateUser(id: string, updatedFields: Partial<Omit<User, 'id' | 'dataCriacao'>>): User {
    const users = this.getUsers();
    const oldUser = users.find(u => u.id === id);
    const updatedUser = users.map(u => {
      if (u.id === id) {
        return { ...u, ...updatedFields } as User;
      }
      return u;
    });
    this.saveUsers(updatedUser);
    const result = updatedUser.find(u => u.id === id)!;
    this.addAuditLog(
      'Atualização de Usuário', 
      `Atualizou o usuário ${result.nome}.`, 
      JSON.stringify(oldUser), 
      JSON.stringify(result)
    );
    
    // Se for o usuário corrente, atualiza ele localmente também
    const curr = this.getCurrentUser();
    if (curr && curr.id === id) {
      this.set(STORAGE_KEYS.CURRENT_USER, result);
    }

    return result;
  }

  public static deleteUser(id: string): void {
    const users = this.getUsers();
    const keyUser = users.find(u => u.id === id);
    if (!keyUser) return;
    const filtered = users.filter(u => u.id !== id);
    this.saveUsers(filtered);
    this.addAuditLog('Remoção de Usuário', `Removeu definitivamente o usuário ${keyUser.nome} (${keyUser.perfil}).`, JSON.stringify(keyUser), '');
  }

  // SUPPPLIERS / FORNECEDORES
  public static getSuppliers(): Supplier[] {
    return this.get<Supplier[]>(STORAGE_KEYS.SUPPLIERS, DEFAULT_SUPPLIERS);
  }

  public static saveSuppliers(suppliers: Supplier[]): void {
    this.set(STORAGE_KEYS.SUPPLIERS, suppliers);
  }

  public static addSupplier(supplier: Omit<Supplier, 'id' | 'dataCriacao'>): Supplier {
    const suppliers = this.getSuppliers();
    const newSupplier: Supplier = {
      ...supplier,
      id: 's_' + Math.random().toString(36).substr(2, 9),
      dataCriacao: new Date().toISOString()
    };
    suppliers.push(newSupplier);
    this.saveSuppliers(suppliers);
    this.addAuditLog('Acréscimo de Fornecedor', `Cadastrou o fornecedor ${newSupplier.nome} (CNPJ: ${newSupplier.cnpj}).`, '', JSON.stringify(newSupplier));
    return newSupplier;
  }

  public static updateSupplier(id: string, updatedFields: Partial<Omit<Supplier, 'id' | 'dataCriacao'>>): Supplier {
    const suppliers = this.getSuppliers();
    const oldSupp = suppliers.find(s => s.id === id);
    const updated = suppliers.map(s => {
      if (s.id === id) {
        return { ...s, ...updatedFields } as Supplier;
      }
      return s;
    });
    this.saveSuppliers(updated);
    const result = updated.find(s => s.id === id)!;
    this.addAuditLog(
      'Atualização de Fornecedor', 
      `Atualizou parâmetros tributários do fornecedor ${result.nome}.`, 
      JSON.stringify(oldSupp), 
      JSON.stringify(result)
    );
    return result;
  }

  public static deleteSupplier(id: string): void {
    const suppliers = this.getSuppliers();
    const keySupplier = suppliers.find(s => s.id === id);
    if (!keySupplier) return;
    const filtered = suppliers.filter(s => s.id !== id);
    this.saveSuppliers(filtered);
    this.addAuditLog('Remoção de Fornecedor', `Removeu definitivamente o fornecedor ${keySupplier.nome}, CNPJ: ${keySupplier.cnpj}.`, JSON.stringify(keySupplier), '');
  }

  // COST CENTERS / CENTROS DE CUSTO
  public static getCostCenters(): CostCenter[] {
    return this.get<CostCenter[]>(STORAGE_KEYS.COST_CENTERS, DEFAULT_COST_CENTERS);
  }

  public static addCostCenter(cc: Omit<CostCenter, 'dataCriacao'>): CostCenter {
    const items = this.getCostCenters();
    const newCC: CostCenter = {
      ...cc,
      dataCriacao: new Date().toISOString()
    };
    items.push(newCC);
    this.set(STORAGE_KEYS.COST_CENTERS, items);
    this.addAuditLog('Criação de Centro de Custo', `Cadastrou o Centro de Custo código ${cc.id} - ${cc.descricao}.`, '', JSON.stringify(newCC));
    return newCC;
  }

  public static updateCostCenter(id: string, updated: Partial<Omit<CostCenter, 'id' | 'dataCriacao'>>): CostCenter {
    const items = this.getCostCenters();
    const old = items.find(i => i.id === id);
    const updatedItems = items.map(i => {
      if (i.id === id) {
        return { ...i, ...updated };
      }
      return i;
    });
    this.set(STORAGE_KEYS.COST_CENTERS, updatedItems);
    const result = updatedItems.find(i => i.id === id)!;
    this.addAuditLog('Alteração Centro de Custo', `Alterou o Centro de Custo ${id}.`, JSON.stringify(old), JSON.stringify(result));
    return result;
  }

  public static deleteCostCenter(id: string): void {
    const items = this.getCostCenters();
    const keyCC = items.find(i => i.id === id);
    if (!keyCC) return;
    const filtered = items.filter(i => i.id !== id);
    this.set(STORAGE_KEYS.COST_CENTERS, filtered);
    this.addAuditLog('Remoção de Centro de Custo', `Removeu o Centro de Custo código ${keyCC.id} - ${keyCC.descricao}.`, JSON.stringify(keyCC), '');
  }

  // UNITS / UNIDADES
  public static getUnits(): Unit[] {
    return this.get<Unit[]>(STORAGE_KEYS.UNITS, DEFAULT_UNITS);
  }

  public static addUnit(unit: Omit<Unit, 'dataCriacao'>): Unit {
    const items = this.getUnits();
    const newUnit: Unit = {
      ...unit,
      dataCriacao: new Date().toISOString()
    };
    items.push(newUnit);
    this.set(STORAGE_KEYS.UNITS, items);
    this.addAuditLog('Criação de Unidade MV', `Cadastrou a Unidade ${unit.id} - ${unit.nome}.`, '', JSON.stringify(newUnit));
    return newUnit;
  }

  public static updateUnit(id: string, updated: Partial<Omit<Unit, 'id' | 'dataCriacao'>>): Unit {
    const items = this.getUnits();
    const old = items.find(i => i.id === id);
    const updatedItems = items.map(i => {
      if (i.id === id) {
        return { ...i, ...updated };
      }
      return i;
    });
    this.set(STORAGE_KEYS.UNITS, updatedItems);
    const result = updatedItems.find(i => i.id === id)!;
    this.addAuditLog('Alteração de Unidade MV', `Alterou as configurações da Unidade ${id}.`, JSON.stringify(old), JSON.stringify(result));
    return result;
  }

  public static deleteUnit(id: string): void {
    const items = this.getUnits();
    const keyUnit = items.find(i => i.id === id);
    if (!keyUnit) return;
    const filtered = items.filter(i => i.id !== id);
    this.set(STORAGE_KEYS.UNITS, filtered);
    this.addAuditLog('Remoção de Unidade MV', `Removeu a Unidade ${keyUnit.id} - ${keyUnit.nome}.`, JSON.stringify(keyUnit), '');
  }

  // PROCESSES / PROCESSOS CONTÁBEIS
  public static getProcesses(): AccountingProcess[] {
    return this.get<AccountingProcess[]>(STORAGE_KEYS.PROCESSES, DEFAULT_PROCESSES);
  }

  public static saveProcesses(processes: AccountingProcess[]): void {
    this.set(STORAGE_KEYS.PROCESSES, processes);
  }

  public static addProcess(process: Omit<AccountingProcess, 'id' | 'dataCriacao' | 'criadoPor' | 'criadoPorId'>): AccountingProcess {
    const items = this.getProcesses();
    const current = this.getCurrentUser() || DEFAULT_USERS[0];
    
    const newProcess: AccountingProcess = {
      ...process,
      id: 'p_' + Math.random().toString(36).substr(2, 9),
      dataCriacao: new Date().toISOString(),
      criadoPor: current.nome,
      criadoPorId: current.id
    };
    
    items.push(newProcess);
    this.saveProcesses(items);
    this.addAuditLog('Lançamento de Processo', `Cadastrou o processo SEI ${newProcess.numeroSEI} de Nota Fiscal ${newProcess.notaFiscal} / Fornecedor ID ${newProcess.fornecedorId}. Valor Bruto: R$ ${newProcess.valorNotaFiscal.toFixed(2)}.`, '', JSON.stringify(newProcess));
    return newProcess;
  }

  public static updateProcess(id: string, updatedFields: Partial<Omit<AccountingProcess, 'id' | 'dataCriacao' | 'criadoPor' | 'criadoPorId'>>): AccountingProcess {
    const items = this.getProcesses();
    const old = items.find(i => i.id === id);
    
    const updated = items.map(i => {
      if (i.id === id) {
        return { 
          ...i, 
          ...updatedFields, 
          dataAlteracao: new Date().toISOString() 
        } as AccountingProcess;
      }
      return i;
    });
    
    this.saveProcesses(updated);
    const result = updated.find(i => i.id === id)!;
    this.addAuditLog('Alteração de Processo', `Alterou campos no processo SEI ${result.numeroSEI} (NF: ${result.notaFiscal}).`, JSON.stringify(old), JSON.stringify(result));
    return result;
  }

  public static deleteProcess(id: string): void {
    const items = this.getProcesses();
    const keyProcess = items.find(i => i.id === id);
    if (!keyProcess) return;
    const filtered = items.filter(i => i.id !== id);
    this.saveProcesses(filtered);
    this.addAuditLog('Remoção de Processo', `Removeu definitivamente o processo SEI ${keyProcess.numeroSEI}, Nota Fiscal: ${keyProcess.notaFiscal}.`, JSON.stringify(keyProcess), '');
  }

  // RECEPÇÃO DIÁRIA DE PROCESSOS
  public static getDailyProcesses(): DailyProcess[] {
    return this.get<DailyProcess[]>(STORAGE_KEYS.DAILY_PROCESSES, DEFAULT_DAILY_PROCESSES);
  }

  public static saveDailyProcesses(processes: DailyProcess[]): void {
    this.set(STORAGE_KEYS.DAILY_PROCESSES, processes);
  }

  public static addDailyProcess(process: Omit<DailyProcess, 'id' | 'dataCriacao' | 'criadoPorId'>): DailyProcess {
    const items = this.getDailyProcesses();
    const current = this.getCurrentUser() || DEFAULT_USERS[0];

    // Validação de duplicidade na recepção diária
    const isDuplicate = items.some(item => item.numeroSEI === process.numeroSEI);
    if (isDuplicate) {
      throw new Error(`Processo SEI ${process.numeroSEI} já está cadastrado nesta lista de recepção diária.`);
    }

    const newProcess: DailyProcess = {
      ...process,
      id: 'dp_' + Math.random().toString(36).substr(2, 9),
      dataCriacao: new Date().toISOString(),
      criadoPorId: current.id
    };

    items.push(newProcess);
    this.saveDailyProcesses(items);
    this.addAuditLog(
      'Recepção Diária de Processo',
      `Registrou entrada diária do processo SEI ${newProcess.numeroSEI}.`,
      '',
      JSON.stringify(newProcess)
    );
    return newProcess;
  }

  public static deleteDailyProcess(id: string): void {
    const items = this.getDailyProcesses();
    const keyProcess = items.find(i => i.id === id);
    if (!keyProcess) return;
    const filtered = items.filter(i => i.id !== id);
    this.saveDailyProcesses(filtered);
    this.addAuditLog(
      'Remoção de Recepção Diária',
      `Excluiu o registro de entrada diária do processo SEI ${keyProcess.numeroSEI}.`,
      JSON.stringify(keyProcess),
      ''
    );
  }

  // AUDIT LOGGING
  public static getAuditLogs(): AuditLog[] {
    return this.get<AuditLog[]>(STORAGE_KEYS.AUDIT_LOGS, DEFAULT_LOGS);
  }

  public static addAuditLog(operacao: string, detalhes: string, anterior: string = '', novo: string = ''): void {
    const logs = this.get<AuditLog[]>(STORAGE_KEYS.AUDIT_LOGS, DEFAULT_LOGS);
    const user = this.getCurrentUser() || {
      id: 'sistema',
      nome: 'Sistema / Seeding',
      login: 'sistema',
      perfil: UserProfile.ADMINISTRADOR
    };

    const newLog: AuditLog = {
      id: 'log_' + Math.random().toString(36).substr(2, 9),
      usuarioId: user.id || 'sistema',
      usuarioNome: user.nome,
      usuarioLogin: user.login || 'sistema',
      perfil: user.perfil || UserProfile.ADMINISTRADOR,
      dataHora: new Date().toISOString(),
      operacao,
      detalhes,
      valoresAnteriores: anterior || undefined,
      valoresNovos: novo || undefined
    };

    logs.unshift(newLog); // Últimos logs aparecem primeiro
    
    // Limita para os últimos 2000 logs no localStorage para evitar overflow de quota
    if (logs.length > 2000) {
      logs.splice(2000);
    }
    this.set(STORAGE_KEYS.AUDIT_LOGS, logs);
  }

  // THEME CONTROL
  public static getTheme(): 'light' | 'dark' {
    return localStorage.getItem(STORAGE_KEYS.THEME) === 'dark' ? 'dark' : 'light';
  }

  public static toggleTheme(): 'light' | 'dark' {
    const current = this.getTheme();
    const newTheme = current === 'dark' ? 'light' : 'dark';
    localStorage.setItem(STORAGE_KEYS.THEME, newTheme);
    return newTheme;
  }

  // SYSTEM BACKUP & RESTORE
  public static exportBackup(): string {
    const backupData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      exportedBy: this.getCurrentUser()?.nome || 'Sistema',
      data: {
        users: this.getUsers(),
        suppliers: this.getSuppliers(),
        costCenters: this.getCostCenters(),
        units: this.getUnits(),
        processes: this.getProcesses(),
        auditLogs: this.getAuditLogs()
      }
    };
    return JSON.stringify(backupData, null, 2);
  }

  public static importBackup(backupString: string, mode: 'merge' | 'overwrite'): { success: boolean; stats?: { users: number; suppliers: number; costCenters: number; units: number; processes: number; auditLogs: number }; error?: string } {
    try {
      const backup = JSON.parse(backupString);
      if (!backup || typeof backup !== 'object' || !backup.data) {
        return { success: false, error: 'Arquivo de backup inválido ou corrompido.' };
      }
      
      const { data } = backup;
      
      const importedUsers: User[] = Array.isArray(data.users) ? data.users : [];
      const importedSuppliers: Supplier[] = Array.isArray(data.suppliers) ? data.suppliers : [];
      const importedCostCenters: CostCenter[] = Array.isArray(data.costCenters) ? data.costCenters : [];
      const importedUnits: Unit[] = Array.isArray(data.units) ? data.units : [];
      const importedProcesses: AccountingProcess[] = Array.isArray(data.processes) ? data.processes : [];
      const importedAuditLogs: AuditLog[] = Array.isArray(data.auditLogs) ? data.auditLogs : [];

      if (
        importedUsers.length === 0 &&
        importedSuppliers.length === 0 &&
        importedCostCenters.length === 0 &&
        importedUnits.length === 0 &&
        importedProcesses.length === 0
      ) {
        return { success: false, error: 'O backup não contém nenhum registro válido para restauração.' };
      }

      const currentUser = this.getCurrentUser();

      if (mode === 'overwrite') {
        // Complete overwrite: replace all storage keys with the imported values
        this.set(STORAGE_KEYS.USERS, importedUsers);
        this.set(STORAGE_KEYS.SUPPLIERS, importedSuppliers);
        this.set(STORAGE_KEYS.COST_CENTERS, importedCostCenters);
        this.set(STORAGE_KEYS.UNITS, importedUnits);
        this.set(STORAGE_KEYS.PROCESSES, importedProcesses);
        this.set(STORAGE_KEYS.AUDIT_LOGS, importedAuditLogs);
        
        // Preserve current user session if still present, otherwise update to the first imported user
        const currentSessionUser = currentUser;
        if (currentSessionUser) {
          const userStillExists = importedUsers.find(u => u.login === currentSessionUser.login || u.id === currentSessionUser.id);
          if (userStillExists) {
            this.set(STORAGE_KEYS.CURRENT_USER, userStillExists);
          } else if (importedUsers.length > 0) {
            this.set(STORAGE_KEYS.CURRENT_USER, importedUsers[0]);
          }
        }
        
        this.addAuditLog(
          'Restauração de Backup (Sobrescrever)', 
          `O banco de dados foi completamente reiniciado e sobrescrito através de um arquivo de backup por ${currentUser?.nome || 'Analista'}.`
        );

        return {
          success: true,
          stats: {
            users: importedUsers.length,
            suppliers: importedSuppliers.length,
            costCenters: importedCostCenters.length,
            units: importedUnits.length,
            processes: importedProcesses.length,
            auditLogs: importedAuditLogs.length
          }
        };
      } else {
        const curUsers = this.getUsers();
        let addedUsers = 0;
        importedUsers.forEach(u => {
          if (!curUsers.some(x => x.id === u.id || x.login === u.login)) {
            curUsers.push(u);
            addedUsers++;
          }
        });
        this.set(STORAGE_KEYS.USERS, curUsers);

        const curSuppliers = this.getSuppliers();
        let addedSuppliers = 0;
        importedSuppliers.forEach(s => {
          if (!curSuppliers.some(x => x.id === s.id || x.cnpj === s.cnpj)) {
            curSuppliers.push(s);
            addedSuppliers++;
          }
        });
        this.set(STORAGE_KEYS.SUPPLIERS, curSuppliers);

        const curCostCenters = this.getCostCenters();
        let addedCostCenters = 0;
        importedCostCenters.forEach(cc => {
          if (!curCostCenters.some(x => x.id === cc.id)) {
            curCostCenters.push(cc);
            addedCostCenters++;
          }
        });
        this.set(STORAGE_KEYS.COST_CENTERS, curCostCenters);

        const curUnits = this.getUnits();
        let addedUnits = 0;
        importedUnits.forEach(un => {
          if (!curUnits.some(x => x.id === un.id)) {
            curUnits.push(un);
            addedUnits++;
          }
        });
        this.set(STORAGE_KEYS.UNITS, curUnits);

        const curProcesses = this.getProcesses();
        let addedProcesses = 0;
        importedProcesses.forEach(p => {
          if (!curProcesses.some(x => x.id === p.id || (x.numeroSEI === p.numeroSEI && x.notaFiscal === p.notaFiscal))) {
            curProcesses.push(p);
            addedProcesses++;
          }
        });
        this.set(STORAGE_KEYS.PROCESSES, curProcesses);

        const curAuditLogs = this.getAuditLogs();
        let addedAuditLogs = 0;
        importedAuditLogs.forEach(al => {
          if (!curAuditLogs.some(x => x.id === al.id)) {
            curAuditLogs.push(al);
            addedAuditLogs++;
          }
        });
        curAuditLogs.sort((a, b) => new Date(b.dataHora).getTime() - new Date(a.dataHora).getTime());
        if (curAuditLogs.length > 2000) {
          curAuditLogs.splice(2000);
        }
        this.set(STORAGE_KEYS.AUDIT_LOGS, curAuditLogs);

        this.addAuditLog(
          'Restauração de Backup (Mesclar)', 
          `Mesclagem de backup realizada por ${currentUser?.nome || 'Analista'}. Registros adicionados - Usuários: ${addedUsers}, Fornecedores: ${addedSuppliers}, Centros de Custo: ${addedCostCenters}, Unidades: ${addedUnits}, Processos: ${addedProcesses}.`
        );

        return {
          success: true,
          stats: {
            users: addedUsers,
            suppliers: addedSuppliers,
            costCenters: addedCostCenters,
            units: addedUnits,
            processes: addedProcesses,
            auditLogs: addedAuditLogs
          }
        };
      }
    } catch (e: any) {
      return { success: false, error: `Erro ao processar JSON: ${e.message || e}` };
    }
  }

  public static resetDatabaseToDefault(): void {
    const currentUser = this.getCurrentUser();
    localStorage.removeItem(STORAGE_KEYS.USERS);
    localStorage.removeItem(STORAGE_KEYS.SUPPLIERS);
    localStorage.removeItem(STORAGE_KEYS.COST_CENTERS);
    localStorage.removeItem(STORAGE_KEYS.UNITS);
    localStorage.removeItem(STORAGE_KEYS.PROCESSES);
    localStorage.removeItem(STORAGE_KEYS.AUDIT_LOGS);
    
    this.init();
    
    this.addAuditLog(
      'Reset do Banco de Dados', 
      `O banco de dados foi completamente apagado e redefinido para a base semente padrão por ${currentUser?.nome || 'Administrador'}.`
    );
  }
}
