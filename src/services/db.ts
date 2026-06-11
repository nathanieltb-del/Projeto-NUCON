/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  User, UserProfile, Supplier, CostCenter, Unit, 
  AccountingProcess, AuditLog, TaxBaseOption, DailyProcess 
} from '../types';
import { db, auth } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { 
  collection, doc, setDoc, deleteDoc, onSnapshot 
} from 'firebase/firestore';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Recursively removes undefined fields from an object so Firestore doesn't throw a serialization error
function removeUndefinedFields<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) {
    return obj.map(removeUndefinedFields) as unknown as T;
  }
  if (typeof obj === 'object') {
    const clean: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        if (obj[key] !== undefined) {
          clean[key] = removeUndefinedFields(obj[key]);
        }
      }
    }
    return clean as T;
  }
  return obj;
}

// Chaves para o LocalStorage de cache
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

const DEFAULT_USERS: User[] = [
  {
    id: 'u1',
    nome: 'Carlos Souza (Administrador)',
    email: 'carlos.souza@empresa.com',
    login: 'admin',
    senhaCriptografada: 'admin123',
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
    cprb: false,
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
    cprb: true,
    inss: { incide: true, aliquota: 3.5, baseCalculoPadrao: TaxBaseOption.VALOR_NF },
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
    centroCustoId: '50103',
    unidadeId: 'HMG-01',
    valorNotaFiscal: 50000.00,
    deducoesINSS: 5000.00,
    baseCalculoCalculada: 45000.00,
    
    inssIncide: true,
    inssBase: 45000.00,
    inssAliquota: 11,
    inssValor: 4950.00,
    
    irrfIncide: true,
    irrfBase: 50000.00,
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
    
    valorLiquido: 34475.00,
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
    centroCustoId: '30405',
    unidadeId: 'UPA-LESTE',
    valorNotaFiscal: 15000.00,
    deducoesINSS: 0.00,
    baseCalculoCalculada: 15000.00,
    
    inssIncide: true,
    inssBase: 15000.00,
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
    
    valorLiquido: 13552.50,
    descricaoServicos: 'Manutenção preventiva e corretiva de equipamentos de diagnóstico por imagem e ultrassom, conforme contrato anual.',
    status: 'Processado',
    criadoPor: 'Carlos Souza (Administrador)',
    criadoPorId: 'u1',
    dataCriacao: new Date('2026-05-21T11:15:00Z').toISOString()
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
    detalhes: 'Base de dados inicial configurada e sincronizada na nuvem com parâmetros tributários.'
  }
];

type Listener = () => void;

export class DBService {
  private static listeners = new Set<Listener>();
  private static isSynced = false;

  // Registra um componente para receber notificações de atualizações
  public static subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public static notifyListeners(): void {
    this.listeners.forEach(l => {
      try {
        l();
      } catch (e) {
        console.error('Error triggering database listener:', e);
      }
    });
  }

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

  // Sincronizador genérico de coleções com o Firestore
  private static syncCollection<T>(
    colName: string,
    storageKey: string,
    defaultData: T[]
  ): void {
    onSnapshot(
      collection(db, colName),
      (snapshot) => {
        if (snapshot.empty) {
          // Se o banco na nuvem estiver vazio, semeia os dados iniciais
          defaultData.forEach((item: any) => {
            setDoc(doc(db, colName, item.id), item).catch((err) => {
              console.error(`Erro ao semear ${colName}:`, err);
            });
          });
        } else {
          // Extrai e armazena na memória local caches
          const list: T[] = [];
          snapshot.forEach((d) => {
            list.push(d.data() as T);
          });
          localStorage.setItem(storageKey, JSON.stringify(list));
          this.notifyListeners();
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, colName);
      }
    );
  }

