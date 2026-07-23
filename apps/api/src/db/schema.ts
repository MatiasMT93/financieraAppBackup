import {
  pgTable,
  uuid,
  varchar,
  text,
  numeric,
  boolean,
  timestamp,
  pgEnum,
  bigserial,
  real,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const roleEnum = pgEnum('role', ['cadete', 'coordinador', 'administrativo', 'dueno']);
export const operationTypeEnum = pgEnum('operation_type', ['entrega', 'retiro', 'entrega_retiro']);
export const currencyEnum = pgEnum('currency', ['ARS', 'USD', 'EUR', 'BRL', 'USDT']);
export const operationStatusEnum = pgEnum('operation_status', [
  'pendiente',
  'asignada',
  'en_camino',
  'en_destino',
  'volviendo',
  'cerrada',
  'cancelada',
  'incidencia',
]);
export const cadeteStatusEnum = pgEnum('cadete_status', [
  'disponible',
  'asignada',
  'en_camino',
  'en_destino',
  'volviendo',
  'incidencia',
]);
export const deliveryModeEnum = pgEnum('delivery_mode', ['domicilio', 'ventanilla', 'deposito']);

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  usuario: varchar('usuario', { length: 100 }).notNull().unique(),
  nombre: varchar('nombre', { length: 100 }).notNull(),
  apellido: varchar('apellido', { length: 100 }),
  celular: varchar('celular', { length: 50 }),
  passwordHash: text('password_hash').notNull(),
  role: roleEnum('role').notNull(),
  cadeteStatus: cadeteStatusEnum('cadete_status').default('disponible'),
  isActive: boolean('is_active').notNull().default(true),
  pendingApproval: boolean('pending_approval').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const clients = pgTable(
  'clients',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    nombre: varchar('nombre', { length: 200 }).notNull(),
    telefono: varchar('telefono', { length: 50 }),
    direccion: text('direccion'),
    notas: text('notas'),
    createdById: uuid('created_by_id').references(() => users.id),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => ({
    clients_nombre_idx: index('clients_nombre_idx').on(t.nombre),
  }),
);

export const operations = pgTable(
  'operations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tipo: operationTypeEnum('tipo').notNull(),
    moneda: currencyEnum('moneda').notNull(),
    monto: numeric('monto', { precision: 15, scale: 2 }).notNull(),
    // Solo se usan cuando tipo = 'entrega_retiro': `monto`/`moneda` pasan a
    // representar el monto a entregar, y estas dos el monto a retirar.
    moneda2: currencyEnum('moneda2'),
    monto2: numeric('monto2', { precision: 15, scale: 2 }),
    // Nula solo quedan las 'ventanilla': el cliente viene a la oficina, no
    // hace falta una dirección de entrega ni despachar un cadete.
    direccion: text('direccion'),
    contacto: varchar('contacto', { length: 200 }).notNull(),
    telefono: varchar('telefono', { length: 50 }),
    notas: text('notas'),
    modalidad: deliveryModeEnum('modalidad').notNull().default('domicilio'),
    // Solo se usa cuando modalidad = 'deposito': banco donde el cadete hace
    // el depósito (la dirección de la sucursal sigue yendo en `direccion`).
    banco: varchar('banco', { length: 150 }),
    clientId: uuid('client_id').references(() => clients.id),
    status: operationStatusEnum('status').notNull().default('pendiente'),
    administrativoId: uuid('administrativo_id')
      .notNull()
      .references(() => users.id),
    cadeteId: uuid('cadete_id').references(() => users.id),
    coordinadorId: uuid('coordinador_id').references(() => users.id),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => ({
    operations_status_idx: index('operations_status_idx').on(t.status),
    operations_cadete_idx: index('operations_cadete_idx').on(t.cadeteId),
    operations_client_idx: index('operations_client_idx').on(t.clientId),
  }),
);

export const operationStatusHistory = pgTable('operation_status_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  operationId: uuid('operation_id')
    .notNull()
    .references(() => operations.id),
  fromStatus: operationStatusEnum('from_status'),
  toStatus: operationStatusEnum('to_status').notNull(),
  changedById: uuid('changed_by_id')
    .notNull()
    .references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const incidents = pgTable(
  'incidents',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    operationId: uuid('operation_id')
      .notNull()
      .references(() => operations.id),
    cadeteId: uuid('cadete_id')
      .notNull()
      .references(() => users.id),
    descripcion: text('descripcion').notNull(),
    isResolved: boolean('is_resolved').notNull().default(false),
    resolvedBy: uuid('resolved_by').references(() => users.id),
    resolvedAt: timestamp('resolved_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => ({
    incidents_resolved_idx: index('incidents_resolved_idx').on(t.isResolved),
  }),
);

export const amountCorrections = pgTable('amount_corrections', {
  id: uuid('id').primaryKey().defaultRandom(),
  operationId: uuid('operation_id')
    .notNull()
    .references(() => operations.id),
  cadeteId: uuid('cadete_id')
    .notNull()
    .references(() => users.id),
  montoAnterior: numeric('monto_anterior', { precision: 15, scale: 2 }).notNull(),
  montoNuevo: numeric('monto_nuevo', { precision: 15, scale: 2 }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const cadetLocations = pgTable(
  'cadet_locations',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    cadeteId: uuid('cadete_id')
      .notNull()
      .references(() => users.id),
    latitude: real('latitude').notNull(),
    longitude: real('longitude').notNull(),
    accuracy: real('accuracy'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => ({
    cadet_locations_cadete_time_idx: index('cadet_locations_cadete_time_idx').on(t.cadeteId, t.createdAt),
  }),
);

export const refreshTokens = pgTable(
  'refresh_tokens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    tokenHash: text('token_hash').notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    revokedAt: timestamp('revoked_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => ({
    // findValidRefreshToken filtra por token_hash en cada refresh/logout, y
    // revokeAllUserRefreshTokens por user_id. Sin índice serían seq scans sobre
    // una tabla que crece con cada login.
    refresh_tokens_token_hash_idx: index('refresh_tokens_token_hash_idx').on(t.tokenHash),
    refresh_tokens_user_id_idx: index('refresh_tokens_user_id_idx').on(t.userId),
  }),
);

export const contacts = pgTable('contacts', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  address: varchar('address', { length: 512 }).notNull(),
  phone: varchar('phone', { length: 50 }),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  // Índice para acelerar la búsqueda por dirección
  addressIdx: index('contacts_address_idx').on(table.address),
}));

// ─── Relations (required by Drizzle query builder for `with` clauses) ────────

export const usersRelations = relations(users, ({ many }) => ({
  operationsAsAdmin: many(operations, { relationName: 'op_administrativo' }),
  operationsAsCadete: many(operations, { relationName: 'op_cadete' }),
  operationsAsCoord: many(operations, { relationName: 'op_coordinador' }),
  incidents: many(incidents, { relationName: 'incident_cadete' }),
  amountCorrections: many(amountCorrections),
  locations: many(cadetLocations),
  refreshTokens: many(refreshTokens),
  clientsCreated: many(clients),
}));

export const operationsRelations = relations(operations, ({ one, many }) => ({
  administrativo: one(users, {
    fields: [operations.administrativoId],
    references: [users.id],
    relationName: 'op_administrativo',
  }),
  cadete: one(users, {
    fields: [operations.cadeteId],
    references: [users.id],
    relationName: 'op_cadete',
  }),
  coordinador: one(users, {
    fields: [operations.coordinadorId],
    references: [users.id],
    relationName: 'op_coordinador',
  }),
  client: one(clients, {
    fields: [operations.clientId],
    references: [clients.id],
  }),
  statusHistory: many(operationStatusHistory),
  incidents: many(incidents, { relationName: 'incident_operation' }),
  amountCorrections: many(amountCorrections),
}));

export const clientsRelations = relations(clients, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [clients.createdById],
    references: [users.id],
  }),
  operations: many(operations),
}));

