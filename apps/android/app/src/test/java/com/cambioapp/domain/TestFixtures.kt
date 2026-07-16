package com.mtbit.cambioapp.domain

import com.mtbit.cambioapp.data.model.Operation

/** Construye una Operation de prueba con valores por defecto razonables. */
fun operation(
    id: String = "op-123",
    status: String = "asignada",
    monto: String = "1000",
    moneda: String = "ARS",
    tipo: String = "entrega",
    contacto: String? = "Juan",
    telefono: String? = null,
    direccion: String? = "Av. Siempre Viva 742",
    notas: String? = null,
    cadeteId: String? = "cad-1",
    createdAt: String = "2026-01-01T00:00:00Z",
): Operation = Operation(
    id = id,
    status = status,
    monto = monto,
    moneda = moneda,
    tipo = tipo,
    contacto = contacto,
    telefono = telefono,
    direccion = direccion,
    notas = notas,
    cadeteId = cadeteId,
    createdAt = createdAt,
)
