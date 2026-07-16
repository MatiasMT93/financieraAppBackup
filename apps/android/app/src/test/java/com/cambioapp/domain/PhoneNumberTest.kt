package com.mtbit.cambioapp.domain

import org.junit.Assert.assertEquals
import org.junit.Test

class PhoneNumberTest {

    @Test
    fun `numero local con 0 inicial se convierte a formato internacional`() {
        // 011 1234-5678 -> 011 -> 54 9 + 11 12345678
        assertEquals("5491112345678", PhoneNumber.toWhatsAppArgentina("011 1234-5678"))
    }

    @Test
    fun `numero que empieza con 54 agrega el 9`() {
        assertEquals("5491112345678", PhoneNumber.toWhatsAppArgentina("54 11 1234 5678"))
    }

    @Test
    fun `numero que ya empieza con 549 queda igual`() {
        assertEquals("5491112345678", PhoneNumber.toWhatsAppArgentina("+549 11 1234-5678"))
    }

    @Test
    fun `numero sin prefijo se asume Argentina`() {
        assertEquals("5491112345678", PhoneNumber.toWhatsAppArgentina("1112345678"))
    }

    @Test
    fun `se eliminan espacios guiones y simbolos`() {
        assertEquals("5491112345678", PhoneNumber.toWhatsAppArgentina("(11) 1234-5678"))
    }
}