export const operationStatusHistoryRelations = relations(operationStatusHistory, ({ one }) => ({
  operation: one(operations, {
    fields: [operationStatusHistory.operationId],
    references: [operations.id],
  }),
  changedBy: one(users, {
    fields: [operationStatusHistory.changedById],
    references: [users.id],
  }),
}));

export const incidentsRelations = relations(incidents, ({ one }) => ({
  cadete: one(users, {
    fields: [incidents.cadeteId],
    references: [users.id],
    relationName: 'incident_cadete',
  }),
  operation: one(operations, {
    fields: [incidents.operationId],
    references: [operations.id],
    relationName: 'incident_operation',
  }),
}));

export const amountCorrectionsRelations = relations(amountCorrections, ({ one }) => ({
  operation: one(operations, {
    fields: [amountCorrections.operationId],
    references: [operations.id],
  }),
  cadete: one(users, {
    fields: [amountCorrections.cadeteId],
    references: [users.id],
  }),
}));

export const cadetLocationsRelations = relations(cadetLocations, ({ one }) => ({
  cadete: one(users, {
    fields: [cadetLocations.cadeteId],
    references: [users.id],
  }),
}));

export const refreshTokensRelations = relations(refreshTokens, ({ one }) => ({
  user: one(users, {
    fields: [refreshTokens.userId],
    references: [users.id],
  }),
}));