  // Inicializa e subscreve os canais de Sincronização em Tempo Real
  public static init(): void {
    // Garante login inicial no localStorage do cliente se vazio
    if (!localStorage.getItem(STORAGE_KEYS.CURRENT_USER)) {
      this.set(STORAGE_KEYS.CURRENT_USER, DEFAULT_USERS[0]);
    }

    onAuthStateChanged(auth, (user) => {
      if (user && !this.isSynced) {
        this.isSynced = true;
        // Inscreve ouvintes de snapshots em tempo real do Firestore para cada módulo
        this.syncCollection<User>('users', STORAGE_KEYS.USERS, DEFAULT_USERS);
        this.syncCollection<Supplier>('suppliers', STORAGE_KEYS.SUPPLIERS, DEFAULT_SUPPLIERS);
        this.syncCollection<CostCenter>('cost_centers', STORAGE_KEYS.COST_CENTERS, DEFAULT_COST_CENTERS);
        this.syncCollection<Unit>('units', STORAGE_KEYS.UNITS, DEFAULT_UNITS);
        this.syncCollection<AccountingProcess>('processes', STORAGE_KEYS.PROCESSES, DEFAULT_PROCESSES);
        this.syncCollection<DailyProcess>('daily_processes', STORAGE_KEYS.DAILY_PROCESSES, DEFAULT_DAILY_PROCESSES);
        this.syncCollection<AuditLog>('audit_logs', STORAGE_KEYS.AUDIT_LOGS, DEFAULT_LOGS);
      }
    });
  }

  // MULTIUSER & AUTH
  public static getUsers(): User[] {
    return this.get<User[]>(STORAGE_KEYS.USERS, DEFAULT_USERS);
  }

  public static saveUsers(users: User[]): void {
    this.set(STORAGE_KEYS.USERS, users);
    // Persiste também no Firestore individualmente
    users.forEach(u => {
      setDoc(doc(db, 'users', u.id), u)
        .catch(err => handleFirestoreError(err, OperationType.WRITE, `users/${u.id}`));
    });
  }

  public static getCurrentUser(): User | null {
    return this.get<User | null>(STORAGE_KEYS.CURRENT_USER, null);
  }

  public static setCurrentUser(user: User | null): void {
    if (user) {
      const updatedUser = { ...user, ultimoAcesso: new Date().toISOString() };
      
      // Atualiza no cache e no Firestore
      const allUsers = this.getUsers().map(u => u.id === user.id ? updatedUser : u);
      this.set(STORAGE_KEYS.USERS, allUsers);
      this.set(STORAGE_KEYS.CURRENT_USER, updatedUser);

      setDoc(doc(db, 'users', user.id), updatedUser)
        .then(() => {
          this.addAuditLog('Login', `Início de sessão efetuado com sucesso por ${user.nome}.`, '', JSON.stringify(updatedUser));
        })
        .catch(err => handleFirestoreError(err, OperationType.WRITE, `users/${user.id}`));
    } else {
      const currentUser = this.getCurrentUser();
      if (currentUser) {
        this.addAuditLog('Logout', `Finalização de sessão para o usuário ${currentUser.nome}.`);
      }
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    }
  }

  public static addUser(user: Omit<User, 'id' | 'dataCriacao'>): User {
    const newUser: User = {
      ...user,
      id: 'u_' + Math.random().toString(36).substr(2, 9),
      dataCriacao: new Date().toISOString()
    };

    setDoc(doc(db, 'users', newUser.id), newUser)
      .then(() => {
        this.addAuditLog('Criação de Usuário', `Cadastrou o usuário ${newUser.nome} (${newUser.perfil}).`, '', JSON.stringify(newUser));
      })
      .catch(err => handleFirestoreError(err, OperationType.CREATE, `users/${newUser.id}`));

    return newUser;
  }

  public static updateUser(id: string, updatedFields: Partial<Omit<User, 'id' | 'dataCriacao'>>): User {
    const users = this.getUsers();
    const oldUser = users.find(u => u.id === id);
    const updatedUser = { ...oldUser, ...updatedFields, id } as User;

    setDoc(doc(db, 'users', id), updatedUser)
      .then(() => {
        this.addAuditLog(
          'Atualização de Usuário', 
          `Atualizou o usuário ${updatedUser.nome}.`, 
          JSON.stringify(oldUser), 
          JSON.stringify(updatedUser)
        );
      })
      .catch(err => handleFirestoreError(err, OperationType.UPDATE, `users/${id}`));
    
    const curr = this.getCurrentUser();
    if (curr && curr.id === id) {
      this.set(STORAGE_KEYS.CURRENT_USER, updatedUser);
    }

    return updatedUser;
  }

