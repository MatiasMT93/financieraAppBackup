import { db } from '../../db/connection.js';
import { cadetLocations } from '../../db/schema.js';
import { sql } from 'drizzle-orm';

export async function saveLocation(data: {
  cadeteId: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
}) {
  await db.insert(cadetLocations).values(data);
}

export async function getLatestLocations() {
  // El mapa deriva quién está activo desde las OPERACIONES reales, no del campo
  // denormalizado users.cadete_status (que se puede desincronizar: p.ej. un
  // cadete con dos operaciones donde se cancela una y su status pasa a
  // 'disponible' aunque la otra siga en curso). Acá un cadete aparece si tiene
  // al menos una operación activa, y el estado mostrado sale de esa operación.
  // Esto es auto-correctivo: no hace falta arreglar datos viejos a mano.
  //
  // LEFT JOIN con cadet_locations: si todavía no envió GPS igual aparece (sin
  // coordenadas), y el marcador surge en cuanto llega el primer punto.
  return db.execute(sql`
    SELECT DISTINCT ON (u.id)
      u.id          AS "cadeteId",
      cl.latitude,
      cl.longitude,
      cl.accuracy,
      cl.created_at AS "updatedAt",
      u.nombre,
      ao.op_status  AS "cadeteStatus"
    FROM (
      SELECT DISTINCT ON (o.cadete_id)
        o.cadete_id,
        o.status AS op_status
      FROM operations o
      WHERE o.cadete_id IS NOT NULL
        AND o.status IN ('asignada', 'en_camino', 'en_destino', 'volviendo', 'incidencia')
      ORDER BY o.cadete_id,
        CASE o.status
          WHEN 'incidencia' THEN 5
          WHEN 'en_destino' THEN 4
          WHEN 'volviendo'  THEN 3
          WHEN 'en_camino'  THEN 2
          WHEN 'asignada'   THEN 1
          ELSE 0
        END DESC,
        o.updated_at DESC
    ) ao
    JOIN users u ON u.id = ao.cadete_id
    LEFT JOIN cadet_locations cl ON cl.cadete_id = u.id
    WHERE u.is_active = true
      AND u.role = 'cadete'
    ORDER BY u.id, cl.created_at DESC NULLS LAST
  `);
}
