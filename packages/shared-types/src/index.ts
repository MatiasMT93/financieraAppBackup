import type { Role, OperationStatus, OperationType, Currency, CadeteStatus } from '@cambioapp/shared-constants';

export type { Role, OperationStatus, OperationType, Currency, CadeteStatus };

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
  direccion: string;
  contacto: string;
  telefono: string | null;
  notas: string | null;
  status: OperationStatus;
  administrativoId: string;
  cadeteId: string | null;
  coordinadorId: string | null;
  createdAt: string;
  updatedAt: string;
  administrativo?: Pick<User, 'id' | 'nombre'>;
  cadete?: Pick<User, 'id' | 'nombre' | 'celular'> | null;
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
