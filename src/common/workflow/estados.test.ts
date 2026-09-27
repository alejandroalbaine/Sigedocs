import { describe, expect, it } from 'vitest';
import {
  contarPorGrupo,
  ESTADOS_UNDERGRAD,
  grupoDeEstado,
  segmentosDona,
  tonoDeEstado,
} from './estados.ts';

describe('estados del flujo UNDERGRAD', () => {
  it('incluye exactamente los 11 estados de ADR-014', () => {
    expect(Object.keys(ESTADOS_UNDERGRAD)).toHaveLength(11);
  });

  it('asigna cada estado a un solo grupo, igual en todas las pantallas', () => {
    expect(grupoDeEstado('RECEIVED')).toBe('recepcion');
    expect(grupoDeEstado('IN_REEVALUATION')).toBe('revision');
    expect(grupoDeEstado('CHANGES_REQUIRED')).toBe('ajustes');
    expect(grupoDeEstado('APPROVED_FOR_PILOT')).toBe('aprobacion');
    expect(grupoDeEstado('ARCHIVED_IMPLEMENTED')).toBe('cierre');
  });

  it('no cuenta "Aprobado para pilotaje" como definitivo', () => {
    expect(grupoDeEstado('APPROVED_FOR_PILOT')).not.toBe('cierre');
  });

  it('manda los códigos desconocidos a "otros" sin fallar', () => {
    expect(grupoDeEstado('ESTADO_NUEVO')).toBe('otros');
    expect(tonoDeEstado('ESTADO_NUEVO')).toBe('neutral');
  });

  it('cuenta por grupo y la suma coincide con el total', () => {
    const conteo = contarPorGrupo(['RECEIVED', 'IN_REVIEW', 'FINAL', 'X', 'ASSIGNED']);
    expect(conteo).toMatchObject({ recepcion: 2, revision: 1, cierre: 1, otros: 1 });
    expect(Object.values(conteo).reduce((a, b) => a + b, 0)).toBe(5);
  });

  it('calcula la dona proporcional a los datos', () => {
    const dona = segmentosDona(contarPorGrupo(['RECEIVED', 'FINAL']));
    expect(dona).toBe('var(--state-reception) 0.00% 50.00%, var(--state-final) 50.00% 100.00%');
    expect(segmentosDona(contarPorGrupo([]))).toBe('var(--state-empty) 0 100%');
  });
});
