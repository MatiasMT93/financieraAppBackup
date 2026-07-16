package com.mtbit.cambioapp.domain

import org.junit.Assert.assertEquals
import org.junit.Test

class MoneyTest {

    @Test
    fun `symbol devuelve el simbolo correcto por moneda`() {
        assertEquals("$", Money.symbol("ARS"))
        assertEquals("U\$S", Money.symbol("USD"))
        assertEquals("€", Money.symbol("EUR"))
        assertEquals("R$", Money.symbol("BRL"))
    }

    @Test
    fun `symbol devuelve el codigo si la moneda es desconocida`() {
        assertEquals("JPY", Money.symbol("JPY"))
    }

    @Test
    fun `formatAmount sin decimales`() {
        assertEquals("1000", Money.formatAmount("1000"))
        assertEquals("1235", Money.formatAmount("1234.56"))
    }

    @Test
    fun `formatAmount con valor invalido o nulo devuelve 0`() {
        assertEquals("0", Money.formatAmount(null))
        assertEquals("0", Money.formatAmount("no-es-numero"))
        assertEquals("0", Money.formatAmount(""))
    }

    @Test
    fun `amountLabel depende del tipo de operacion`() {
        assertEquals("MONTO A RECIBIR", Money.amountLabel("retiro"))
        assertEquals("MONTO A RECIBIR", Money.amountLabel("RETIRO"))
        assertEquals("MONTO A ENTREGAR", Money.amountLabel("entrega"))
        assertEquals("MONTO A ENTREGAR", Money.amountLabel("cualquier_cosa"))
    }

    @Test
    fun `shortId toma los ultimos 3 caracteres en mayuscula`() {
        assertEquals("123", Money.shortId("op-123"))
        assertEquals("ABC", Money.shortId("xyzabc"))
        assertEquals("AB", Money.shortId("ab"))
    }
}
