package com.mtbit.cambioapp.domain

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class UpdateLogicTest {

    @Test
    fun `hay update cuando la version remota es mayor y hay url`() {
        assertTrue(UpdateLogic.isUpdateAvailable(remoteVersionCode = 8, currentVersionCode = 7, url = "https://x/app.apk"))
    }

    @Test
    fun `no hay update si la version remota es igual o menor`() {
        assertFalse(UpdateLogic.isUpdateAvailable(7, 7, "https://x/app.apk"))
        assertFalse(UpdateLogic.isUpdateAvailable(6, 7, "https://x/app.apk"))
    }

    @Test
    fun `no hay update si la url es nula o vacia aunque la version sea mayor`() {
        assertFalse(UpdateLogic.isUpdateAvailable(99, 7, null))
        assertFalse(UpdateLogic.isUpdateAvailable(99, 7, ""))
        assertFalse(UpdateLogic.isUpdateAvailable(99, 7, "   "))
    }
}
