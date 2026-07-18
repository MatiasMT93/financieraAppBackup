export const ROLES = {
  CADETE: 'cadete',
  COORDINADOR: 'coordinador',
  ADMINISTRATIVO: 'administrativo',
  DUENO: 'dueno',
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const OPERATION_STATUS = {
  PENDIENTE: 'pendiente',
  ASIGNADA: 'asignada',
  EN_CAMINO: 'en_camino',
  EN_DESTINO: 'en_destino',
  VOLVIENDO: 'volviendo',
  CERRADA: 'cerrada',
  CANCELADA: 'cancelada',
  INCIDENCIA: 'incidencia',
} as const;

export type OperationStatus = (typeof OPERATION_STATUS)[keyof typeof OPERATION_STATUS];

export const CADETE_STATUS = {
  DISPONIBLE: 'disponible',
  ASIGNADA: 'asignada',
  EN_CAMINO: 'en_camino',
  EN_DESTINO: 'en_destino',
  VOLVIENDO: 'volviendo',
  INCIDENCIA: 'incidencia',
} as const;

export type CadeteStatus = (typeof CADETE_STATUS)[keyof typeof CADETE_STATUS];

export const OPERATION_TYPE = {
  ENTREGA: 'entrega',
  RETIRO: 'retiro',
  ENTREGA_RETIRO: 'entrega_retiro',
} as const;

export type OperationType = (typeof OPERATION_TYPE)[keyof typeof OPERATION_TYPE];

export const CURRENCY = {
  ARS: 'ARS',
  USD: 'USD',
  EUR: 'EUR',
  BRL: 'BRL',
  USDT: 'USDT',
} as const;

export type Currency = (typeof CURRENCY)[keyof typeof CURRENCY];

export const SUMMARY_PERIOD = {
  TODAY: 'today',
  WEEK: 'week',
  MONTH: 'month',
} as const;

export type SummaryPeriod = (typeof SUMMARY_PERIOD)[keyof typeof SUMMARY_PERIOD];

/** Legal operation state transitions */
export const VALID_TRANSITIONS: Record<OperationStatus, OperationStatus[]> = {
  pendiente: ['asignada', 'cancelada'],
  asignada: ['en_camino', 'cancelada'],
  en_camino: ['en_destino', 'incidencia'],
  en_destino: ['volviendo', 'incidencia'],
  volviendo: ['cerrada'],
  cerrada: [],
  cancelada: [],
  incidencia: ['en_camino', 'en_destino'],
};

/** Statuses that allow editing/cancellation */
export const EDITABLE_STATUSES: OperationStatus[] = ['pendiente', 'asignada'];
export const CANCELLABLE_STATUSES: OperationStatus[] = ['pendiente', 'asignada'];

/** Colors per role (for reference in frontend) */
export const ROLE_COLORS = {
  cadete: '#1D9E75',
  coordinador: '#185FA5',
  administrativo: '#0F6E56',
  dueno: '#26215C',
} as const;

/** Badge colors by status */
export const STATUS_BADGE_COLORS = {
  disponible: { bg: '#E1F5EE', text: '#0F6E56' },
  pendiente: { bg: '#FAEEDA', text: '#854F0B' },
  asignada: { bg: '#FAEEDA', text: '#854F0B' },
  en_camino: { bg: '#E6F1FB', text: '#185FA5' },
  en_destino: { bg: '#E6F1FB', text: '#185FA5' },
  volviendo: { bg: '#EEEDFE', text: '#3C3489' },
  cerrada: { bg: '#E1F5EE', text: '#0F6E56' },
  cancelada: { bg: '#FAECE7', text: '#993C1D' },
  incidencia: { bg: '#FAECE7', text: '#993C1D' },
} as const;

export const JWT_ACCESS_EXPIRY = '15m';
export const JWT_REFRESH_EXPIRY = '7d';
export const BCRYPT_SALT_ROUNDS = 10;
export const LOCATION_UPDATE_INTERVAL_MS = 20_000;
