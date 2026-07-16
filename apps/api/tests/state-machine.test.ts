import { describe, it, expect } from 'vitest';
import { VALID_TRANSITIONS, EDITABLE_STATUSES, CANCELLABLE_STATUSES } from '@cambioapp/shared-constants';

describe('Operation State Machine', () => {
  it('pendiente → asignada is valid', () => {
    expect(VALID_TRANSITIONS['pendiente']).toContain('asignada');
  });

  it('pendiente → cancelada is valid', () => {
    expect(VALID_TRANSITIONS['pendiente']).toContain('cancelada');
  });

  it('asignada → en_camino is valid', () => {
    expect(VALID_TRANSITIONS['asignada']).toContain('en_camino');
  });

  it('cerrada → en_camino is invalid', () => {
    expect(VALID_TRANSITIONS['cerrada']).not.toContain('en_camino');
  });

  it('cerrada has no valid next states', () => {
    expect(VALID_TRANSITIONS['cerrada']).toHaveLength(0);
  });

  it('cancelada has no valid next states', () => {
    expect(VALID_TRANSITIONS['cancelada']).toHaveLength(0);
  });

  it('en_camino → cerrada is NOT valid (must go to en_destino first)', () => {
    expect(VALID_TRANSITIONS['en_camino']).not.toContain('cerrada');
  });

  it('volviendo → cerrada is valid', () => {
    expect(VALID_TRANSITIONS['volviendo']).toContain('cerrada');
  });

  it('incidencia can return to en_camino', () => {
    expect(VALID_TRANSITIONS['incidencia']).toContain('en_camino');
  });
});

describe('Editable/Cancellable statuses', () => {
  it('pendiente is editable', () => {
    expect(EDITABLE_STATUSES).toContain('pendiente');
  });

  it('asignada is editable', () => {
    expect(EDITABLE_STATUSES).toContain('asignada');
  });

  it('en_camino is NOT editable', () => {
    expect(EDITABLE_STATUSES).not.toContain('en_camino');
  });

  it('cerrada is NOT editable', () => {
    expect(EDITABLE_STATUSES).not.toContain('cerrada');
  });

  it('pendiente is cancellable', () => {
    expect(CANCELLABLE_STATUSES).toContain('pendiente');
  });

  it('en_camino is NOT cancellable', () => {
    expect(CANCELLABLE_STATUSES).not.toContain('en_camino');
  });
});
