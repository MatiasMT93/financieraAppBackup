import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Linking,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Operation } from '@cambioapp/shared-types';
import { startLocationTracking, stopLocationTracking } from '../services/location-tracking';

interface Props {
  operation: Operation | null;
  loading: boolean;
  onTransition: (status: string) => Promise<void>;
  onModifyAmount: (monto: number) => Promise<void>;
  onReportIncident: (desc: string) => Promise<void>;
  onLogout: () => void;
}

const GREEN = '#1D9E75';

const STATUS_LABELS: Record<string, string> = {
  pendiente: 'Pendiente',
  asignada: 'En espera — todavía no saliste',
  en_camino: 'En camino al destino',
  en_destino: 'En el destino',
  volviendo: 'Volviendo a la base',
  cerrada: 'Operación cerrada',
  incidencia: 'Incidencia reportada',
};

const STATUS_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  asignada: 'time-outline',
  en_camino: 'walk-outline',
  en_destino: 'location',
  volviendo: 'arrow-undo-outline',
  cerrada: 'checkmark-circle',
  incidencia: 'warning',
};

const STATUS_COLORS: Record<string, string> = {
  asignada: '#854F0B',
  en_camino: '#185FA5',
  en_destino: '#1e3a8a',
  volviendo: '#3C3489',
  incidencia: '#993C1D',
};

function formatMonto(op: Operation): string {
  const sym = op.moneda === 'ARS' ? '$' : op.moneda === 'USD' ? 'U$' : op.moneda === 'EUR' ? '€' : 'R$';
  const verb = op.tipo === 'entrega' ? 'Entregar' : 'Recibir';
  return `${verb} ${sym} ${Number(op.monto).toLocaleString('es-AR')} ${op.moneda}`;
}

