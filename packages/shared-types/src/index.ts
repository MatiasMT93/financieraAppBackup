import type { Role, OperationStatus, OperationType, Currency, CadeteStatus, DeliveryMode } from '@cambioapp/shared-constants';

export type { Role, OperationStatus, OperationType, Currency, CadeteStatus, DeliveryMode };

export interface User {
  id: string;
  usuario: string;
  nombre: string;
  apellido?: string | null;
  celular?: string | null;
  role: Role;
  cadeteStatus?: CadeteStatus | null;
  isActive: boolean;
  pendingApproval?: boolean;
  createdAt: string;
}

export interface Operation {
  id: string;
  tipo: OperationType;
  moneda: Currency;
  monto: number;
  /** Solo presente cuando tipo === 'entrega_retiro': moneda del monto a retirar. */
  moneda2: Currency | null;
  /** Solo presente cuando tipo === 'entrega_retiro': monto a retirar (el campo `monto` de arriba pasa a representar el monto a entregar). */
  monto2: number | null;
  /** Nula solo en modalidad 'ventanilla' (el cliente viene a la oficina). */
  direccion: string | null;
  contacto: string;
  telefono: string | null;
  notas: string | null;
  modalidad: DeliveryMode;
  /** Solo presente cuando modalidad === 'deposito': banco de destino. */
  banco: string | null;
  clientId: string | null;
  status: OperationStatus;
  administrativoId: string;
  cadeteId: string | null;
  coordinadorId: string | null;
  createdAt: string;
  updatedAt: string;
  administrativo?: Pick<User, 'id' | 'nombre'>;
  cadete?: Pick<User, 'id' | 'nombre' | 'celular'> | null;
  client?: Pick<Client, 'id' | 'nombre'> | null;
}

export interface Client {
  id: string;
  nombre: string;
  telefono: string | null;
  direccion: string | null;
  notas: string | null;
  createdAt: string;
  updatedAt: string;
  operationsCount?: number;
  lastOperationAt?: string | null;
}

export interface ClientsStats {
  total: number;
  nuevosEsteMes: number;
  operaronHoy: number;
}

export interface Incident {
  id: string;
  operationId: string;
  cadeteId: string;
  descripcion: string;
  isResolved: boolean;
  resolvedBy: string | null;
  resolvedAt: string | null;
  createdAt: string;
  cadete?: Pick<User, 'id' | 'nombre'>;
  operation?: Pick<Operation, 'id' | 'direccion' | 'monto' | 'moneda'>;
}

export interface CadetLocation {
  cadeteId: string;
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  updatedAt: string | null;
  cadete?: Pick<User, 'id' | 'nombre'>;
  cadeteStatus?: CadeteStatus;
}

export interface AmountCorrection {
  id: string;
  operationId: string;
  cadeteId: string;
  montoAnterior: number;
  montoNuevo: number;
  createdAt: string;
}

export interface OperationStatusHistory {
  id: string;
  operationId: string;
  fromStatus: OperationStatus | null;
  toStatus: OperationStatus;
  changedById: string;
  createdAt: string;
}

export interface OwnerSummary {
  period: 'today' | 'week' | 'month';
  totalOperations: number;
  byCurrency: CurrencySummary[];
  accounting?: {
    [currency: string]: {
      balance: number;
      entradas: number;
      salidas: number;
      promedioDiario: number;
      ratioEntradaSalida: number;
      dias: number;
    };
  };
}

export interface CurrencySummary {
  currency: Currency;
  totalMoved: number;
  comprado: number;
  vendido: number;
  opComprado: number;
  opVendido: number;
  totalOps: number;
}

export interface CashInStreet {
  currency: Currency;
  total: number;
  operationCount: number;
}

export interface AccountingEntry {
  operationId: string;
  operationType: OperationType;
  date: string;
  kind: 'entrega' | 'retiro';
  currency: Currency;
  concepto: string;
  valorInicial: number;
  valorFinal: number;
}

export interface AccountingLedger {
  date: string;
  totalEntries: number;
  byCurrency: Array<{
    currency: Currency;
    saldoFinal: number;
    entries: number;
    lines: AccountingEntry[];
  }>;
}

// API response wrappers
export type ApiOk<T> = { ok: true; data: T };
export type ApiError = { ok: false; error: string; details?: unknown };
export type ApiResponse<T> = ApiOk<T> | ApiError;

// Auth types
export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface RefreshResponse {
  accessToken: string;
}

// Socket.IO event payloads
export interface SocketEvents {
  'operation:created': { operation: Operation };
  'operation:updated': { operation: Operation };
  'operation:assigned': { operation: Operation; cadeteId: string };
  'incident:created': { incident: Incident };
  'incident:resolved': { incident: Incident };
  'location:updated': { cadeteId: string; lat: number; lng: number; accuracy: number | null };
  'cadete:pending_registration': { user: User };
}