  public static deleteUser(id: string): void {
    const users = this.getUsers();
    const keyUser = users.find(u => u.id === id);
    if (!keyUser) return;

    deleteDoc(doc(db, 'users', id))
      .then(() => {
        this.addAuditLog('Remoção de Usuário', `Removeu definitivamente o usuário ${keyUser.nome} (${keyUser.perfil}).`, JSON.stringify(keyUser), '');
      })
      .catch(err => handleFirestoreError(err, OperationType.DELETE, `users/${id}`));
  }

  // SUPPPLIERS / FORNECEDORES
  public static getSuppliers(): Supplier[] {
    return this.get<Supplier[]>(STORAGE_KEYS.SUPPLIERS, DEFAULT_SUPPLIERS);
  }

  public static saveSuppliers(suppliers: Supplier[]): void {
    this.set(STORAGE_KEYS.SUPPLIERS, suppliers);
    suppliers.forEach(s => {
      setDoc(doc(db, 'suppliers', s.id), s)
        .catch(err => handleFirestoreError(err, OperationType.WRITE, `suppliers/${s.id}`));
    });
  }

  public static addSupplier(supplier: Omit<Supplier, 'id' | 'dataCriacao'>): Supplier {
    const newSupplier: Supplier = {
      ...supplier,
      id: 's_' + Math.random().toString(36).substr(2, 9),
      dataCriacao: new Date().toISOString()
    };

    setDoc(doc(db, 'suppliers', newSupplier.id), newSupplier)
      .then(() => {
        this.addAuditLog('Acréscimo de Fornecedor', `Cadastrou o fornecedor ${newSupplier.nome} (CNPJ: ${newSupplier.cnpj}).`, '', JSON.stringify(newSupplier));
      })
      .catch(err => handleFirestoreError(err, OperationType.CREATE, `suppliers/${newSupplier.id}`));

    return newSupplier;
  }

  public static updateSupplier(id: string, updatedFields: Partial<Omit<Supplier, 'id' | 'dataCriacao'>>): Supplier {
    const suppliers = this.getSuppliers();
    const oldSupp = suppliers.find(s => s.id === id);
    const result = { ...oldSupp, ...updatedFields, id } as Supplier;

    setDoc(doc(db, 'suppliers', id), result)
      .then(() => {
        this.addAuditLog(
          'Atualização de Fornecedor', 
          `Atualizou parâmetros tributários do fornecedor ${result.nome}.`, 
          JSON.stringify(oldSupp), 
          JSON.stringify(result)
        );
      })
      .catch(err => handleFirestoreError(err, OperationType.UPDATE, `suppliers/${id}`));

    return result;
  }

  public static deleteSupplier(id: string): void {
    const suppliers = this.getSuppliers();
    const keySupplier = suppliers.find(s => s.id === id);
    if (!keySupplier) return;

    deleteDoc(doc(db, 'suppliers', id))
      .then(() => {
        this.addAuditLog('Remoção de Fornecedor', `Removeu definitivamente o fornecedor ${keySupplier.nome}, CNPJ: ${keySupplier.cnpj}.`, JSON.stringify(keySupplier), '');
      })
      .catch(err => handleFirestoreError(err, OperationType.DELETE, `suppliers/${id}`));
  }

  // COST CENTERS / CENTROS DE CUSTO
  public static getCostCenters(): CostCenter[] {
    return this.get<CostCenter[]>(STORAGE_KEYS.COST_CENTERS, DEFAULT_COST_CENTERS);
  }

  public static addCostCenter(cc: Omit<CostCenter, 'dataCriacao'>): CostCenter {
    const newCC: CostCenter = {
      ...cc,
      dataCriacao: new Date().toISOString()
    };

    setDoc(doc(db, 'cost_centers', newCC.id), newCC)
      .then(() => {
        this.addAuditLog('Criação de Centro de Custo', `Cadastrou o Centro de Custo código ${cc.id} - ${cc.descricao}.`, '', JSON.stringify(newCC));
      })
      .catch(err => handleFirestoreError(err, OperationType.CREATE, `cost_centers/${newCC.id}`));

    return newCC;
  }

