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
import { useAuth } from '../hooks/useAuth';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  onBack: () => void;
}

export default function RegisterScreen({ onBack }: Props) {
  const { register } = useAuth();
  const [usuario, setUsuario] = useState('');
  const [nombreCompleto, setNombreCompleto] = useState('');
  const [celular, setCelular] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Función para separar nombre y apellido
  function splitNombreCompleto(texto: string): { nombre: string; apellido: string } {
    const partes = texto.trim().split(' ');
    if (partes.length === 1) {
      return { nombre: partes[0], apellido: '' };
    }
    const nombre = partes[0];
    const apellido = partes.slice(1).join(' ');
    return { nombre, apellido };
  }

  async function handleRegister() {
    if (!usuario.trim() || !nombreCompleto.trim() || !celular.trim() || !password.trim()) {
      Alert.alert('Error', 'Completá todos los campos');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Error', 'La contraseña debe tener al menos 6 caracteres');
      return;
    }
    setLoading(true);
    try {
      const { nombre, apellido } = splitNombreCompleto(nombreCompleto);
      await register(usuario.trim(), nombre, apellido, celular.trim(), password.trim());
      Alert.alert('Éxito', 'Solicitud de registro enviada. Esperá la aprobación del coordinador.');
      onBack();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo registrar');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <TouchableOpacity onPress={onBack} style={styles.backButton}>
        <Ionicons name="arrow-back" size={24} color="#fff" />
      </TouchableOpacity>

      <View style={styles.spacerTop} />

      <View style={styles.card}>
        <View style={styles.badge}>
          <Ionicons name="person-add-outline" size={28} color={GREEN} />
        </View>

        <Text style={styles.title}>Crear cuenta</Text>

        <View style={styles.form}>
          <View style={styles.inputRow}>
            <View style={styles.inputIcon}>
              <Ionicons name="person-outline" size={18} color={GREEN} />
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
              <Ionicons name="person-circle-outline" size={18} color={GREEN} />
            </View>
            <TextInput
              style={styles.input}
              value={nombreCompleto}
              onChangeText={setNombreCompleto}
              placeholder="Tu nombre completo"
              returnKeyType="next"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          <View style={styles.inputRow}>
            <View style={styles.inputIcon}>
              <Ionicons name="call-outline" size={18} color={GREEN} />
            </View>
            <TextInput
              style={styles.input}
              value={celular}
              onChangeText={setCelular}
              placeholder="Ej: 11 2345 6789"
              keyboardType="phone-pad"
              returnKeyType="next"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          <View style={styles.inputRow}>
            <View style={styles.inputIcon}>
              <Ionicons name="lock-closed-outline" size={18} color={GREEN} />
            </View>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="Mínimo 6 caracteres"
              secureTextEntry
              returnKeyType="done"
              onSubmitEditing={handleRegister}
              placeholderTextColor="#9CA3AF"
            />
          </View>

          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleRegister}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>Enviar solicitud</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.registerLink}
            onPress={onBack}
            activeOpacity={0.7}
          >
            <Text style={styles.registerText}>
              ¿Ya tenés cuenta? <Text style={styles.registerBold}>Iniciar sesión</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.spacerBottom} />
    </KeyboardAvoidingView>
  );
}

const GREEN = '#1D9E75';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  backButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    left: 20,
    zIndex: 1,
    padding: 10,
  },
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
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 20,
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