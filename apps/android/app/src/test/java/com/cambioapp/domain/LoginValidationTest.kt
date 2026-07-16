package com.mtbit.cambioapp.domain

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class LoginValidationTest {

    @Test
    fun `credenciales validas no devuelven error`() {
        assertNull(LoginValidation.validateCredentials("matias", "secreto"))
    }

    @Test
    fun `usuario vacio devuelve error`() {
        assertEquals(LoginValidation.EMPTY_FIELDS, LoginValidation.validateCredentials("", "secreto"))
        assertEquals(LoginValidation.EMPTY_FIELDS, LoginValidation.validateCredentials("   ", "secreto"))
    }

    @Test
    fun `password vacio devuelve error`() {
        assertEquals(LoginValidation.EMPTY_FIELDS, LoginValidation.validateCredentials("matias", ""))
        assertEquals(LoginValidation.EMPTY_FIELDS, LoginValidation.validateCredentials("matias", "   "))
    }

    @Test
    fun `isCadete solo es true para el rol cadete`() {
        assertTrue(LoginValidation.isCadete("cadete"))
        assertFalse(LoginValidation.isCadete("coordinador"))
        assertFalse(LoginValidation.isCadete("administrativo"))
        assertFalse(LoginValidation.isCadete(null))
    }
}
