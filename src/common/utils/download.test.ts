import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { downloadCsv, downloadJson } from './download.ts';

describe('descargas locales', () => {
  const createObjectUrl = vi.fn(() => 'blob:sigesdoc-report');
  const revokeObjectUrl = vi.fn();
  const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);

  beforeEach(() => {
    vi.stubGlobal('URL', {
      createObjectURL: createObjectUrl,
      revokeObjectURL: revokeObjectUrl,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  test('genera y activa la descarga de un reporte CSV', () => {
    downloadCsv('reporte.csv', ['Código', 'Título'], [['ECD-1', 'Programa "A"']]);

    expect(createObjectUrl).toHaveBeenCalledOnce();
    expect(click).toHaveBeenCalledOnce();
  });

  test('genera y activa la descarga de tokens JSON', () => {
    downloadJson('tokens.json', { navy: '#001b44' });

    expect(createObjectUrl).toHaveBeenCalledOnce();
    expect(click).toHaveBeenCalledOnce();
  });
});