  public static updateCostCenter(id: string, updated: Partial<Omit<CostCenter, 'id' | 'dataCriacao'>>): CostCenter {
    const items = this.getCostCenters();
    const old = items.find(i => i.id === id);
    const result = { ...old, ...updated, id } as CostCenter;

    setDoc(doc(db, 'cost_centers', id), result)
      .then(() => {
        this.addAuditLog('Alteração Centro de Custo', `Alterou o Centro de Custo ${id}.`, JSON.stringify(old), JSON.stringify(result));
      })
      .catch(err => handleFirestoreError(err, OperationType.UPDATE, `cost_centers/${id}`));

    return result;
  }

  public static deleteCostCenter(id: string): void {
    const items = this.getCostCenters();
    const keyCC = items.find(i => i.id === id);
    if (!keyCC) return;

    deleteDoc(doc(db, 'cost_centers', id))
      .then(() => {
        this.addAuditLog('Remoção de Centro de Custo', `Removeu o Centro de Custo código ${keyCC.id} - ${keyCC.descricao}.`, JSON.stringify(keyCC), '');
      })
      .catch(err => handleFirestoreError(err, OperationType.DELETE, `cost_centers/${id}`));
  }

  // UNITS / UNIDADES
  public static getUnits(): Unit[] {
    return this.get<Unit[]>(STORAGE_KEYS.UNITS, DEFAULT_UNITS);
  }

  public static addUnit(unit: Omit<Unit, 'dataCriacao'>): Unit {
    const newUnit: Unit = {
      ...unit,
      dataCriacao: new Date().toISOString()
    };

    setDoc(doc(db, 'units', newUnit.id), newUnit)
      .then(() => {
        this.addAuditLog('Criação de Unidade MV', `Cadastrou a Unidade ${unit.id} - ${unit.nome}.`, '', JSON.stringify(newUnit));
      })
      .catch(err => handleFirestoreError(err, OperationType.CREATE, `units/${newUnit.id}`));

    return newUnit;
  }

  public static updateUnit(id: string, updated: Partial<Omit<Unit, 'id' | 'dataCriacao'>>): Unit {
    const items = this.getUnits();
    const old = items.find(i => i.id === id);
    const result = { ...old, ...updated, id } as Unit;

    setDoc(doc(db, 'units', id), result)
      .then(() => {
        this.addAuditLog('Alteração de Unidade MV', `Alterou as configurações da Unidade ${id}.`, JSON.stringify(old), JSON.stringify(result));
      })
      .catch(err => handleFirestoreError(err, OperationType.UPDATE, `units/${id}`));

    return result;
  }

  public static deleteUnit(id: string): void {
    const items = this.getUnits();
    const keyUnit = items.find(i => i.id === id);
    if (!keyUnit) return;

    deleteDoc(doc(db, 'units', id))
      .then(() => {
        this.addAuditLog('Remoção de Unidade MV', `Removeu a Unidade ${keyUnit.id} - ${keyUnit.nome}.`, JSON.stringify(keyUnit), '');
      })
      .catch(err => handleFirestoreError(err, OperationType.DELETE, `units/${id}`));
  }

  // PROCESSES / PROCESSOS CONTÁBEIS
  public static getProcesses(): AccountingProcess[] {
    return this.get<AccountingProcess[]>(STORAGE_KEYS.PROCESSES, DEFAULT_PROCESSES);
  }

  public static saveProcesses(processes: AccountingProcess[]): void {
    this.set(STORAGE_KEYS.PROCESSES, processes);
    processes.forEach(p => {
      setDoc(doc(db, 'processes', p.id), p)
        .catch(err => handleFirestoreError(err, OperationType.WRITE, `processes/${p.id}`));
    });
  }

