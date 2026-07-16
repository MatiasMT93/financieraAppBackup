import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  onLogin: (usuario: string, password: string) => Promise<void>;
  onRegister?: () => void;
}

export default function LoginScreen({ onLogin, onRegister }: Props) {
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [recordar, setRecordar] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleLogin() {
    if (!usuario.trim() || !password.trim()) {
      Alert.alert('Error', 'Completá usuario y contraseña');
      return;
    }
    setLoading(true);
    try {
      await onLogin(usuario.trim(), password.trim());
    } catch {
      Alert.alert('Error', 'Usuario o contraseña incorrectos');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.spacerTop} />

      <View style={styles.card}>
        <View style={styles.badge}>
          <Ionicons name="shield-checkmark" size={28} color={GREEN} />
        </View>

        <View style={styles.form}>
          <View style={styles.inputRow}>
            <View style={styles.inputIcon}>
              <Ionicons name="person" size={18} color={GREEN} />
            </View>
            <TextInput
              style={styles.input}
              value={usuario}
              onChangeText={setUsuario}
              placeholder="Usuario"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          <View style={styles.inputRow}>
            <View style={styles.inputIcon}>
              <Ionicons name="lock-closed" size={18} color={GREEN} />
            </View>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="Contraseña"
              secureTextEntry={!showPassword}
              returnKeyType="done"
              onSubmitEditing={handleLogin}
              placeholderTextColor="#9CA3AF"
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons
                name={showPassword ? 'eye-off' : 'eye'}
                size={20}
                color="#9CA3AF"
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.rememberContainer}
            onPress={() => setRecordar(!recordar)}
            activeOpacity={0.7}
          >
            <View style={[styles.checkbox, recordar && styles.checkboxActive]}>
              {recordar && <Ionicons name="checkmark" size={14} color="#fff" />}
            </View>
            <Text style={styles.rememberText}>Recordar sesión</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.btnText}>Ingresar</Text>
                <Ionicons name="arrow-forward" size={18} color="#fff" style={styles.btnIcon} />
              </>
            )}
          </TouchableOpacity>

          {onRegister && (
            <TouchableOpacity
              style={styles.registerLink}
              onPress={onRegister}
              activeOpacity={0.7}
            >
              <Text style={styles.registerText}>
                ¿No tenés cuenta? <Text style={styles.registerBold}>Registrarse</Text>
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.spacerBottom} />
    </KeyboardAvoidingView>
  );
}

const GREEN = '#1D9E75';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  spacerTop: { flex: 1 },
  spacerBottom: { flex: 1 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 32,
    marginHorizontal: 16,
    paddingTop: 44,
    paddingHorizontal: 24,
    paddingBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 10,
  },
  badge: {
    position: 'absolute',
    top: -30,
    alignSelf: 'center',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 6,
  },
  form: { width: '100%' },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FBF6',
    borderRadius: 14,
    paddingHorizontal: 14,
    marginTop: 14,
    height: 54,
  },
  inputIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#DFF5EA',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1a1a1a',
  },
  btn: {
    flexDirection: 'row',
    backgroundColor: GREEN,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    minHeight: 54,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  btnIcon: { marginLeft: 8 },
  rememberContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 4,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 2,
    borderColor: '#ccc',
    borderRadius: 6,
    marginRight: 8,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: GREEN,
    borderColor: GREEN,
  },
  rememberText: {
    fontSize: 14,
    color: '#555',
  },
  registerLink: {
    marginTop: 20,
    alignItems: 'center',
  },
  registerText: {
    fontSize: 15,
    color: '#555',
  },
  registerBold: {
    fontWeight: '700',
    color: GREEN,
  },
});