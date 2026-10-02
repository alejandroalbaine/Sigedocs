import { useEffect, useState } from 'react';
import { Alert, Button, Field } from '../../common/components/index.ts';
import { errorMessage } from '../../common/api/errors.ts';
import { localIsoDate } from '../../common/utils/format.ts';
import type { ExpedienteResumen, SeccionPlantilla, VersionExpediente } from '../dossiers/dossiersService.ts';
import { observacionesService } from './observacionesService.ts';
import {
  MAXIMO_TEXTO_OBSERVACION,
  validarObservacion,
  type ErroresObservacion,
  type NuevaObservacion,
} from './types.ts';
import styles from './observaciones.module.css';

const BORRADOR_VACIO: NuevaObservacion = { versionId: '', texto: '' };

export interface FormularioObservacionProps {
  autor: string;
  expediente: ExpedienteResumen | null;
  /** Se llama tras un alta exitoso para que la pantalla recargue la lista. */
  onRegistrada: () => void;
}

/**
 * Alta de observación contra `POST /api/v1/dossiers/{dossierId}/observations` (B6).
 *
 * El autor y la fecha los fija el servidor a partir de la sesión, de ahí los campos de
 * solo lectura. Las secciones y campos se ofrecen porque el backend rechaza con 422
 * cualquier `sectionKey` o `fieldKey` que no exista en la plantilla de la versión.
 */