  public static addProcess(process: Omit<AccountingProcess, 'id' | 'dataCriacao' | 'criadoPor' | 'criadoPorId'>): AccountingProcess {
    const current = this.getCurrentUser() || DEFAULT_USERS[0];
    
    const newProcess: AccountingProcess = {
      ...process,
      id: 'p_' + Math.random().toString(36).substr(2, 9),
      dataCriacao: new Date().toISOString(),
      criadoPor: current.nome,
      criadoPorId: current.id
    };
    
    setDoc(doc(db, 'processes', newProcess.id), newProcess)
      .then(() => {
        this.addAuditLog('Lançamento de Processo', `Cadastrou o processo SEI ${newProcess.numeroSEI} de Nota Fiscal ${newProcess.notaFiscal} / Fornecedor ID ${newProcess.fornecedorId}. Valor Bruto: R$ ${newProcess.valorNotaFiscal.toFixed(2)}.`, '', JSON.stringify(newProcess));
      })
      .catch(err => handleFirestoreError(err, OperationType.CREATE, `processes/${newProcess.id}`));

    return newProcess;
  }

  public static updateProcess(id: string, updatedFields: Partial<Omit<AccountingProcess, 'id' | 'dataCriacao' | 'criadoPor' | 'criadoPorId'>>): AccountingProcess {
    const items = this.getProcesses();
    const old = items.find(i => i.id === id);
    const result = { 
      ...old, 
      ...updatedFields, 
      id,
      dataAlteracao: new Date().toISOString() 
    } as AccountingProcess;
    
    setDoc(doc(db, 'processes', id), result)
      .then(() => {
        this.addAuditLog('Alteração de Processo', `Alterou campos no processo SEI ${result.numeroSEI} (NF: ${result.notaFiscal}).`, JSON.stringify(old), JSON.stringify(result));
      })
      .catch(err => handleFirestoreError(err, OperationType.UPDATE, `processes/${id}`));

    return result;
  }

  public static deleteProcess(id: string): void {
    const items = this.getProcesses();
    const keyProcess = items.find(i => i.id === id);
    if (!keyProcess) return;

    deleteDoc(doc(db, 'processes', id))
      .then(() => {
        this.addAuditLog('Remoção de Processo', `Removeu definitivamente o processo SEI ${keyProcess.numeroSEI}, Nota Fiscal: ${keyProcess.notaFiscal}.`, JSON.stringify(keyProcess), '');
      })
      .catch(err => handleFirestoreError(err, OperationType.DELETE, `processes/${id}`));
  }

  // RECEPÇÃO DIÁRIA DE PROCESSOS
  public static getDailyProcesses(): DailyProcess[] {
    return this.get<DailyProcess[]>(STORAGE_KEYS.DAILY_PROCESSES, DEFAULT_DAILY_PROCESSES);
  }

  public static saveDailyProcesses(processes: DailyProcess[]): void {
    this.set(STORAGE_KEYS.DAILY_PROCESSES, processes);
    processes.forEach(dp => {
      setDoc(doc(db, 'daily_processes', dp.id), dp)
        .catch(err => handleFirestoreError(err, OperationType.WRITE, `daily_processes/${dp.id}`));
    });
  }

  public static addDailyProcess(process: Omit<DailyProcess, 'id' | 'dataCriacao' | 'criadoPorId'>): DailyProcess {
    const items = this.getDailyProcesses();
    const current = this.getCurrentUser() || DEFAULT_USERS[0];

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

    setDoc(doc(db, 'daily_processes', newProcess.id), newProcess)
      .then(() => {
        this.addAuditLog(
          'Recepção Diária de Processo',
          `Registrou entrada diária do processo SEI ${newProcess.numeroSEI}.`,
          '',
          JSON.stringify(newProcess)
        );
      })
      .catch(err => handleFirestoreError(err, OperationType.CREATE, `daily_processes/${newProcess.id}`));

    return newProcess;
  }

  public static deleteDailyProcess(id: string): void {
    const items = this.getDailyProcesses();
    const keyProcess = items.find(i => i.id === id);
    if (!keyProcess) return;

    deleteDoc(doc(db, 'daily_processes', id))
      .then(() => {
        this.addAuditLog(
          'Remoção de Recepção Diária',
          `Excluiu o registro de entrada diária do processo SEI ${keyProcess.numeroSEI}.`,
          JSON.stringify(keyProcess),
          ''
        );
      })
      .catch(err => handleFirestoreError(err, OperationType.DELETE, `daily_processes/${id}`));
  }

