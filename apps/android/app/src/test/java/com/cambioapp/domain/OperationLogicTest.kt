package com.mtbit.cambioapp.domain

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class OperationLogicTest {

    @Test
    fun `activeOperations excluye cerradas y canceladas`() {
        val ops = listOf(
            operation(id = "1", status = "asignada"),
            operation(id = "2", status = "en_camino"),
            operation(id = "3", status = "cerrada"),
            operation(id = "4", status = "cancelada"),
        )
        val active = OperationLogic.activeOperations(ops)
        assertEquals(listOf("1", "2"), active.map { it.id })
    }

    @Test
    fun `activeOperations con lista vacia devuelve vacia`() {
        assertTrue(OperationLogic.activeOperations(emptyList()).isEmpty())
    }

    @Test
    fun `requiresLocationSharing true cuando hay un estado de reparto`() {
        listOf("en_camino", "en_destino", "volviendo").forEach { status ->
            assertTrue(
                "Debe compartir ubicación en $status",
                OperationLogic.requiresLocationSharing(listOf(operation(status = status))),
            )
        }
    }

    @Test
    fun `requiresLocationSharing false cuando esta asignada o cerrada`() {
        assertFalse(OperationLogic.requiresLocationSharing(listOf(operation(status = "asignada"))))
        assertFalse(OperationLogic.requiresLocationSharing(listOf(operation(status = "cerrada"))))
        assertFalse(OperationLogic.requiresLocationSharing(emptyList()))
    }

    @Test
    fun `requiresLocationSharing true si al menos una operacion lo requiere`() {
        val ops = listOf(operation(status = "asignada"), operation(status = "en_camino"))
        assertTrue(OperationLogic.requiresLocationSharing(ops))
    }

    @Test
    fun `nextAction sigue el flujo correcto del cadete`() {
        assertEquals("en_camino" to "Salgo para el lugar", OperationLogic.nextAction("asignada"))
        assertEquals("en_destino" to "Llegué al destino", OperationLogic.nextAction("en_camino"))
        assertEquals("volviendo" to "Operación realizada", OperationLogic.nextAction("en_destino"))
        assertEquals("cerrada" to "Estoy en la base", OperationLogic.nextAction("volviendo"))
    }

    @Test
    fun `nextAction es null para estados terminales o desconocidos`() {
        assertNull(OperationLogic.nextAction("cerrada"))
        assertNull(OperationLogic.nextAction("cancelada"))
        assertNull(OperationLogic.nextAction("cualquier_cosa"))
    }
}
