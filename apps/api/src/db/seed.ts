import { db } from './connection.js';
import { users, operations, operationStatusHistory } from './schema.js';
import bcrypt from 'bcrypt';
import { BCRYPT_SALT_ROUNDS } from '@cambioapp/shared-constants';
import { logger } from '../config/logger.js';
import 'dotenv/config';

async function seed() {
  logger.info('Seeding database...');

  const password = await bcrypt.hash('CambioApp2024!', BCRYPT_SALT_ROUNDS);

  const seedUsers = [
    { usuario: 'admin', nombre: 'Admin Principal', role: 'administrativo' as const },
    { usuario: 'admin2', nombre: 'Admin Secundario', role: 'administrativo' as const },
    { usuario: 'coordinador', nombre: 'Coordinador Central', role: 'coordinador' as const },
    { usuario: 'carlos', nombre: 'Carlos Cadete', role: 'cadete' as const },
    { usuario: 'martin', nombre: 'Martín Cadete', role: 'cadete' as const },
    { usuario: 'dueno', nombre: 'Dueño', role: 'dueno' as const },
  ];

  const insertedUsers: Record<string, string> = {};

  for (const u of seedUsers) {
    await db
      .insert(users)
      .values({ ...u, passwordHash: password })
      .onConflictDoNothing(); // usuario tiene UNIQUE constraint

    const found = await db.query.users.findFirst({
      where: (t, { eq }) => eq(t.usuario, u.usuario),
    });
    if (found) insertedUsers[u.nombre] = found.id;
  }

  logger.info({ insertedUsers }, 'Users seeded');

  const adminId = insertedUsers['Admin Principal'];
  const coordId = insertedUsers['Coordinador Central'];
  const carlosId = insertedUsers['Carlos Cadete'];
  const martinId = insertedUsers['Martín Cadete'];

  // Solo crear operaciones si no hay ninguna
  const existingOps = await db.query.operations.findFirst();
  if (existingOps) {
    logger.info('Operations already seeded, skipping');
    logger.info('All users have password: CambioApp2024!');
    return;
  }

  const today = new Date();

  // Op 1: pendiente (recién creada, esperando asignación)
  const [op1] = await db.insert(operations).values({
    tipo: 'entrega',
    moneda: 'USD',
    monto: '2500',
    direccion: 'Av. Santa Fe 3200, Palermo',
    contacto: 'Roberto Sánchez',
    telefono: '11 4444-5555',
    notas: 'Piso 4, timbre "Sánchez"',
    status: 'pendiente',
    administrativoId: adminId,
    createdAt: today,
    updatedAt: today,
  }).returning();

  await db.insert(operationStatusHistory).values({
    operationId: op1.id,
    fromStatus: null,
    toStatus: 'pendiente',
    changedById: adminId,
    createdAt: today,
  });

  // Op 2: asignada a Carlos
  const [op2] = await db.insert(operations).values({
    tipo: 'retiro',
    moneda: 'ARS',
    monto: '450000',
    direccion: 'Corrientes 1500, San Nicolás',
    contacto: 'Ana Martínez',
    status: 'asignada',
    administrativoId: adminId,
    cadeteId: carlosId,
    coordinadorId: coordId,
    createdAt: today,
    updatedAt: today,
  }).returning();

  await db.insert(operationStatusHistory).values([
    { operationId: op2.id, fromStatus: null, toStatus: 'pendiente', changedById: adminId, createdAt: today },
    { operationId: op2.id, fromStatus: 'pendiente', toStatus: 'asignada', changedById: coordId, createdAt: today },
  ]);

  // Op 3: en_camino con Martín
  const [op3] = await db.insert(operations).values({
    tipo: 'entrega',
    moneda: 'USD',
    monto: '800',
    direccion: 'Av. Cabildo 2100, Belgrano',
    contacto: 'Lucas Fernández',
    telefono: '11 5555-6666',
    status: 'en_camino',
    administrativoId: adminId,
    cadeteId: martinId,
    coordinadorId: coordId,
    createdAt: today,
    updatedAt: today,
  }).returning();

  await db.insert(operationStatusHistory).values([
    { operationId: op3.id, fromStatus: null, toStatus: 'pendiente', changedById: adminId, createdAt: today },
    { operationId: op3.id, fromStatus: 'pendiente', toStatus: 'asignada', changedById: coordId, createdAt: today },
    { operationId: op3.id, fromStatus: 'asignada', toStatus: 'en_camino', changedById: martinId, createdAt: today },
  ]);

  // Op 4: cerrada (de hoy)
  const [op4] = await db.insert(operations).values({
    tipo: 'retiro',
    moneda: 'USD',
    monto: '1200',
    direccion: 'Florida 855, Microcentro',
    contacto: 'Patricia López',
    status: 'cerrada',
    administrativoId: adminId,
    cadeteId: carlosId,
    coordinadorId: coordId,
    createdAt: today,
    updatedAt: today,
  }).returning();

  await db.insert(operationStatusHistory).values([
    { operationId: op4.id, fromStatus: null, toStatus: 'pendiente', changedById: adminId, createdAt: today },
    { operationId: op4.id, fromStatus: 'pendiente', toStatus: 'asignada', changedById: coordId, createdAt: today },
    { operationId: op4.id, fromStatus: 'asignada', toStatus: 'en_camino', changedById: carlosId, createdAt: today },
    { operationId: op4.id, fromStatus: 'en_camino', toStatus: 'en_destino', changedById: carlosId, createdAt: today },
    { operationId: op4.id, fromStatus: 'en_destino', toStatus: 'volviendo', changedById: carlosId, createdAt: today },
    { operationId: op4.id, fromStatus: 'volviendo', toStatus: 'cerrada', changedById: carlosId, createdAt: today },
  ]);

  // Op 5: cerrada (ARS, para el dashboard del dueño)
  const [op5] = await db.insert(operations).values({
    tipo: 'entrega',
    moneda: 'ARS',
    monto: '750000',
    direccion: 'Av. Rivadavia 5100, Caballito',
    contacto: 'Diego Torres',
    status: 'cerrada',
    administrativoId: adminId,
    cadeteId: martinId,
    coordinadorId: coordId,
    createdAt: today,
    updatedAt: today,
  }).returning();

  // Sincronizar cadeteStatus con el estado actual en la calle
  // Carlos tiene op asignada y op cerrada — la activa es la asignada
  // Martín está en_camino
  await db.update(users)
    .set({ cadeteStatus: 'asignada', updatedAt: today })
    .where((await import('drizzle-orm')).eq(users.id, carlosId));

  await db.update(users)
    .set({ cadeteStatus: 'en_camino', updatedAt: today })
    .where((await import('drizzle-orm')).eq(users.id, martinId));

  logger.info('Operations seeded successfully');
  logger.info('All users have password: CambioApp2024!');
  logger.info('Credentials: Admin Principal, Admin Secundario, Coordinador Central, Carlos Cadete, Martín Cadete, Dueño');
}

seed().catch((err) => {
  logger.error(err, 'Seed failed');
  process.exit(1);
});