  // AUDIT LOGGING
  public static getAuditLogs(): AuditLog[] {
    return this.get<AuditLog[]>(STORAGE_KEYS.AUDIT_LOGS, DEFAULT_LOGS);
  }

  public static addAuditLog(operacao: string, detalhes: string, anterior: string = '', novo: string = ''): void {
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

    setDoc(doc(db, 'audit_logs', newLog.id), removeUndefinedFields(newLog))
      .catch(err => handleFirestoreError(err, OperationType.WRITE, `audit_logs/${newLog.id}`));
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

  // SYSTEM BACKUP & RESTORE (integrado com Firestore)
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
        // Envia todos os dados importados substituindo individualmente no Firestore
        importedUsers.forEach(u => setDoc(doc(db, 'users', u.id), u));
        importedSuppliers.forEach(s => setDoc(doc(db, 'suppliers', s.id), s));
        importedCostCenters.forEach(cc => setDoc(doc(db, 'cost_centers', cc.id), cc));
        importedUnits.forEach(un => setDoc(doc(db, 'units', un.id), un));
        importedProcesses.forEach(p => setDoc(doc(db, 'processes', p.id), p));
        importedAuditLogs.forEach(al => setDoc(doc(db, 'audit_logs', al.id), al));

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
            setDoc(doc(db, 'users', u.id), u);
            addedUsers++;
          }
        });

        const curSuppliers = this.getSuppliers();
        let addedSuppliers = 0;
        importedSuppliers.forEach(s => {
          if (!curSuppliers.some(x => x.id === s.id || x.cnpj === s.cnpj)) {
            setDoc(doc(db, 'suppliers', s.id), s);
            addedSuppliers++;
          }
        });

        const curCostCenters = this.getCostCenters();
        let addedCostCenters = 0;
        importedCostCenters.forEach(cc => {
          if (!curCostCenters.some(x => x.id === cc.id)) {
            setDoc(doc(db, 'cost_centers', cc.id), cc);
            addedCostCenters++;
          }
        });

        const curUnits = this.getUnits();
        let addedUnits = 0;
        importedUnits.forEach(un => {
          if (!curUnits.some(x => x.id === un.id)) {
            setDoc(doc(db, 'units', un.id), un);
            addedUnits++;
          }
        });

        const curProcesses = this.getProcesses();
        let addedProcesses = 0;
        importedProcesses.forEach(p => {
          if (!curProcesses.some(x => x.id === p.id || (x.numeroSEI === p.numeroSEI && x.notaFiscal === p.notaFiscal))) {
            setDoc(doc(db, 'processes', p.id), p);
            addedProcesses++;
          }
        });

        const curAuditLogs = this.getAuditLogs();
        let addedAuditLogs = 0;
        importedAuditLogs.forEach(al => {
          if (!curAuditLogs.some(x => x.id === al.id)) {
            setDoc(doc(db, 'audit_logs', al.id), al);
            addedAuditLogs++;
          }
        });

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
    
    // Deleta os documentos das coleções principais no Firestore
    this.getUsers().forEach(u => deleteDoc(doc(db, 'users', u.id)));
    this.getSuppliers().forEach(s => deleteDoc(doc(db, 'suppliers', s.id)));
    this.getCostCenters().forEach(cc => deleteDoc(doc(db, 'cost_centers', cc.id)));
    this.getUnits().forEach(un => deleteDoc(doc(db, 'units', un.id)));
    this.getProcesses().forEach(p => deleteDoc(doc(db, 'processes', p.id)));
    this.getDailyProcesses().forEach(dp => deleteDoc(doc(db, 'daily_processes', dp.id)));
    this.getAuditLogs().forEach(al => deleteDoc(doc(db, 'audit_logs', al.id)));

    this.addAuditLog(
      'Reset do Banco de Dados', 
      `O banco de dados foi completamente apagado e redefinido para a base semente padrão por ${currentUser?.nome || 'Administrador'}.`
    );
  }
}