export default function OperacionScreen({
  operation,
  loading,
  onTransition,
  onModifyAmount,
  onReportIncident,
  onLogout,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [showAmountModal, setShowAmountModal] = useState(false);
  const [showIncidentModal, setShowIncidentModal] = useState(false);
  const [newMonto, setNewMonto] = useState('');
  const [incidentDesc, setIncidentDesc] = useState('');

  async function doTransition(status: string) {
    setBusy(true);
    try {
      await onTransition(status);
      if (status === 'en_camino') await startLocationTracking();
      if (status === 'cerrada' || status === 'disponible') await stopLocationTracking();
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'No se pudo cambiar el estado');
    } finally {
      setBusy(false);
    }
  }

  async function doModifyAmount() {
    const val = parseFloat(newMonto);
    if (!val || val <= 0) {
      Alert.alert('Error', 'Ingresá un monto válido');
      return;
    }
    setBusy(true);
    try {
      await onModifyAmount(val);
      setShowAmountModal(false);
      setNewMonto('');
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'No se pudo modificar el monto');
    } finally {
      setBusy(false);
    }
  }

  async function doReportIncident() {
    if (incidentDesc.trim().length < 10) {
      Alert.alert('Error', 'Describí la incidencia (mínimo 10 caracteres)');
      return;
    }
    setBusy(true);
    try {
      await onReportIncident(incidentDesc.trim());
      setShowIncidentModal(false);
      setIncidentDesc('');
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'No se pudo reportar la incidencia');
    } finally {
      setBusy(false);
    }
  }

  function openMaps() {
    if (!operation) return;
    const url = Platform.select({
      ios: `maps:?q=${encodeURIComponent(operation.direccion)}`,
      android: `geo:0,0?q=${encodeURIComponent(operation.direccion)}`,
    });
    if (url) Linking.openURL(url).catch(() => {
      Linking.openURL(`https://maps.google.com/?q=${encodeURIComponent(operation.direccion)}`);
    });
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={GREEN} />
      </View>
    );
  }

  const status = operation?.status ?? null;
  const statusColor = status ? (STATUS_COLORS[status] ?? '#6b7280') : '#6b7280';
  const statusIcon = status ? (STATUS_ICONS[status] ?? 'ellipse-outline') : 'ellipse-outline';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
          <Text style={styles.headerTitle}>Fiber</Text>
          <TouchableOpacity onPress={onLogout} style={styles.logoutBtn} activeOpacity={0.7}>
            <Text style={styles.logoutText}>Salir</Text>
          </TouchableOpacity>
        </View>

        {/* Status bar tipo pill */}
        {operation && (
          <View style={[styles.statusBar, { backgroundColor: statusColor + 'CC' }]}>
            <Ionicons name={statusIcon} size={16} color="#fff" style={styles.statusIcon} />
            <Text style={styles.statusText}>
              {STATUS_LABELS[status ?? ''] ?? status}
            </Text>
          </View>
        )}

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {!operation ? (
            <View style={styles.waiting}>
              <View style={styles.waitingIconCircle}>
                <Ionicons name="hourglass-outline" size={40} color={GREEN} />
              </View>
              <Text style={styles.waitingTitle}>Esperando asignación</Text>
              <Text style={styles.waitingSubtitle}>
                El coordinador te va a asignar una operación cuando haya una disponible.
              </Text>
            </View>
          ) : (
            <>
              {/* Tarjeta blanca flotante (igual que Login) */}
              <View style={styles.card}>
                <Text style={styles.opNumber}>
                  Operación #{operation.id.slice(-3).toUpperCase()}
                </Text>

                <View style={styles.fieldGroup}>
                  <View style={styles.fieldLabelRow}>
                    <Ionicons name="location-outline" size={13} color="#9ca3af" />
                    <Text style={styles.fieldLabel}>DIRECCIÓN</Text>
                  </View>
                  <Text style={styles.fieldValue}>{operation.direccion}</Text>
                  {operation.notas ? (
                    <Text style={styles.fieldNote}>{operation.notas}</Text>
                  ) : null}
                </View>

                <View style={styles.divider} />

                <View style={styles.fieldGroup}>
                  <View style={styles.fieldLabelRow}>
                    <Ionicons name="person-outline" size={13} color="#9ca3af" />
                    <Text style={styles.fieldLabel}>CON QUIÉN HABLAR</Text>
                  </View>
                  <Text style={styles.fieldValue}>{operation.contacto}</Text>
                  {operation.telefono ? (
                    <TouchableOpacity
                      style={styles.phoneLinkRow}
                      onPress={() => Linking.openURL(`tel:${operation.telefono}`)}
                    >
                      <Ionicons name="call-outline" size={14} color="#185FA5" />
                      <Text style={styles.phoneLink}>{operation.telefono}</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>

                <View style={styles.divider} />

                <View style={styles.fieldGroup}>
                  <View style={styles.fieldLabelRow}>
                    <Ionicons name="cash-outline" size={13} color="#9ca3af" />
                    <Text style={styles.fieldLabel}>MONTO A RECIBIR/ENTREGAR</Text>
                  </View>
                  <View style={styles.montoRow}>
                    <Text style={styles.montoValue}>{formatMonto(operation)}</Text>
                    {!['cerrada', 'cancelada'].includes(status ?? '') && (
                      <TouchableOpacity
                        style={styles.modifyBtn}
                        onPress={() => {
                          setNewMonto(String(operation.monto));
                          setShowAmountModal(true);
                        }}
                      >
                        <Ionicons name="create-outline" size={14} color="#374151" />
                        <Text style={styles.modifyBtnText}>Modificar</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>

              {/* Botones de acción (mismo estilo que Login) */}
              <View style={styles.actions}>
                {['asignada', 'en_camino'].includes(status ?? '') && (
                  <TouchableOpacity style={styles.mapsBtn} onPress={openMaps} activeOpacity={0.8}>
                    <Ionicons name="navigate-outline" size={18} color="#374151" />
                    <Text style={styles.mapsBtnText}>Ver ruta más corta</Text>
                  </TouchableOpacity>
                )}

                {status === 'asignada' && (
                  <TouchableOpacity
                    style={[styles.primaryBtn, busy && styles.btnDisabled]}
                    onPress={() => doTransition('en_camino')}
                    disabled={busy}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="walk-outline" size={20} color="#fff" />
                    <Text style={styles.primaryBtnText}>Salgo para el lugar</Text>
                  </TouchableOpacity>
                )}

                {status === 'en_camino' && (
                  <TouchableOpacity
                    style={[styles.primaryBtn, busy && styles.btnDisabled]}
                    onPress={() => doTransition('en_destino')}
                    disabled={busy}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="location" size={20} color="#fff" />
                    <Text style={styles.primaryBtnText}>Llegué al destino</Text>
                  </TouchableOpacity>
                )}

                {status === 'en_destino' && (
                  <TouchableOpacity
                    style={[styles.primaryBtn, busy && styles.btnDisabled]}
                    onPress={() => doTransition('volviendo')}
                    disabled={busy}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                    <Text style={styles.primaryBtnText}>Operación realizada</Text>
                  </TouchableOpacity>
                )}

                {status === 'volviendo' && (
                  <TouchableOpacity
                    style={[styles.primaryBtn, busy && styles.btnDisabled]}
                    onPress={() => doTransition('cerrada')}
                    disabled={busy}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="home-outline" size={20} color="#fff" />
                    <Text style={styles.primaryBtnText}>Estoy en la base</Text>
                  </TouchableOpacity>
                )}

                {['asignada', 'en_camino', 'en_destino'].includes(status ?? '') && (
                  <TouchableOpacity
                    style={styles.incidentBtn}
                    onPress={() => setShowIncidentModal(true)}
                    disabled={busy}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="warning-outline" size={18} color="#993C1D" />
                    <Text style={styles.incidentBtnText}>Incidencia</Text>
                  </TouchableOpacity>
                )}
              </View>
            </>
          )}
        </ScrollView>

        {/* Modales (sin cambios) */}
        <Modal visible={showAmountModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modal}>
              <Text style={styles.modalTitle}>Modificar monto</Text>
              <Text style={styles.modalSubtitle}>El monto anterior queda registrado.</Text>
              <TextInput
                style={styles.modalInput}
                value={newMonto}
                onChangeText={setNewMonto}
                keyboardType="numeric"
                placeholder="Nuevo monto"
                autoFocus
              />
              <TouchableOpacity
                style={[styles.primaryBtn, busy && styles.btnDisabled]}
                onPress={doModifyAmount}
                disabled={busy}
              >
                <Text style={styles.primaryBtnText}>Confirmar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setShowAmountModal(false)}
              >
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <Modal visible={showIncidentModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modal}>
              <Text style={styles.modalTitle}>Reportar incidencia</Text>
              <Text style={styles.modalSubtitle}>Describí el problema para que el coordinador pueda ayudarte.</Text>
              <TextInput
                style={[styles.modalInput, styles.textArea]}
                value={incidentDesc}
                onChangeText={setIncidentDesc}
                placeholder="¿Qué pasó? (mínimo 10 caracteres)"
                multiline
                numberOfLines={4}
                autoFocus
              />
              <TouchableOpacity
                style={[styles.incidentBtn, styles.incidentBtnFilled, busy && styles.btnDisabled]}
                onPress={doReportIncident}
                disabled={busy}
              >
                <Text style={styles.incidentBtnFilledText}>Reportar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setShowIncidentModal(false)}
              >
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 54 : 40,
    paddingBottom: 8,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  logoutText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    fontWeight: '600',
  },
  statusBar: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginHorizontal: 24,
    borderRadius: 20,
    marginBottom: 12,
  },
  statusIcon: { marginRight: 2 },
  statusText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    gap: 16,
  },
  waiting: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  waitingIconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(255,255,255,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  waitingTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  waitingSubtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  opNumber: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 16,
    fontWeight: '600',
  },
  fieldGroup: { marginBottom: 4 },
  fieldLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 4,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9ca3af',
    letterSpacing: 0.5,
  },
  fieldValue: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1a1a1a',
    lineHeight: 24,
  },
  fieldNote: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  phoneLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 4,
  },
  phoneLink: {
    fontSize: 15,
    color: '#185FA5',
    textDecorationLine: 'underline',
  },
  divider: {
    height: 1,
    backgroundColor: '#EAEAEA',
    marginVertical: 12,
  },
  montoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  montoValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
    flex: 1,
  },
  modifyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  modifyBtnText: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '600',
  },
  actions: {
    gap: 10,
  },
  mapsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#EAEAEA',
    paddingVertical: 14,
    minHeight: 52,
  },
  mapsBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#1D9E75',
    borderRadius: 14,
    paddingVertical: 16,
    minHeight: 56,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  incidentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#993C1D',
    paddingVertical: 14,
    minHeight: 52,
  },
  incidentBtnText: {
    color: '#993C1D',
    fontSize: 16,
    fontWeight: '700',
  },
  incidentBtnFilled: {
    backgroundColor: '#993C1D',
  },
  incidentBtnFilledText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  btnDisabled: { opacity: 0.5 },
  cancelBtn: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#6b7280',
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    gap: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    backgroundColor: '#f9fafb',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
});