export function FormularioObservacion({
  autor,
  expediente,
  onRegistrada,
}: FormularioObservacionProps) {
  const [borrador, setBorrador] = useState<NuevaObservacion>(BORRADOR_VACIO);
  const [versiones, setVersiones] = useState<VersionExpediente[]>([]);
  const [secciones, setSecciones] = useState<SeccionPlantilla[]>([]);
  const [errores, setErrores] = useState<ErroresObservacion>({});
  const [enviando, setEnviando] = useState(false);
  const [fallo, setFallo] = useState('');
  const [exito, setExito] = useState('');

  useEffect(() => {
    if (!expediente) return;
    observacionesService
      .listarVersiones(expediente)
      .then(setVersiones, () => {
        setVersiones([]);
      })
      .then(() => {
        return observacionesService.listarSecciones(expediente);
      })
      .then(setSecciones, () => {
        setSecciones([]);
      });
  }, [expediente]);

  // Al cambiar de expediente el borrador anterior ya no aplica a la versión mostrada.
  // Se ajusta durante el render en lugar de en un efecto para no pintar un borrador
  // de otro expediente antes de corregirlo.
  const [expedienteDelBorrador, setExpedienteDelBorrador] = useState<string | null>(null);
  if (expedienteDelBorrador !== (expediente?.dossierId ?? null)) {
    setExpedienteDelBorrador(expediente?.dossierId ?? null);
    setBorrador(BORRADOR_VACIO);
    setErrores({});
    setFallo('');
    setExito('');
  }

  const sinVersiones = !expediente || versiones.length === 0;
  const seccionElegida = secciones.find((seccion) => seccion.key === borrador.seccion);
  const longitud = borrador.texto.trim().length;

  async function registrar(): Promise<void> {
    if (!expediente) {
      setFallo('Seleccione un expediente antes de registrar la observación.');
      return;
    }
    const encontrados = validarObservacion(borrador);
    setErrores(encontrados);
    setFallo('');
    setExito('');
    if (Object.keys(encontrados).length > 0) return;

    setEnviando(true);
    try {
      await observacionesService.registrar(expediente, borrador);
      setBorrador(BORRADOR_VACIO);
      setExito('Observación registrada correctamente.');
      onRegistrada();
    } catch (motivo: unknown) {
      setFallo(errorMessage(motivo, 'No fue posible registrar la observación.'));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form
      className={styles.form}
      noValidate
      onSubmit={(evento) => {
        evento.preventDefault();
        void registrar();
      }}
    >
      <Field
        label="Versión observada"
        help={
          sinVersiones
            ? 'No hay versiones en revisión o reevaluación sobre las que observar.'
            : 'Solo se pueden observar versiones en revisión o reevaluación.'
        }
      >
        {(control) => (
          <select
            {...control}
            value={borrador.versionId}
            disabled={sinVersiones || enviando}
            aria-invalid={Boolean(errores.versionId) || undefined}
            onChange={(event) => { setBorrador((actual) => ({ ...actual, versionId: event.target.value })); }
            }
          >
            <option value="">
              {sinVersiones ? 'Sin versiones disponibles' : 'Seleccione una versión…'}
            </option>
            {versiones.map((version) => (
              <option key={version.versionId} value={version.versionId}>
                {version.label} · {version.stateName}
              </option>
            ))}
          </select>
        )}
      </Field>
      {errores.versionId && <small className={styles.error}>{errores.versionId}</small>}

      <Field
        label="Sección observada"
        help="Opcional. El servidor solo admite secciones de la plantilla de la versión."
      >
        {(control) => (
          <select
            {...control}
            value={borrador.seccion ?? ''}
            disabled={enviando}
            onChange={(event) => { setBorrador((actual) => ({
                ...actual,
                seccion: event.target.value || undefined,
                campo: undefined,
                itemId: undefined,
              })); }
            }
          >
            <option value="">Sin sección específica</option>
            {secciones.map((seccion) => (
              <option key={seccion.key} value={seccion.key}>
                {seccion.titulo}
              </option>
            ))}
          </select>
        )}
      </Field>

      {seccionElegida && seccionElegida.campos.length > 0 && (
        <Field label="Campo observado" help="Opcional. Acota la observación a un campo.">
          {(control) => (
            <select
              {...control}
              value={borrador.campo ?? ''}
              disabled={enviando}
              aria-invalid={Boolean(errores.campo) || undefined}
              onChange={(event) => { setBorrador((actual) => ({
                  ...actual,
                  campo: event.target.value || undefined,
                  itemId: undefined,
                })); }
              }
            >
              <option value="">Sin campo específico</option>
              {seccionElegida.campos.map((campo) => (
                <option key={campo.key} value={campo.key}>
                  {campo.label}
                </option>
              ))}
            </select>
          )}
        </Field>
      )}

      <Field
        label="Descripción de la observación"
        help={`Entre 1 y ${MAXIMO_TEXTO_OBSERVACION} caracteres. Actual: ${longitud}.`}
      >
        {(control) => (
          <textarea
            {...control}
            rows={5}
            value={borrador.texto}
            disabled={enviando}
            aria-invalid={Boolean(errores.texto) || undefined}
            placeholder="Describa la observación encontrada en el expediente…"
            onChange={(event) => { setBorrador((actual) => ({ ...actual, texto: event.target.value })); }
            }
          />
        )}
      </Field>
      {errores.texto && <small className={styles.error}>{errores.texto}</small>}

      <div className={styles.row}>
        <Field label="Registrado por" help="Lo asigna el servidor según la sesión.">
          {(control) => <input {...control} type="text" value={autor} readOnly />}
        </Field>
        <Field label="Fecha" help="Lo asigna el servidor al registrar.">
          {(control) => <input {...control} type="date" value={localIsoDate()} readOnly />}
        </Field>
      </div>

      {fallo && <Alert kind="error">{fallo}</Alert>}
      {exito && <Alert kind="success">{exito}</Alert>}

      <div className={styles.actions}>
        <Button
          type="button"
          variant="quiet"
          size="sm"
          disabled={enviando}
          onClick={() => {
            setBorrador(BORRADOR_VACIO);
            setErrores({});
            setFallo('');
            setExito('');
          }}
        >
          Limpiar
        </Button>
        <Button type="submit" size="sm" loading={enviando} disabled={sinVersiones}>
          Registrar observación
        </Button>
      </div>
    </form>
  );
}
