import { useEffect, useMemo, useState } from 'react';
import { RequirePermission } from '../../common/auth/RequirePermission.tsx';
import { useCurrentUser } from '../../common/auth/SessionContext.ts';
import { Card, Field, PageHeader, Alert } from '../../common/components/index.ts';
import type {
  ExpedienteResumen,
  VersionExpediente,
} from '../../features/dossiers/dossiersService.ts';
import { FormularioObservacion } from '../../features/observaciones/FormularioObservacion.tsx';
import { ListaObservaciones } from '../../features/observaciones/ListaObservaciones.tsx';
import { observacionesService } from '../../features/observaciones/observacionesService.ts';
import { useObservaciones } from '../../features/observaciones/useObservaciones.ts';
import {
  FILTROS_OBSERVACION_VACIOS,
  filtrarPorFecha,
  type FiltrosObservacion,
} from '../../features/observaciones/types.ts';
import layout from '../layout/page.module.css';
import styles from './observacionesPage.module.css';

/** Expedientes que admiten observación, con sus versiones observables. */
function useExpedientes(): {
  expedientes: ExpedienteResumen[];
  versionesPorExpediente: Map<string, VersionExpediente[]>;
  cargando: boolean;
} {
  const [expedientes, setExpedientes] = useState<ExpedienteResumen[]>([]);
  const [versionesPorExpediente, setVersionesPorExpediente] = useState<
    Map<string, VersionExpediente[]>
  >(new Map());
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let vigente = true;
    const listo = () => {
      if (vigente) setCargando(false);
    };
    observacionesService
      .listarExpedientes()
      .then(async (datos) => {
        const entradas = await Promise.all(
          datos.map(async (expediente) => {
            const versiones = await observacionesService.listarVersiones(expediente);
            return [expediente.dossierId, versiones] as const;
          }),
        );
        if (!vigente) return;
        setExpedientes(datos);
        setVersionesPorExpediente(new Map(entradas));
      })
      .catch(() => {
        // Si no se pueden cargar, el selector queda vacío y el formulario explica por qué.
        if (vigente) setExpedientes([]);
      })
      .finally(listo);
    return () => {
      vigente = false;
    };
  }, []);

  return { expedientes, versionesPorExpediente, cargando };
}

function Observaciones() {
  const user = useCurrentUser();
  const { expedientes, versionesPorExpediente, cargando: cargandoExpedientes } = useExpedientes();
  /** Vacío significa «todavía no se ha elegido», y entonces se observa el primero. */
  const [elegido, setElegido] = useState('');
  const [filtros, setFiltros] = useState<FiltrosObservacion>(FILTROS_OBSERVACION_VACIOS);

  // Derivar el expediente inicial evita un efecto que solo hace un setState.
  const expedienteId = elegido || expedientes[0]?.dossierId || '';
  const expediente = useMemo(
    () => expedientes.find((item) => item.dossierId === expedienteId) ?? null,
    [expedientes, expedienteId],
  );

  const versiones = expediente ? (versionesPorExpediente.get(expediente.dossierId) ?? []) : [];

  /**
   * El filtro de versión pertenece al expediente anterior, así que al cambiar de
   * expediente se reinicia en el mismo manejador en lugar de en un efecto.
   */
  function elegirExpediente(valor: string): void {
    setElegido(valor);
    setFiltros((actual) => ({ ...actual, versionId: '' }));
  }

  const { observaciones, cargando, error, recargar } = useObservaciones(
    expediente,
    observacionesService,
    filtros.versionId || undefined,
  );

  const visibles = useMemo(() => filtrarPorFecha(observaciones, filtros), [observaciones, filtros]);

  return (
    <>
      <Card
        title="Nueva observación"
        description="Solo se admiten versiones en revisión o reevaluación. El registro es inmutable."
      >
        <Field label="Expediente relacionado">
          {(control) => (
            <select
              {...control}
              value={expedienteId}
              disabled={cargandoExpedientes || expedientes.length === 0}
              onChange={(event) => {
                elegirExpediente(event.target.value);
              }}
            >
              {expedientes.length === 0 && (
                <option value="">
                  {cargandoExpedientes ? 'Cargando expedientes…' : 'Sin expedientes disponibles'}
                </option>
              )}
              {expedientes.map((item) => (
                <option key={item.dossierId} value={item.dossierId}>
                  {item.code} — {item.title}
                </option>
              ))}
            </select>
          )}
        </Field>
        <FormularioObservacion autor={user.name} expediente={expediente} onRegistrada={recargar} />
      </Card>

      <Card title="Filtros">
        <div className={styles.filtros}>
          <Field label="Versión">
            {(control) => (
              <select
                {...control}
                value={filtros.versionId}
                disabled={versiones.length === 0}
                onChange={(event) => { setFiltros((actual) => ({ ...actual, versionId: event.target.value })); }
                }
              >
                <option value="">Todas las versiones</option>
                {versiones.map((version) => (
                  <option key={version.versionId} value={version.versionId}>
                    {version.label} · {version.stateName}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <Field label="Desde">
            {(control) => (
              <input
                {...control}
                type="date"
                value={filtros.desde}
                onChange={(event) => { setFiltros((actual) => ({ ...actual, desde: event.target.value })); }
                }
              />
            )}
          </Field>
          <Field label="Hasta">
            {(control) => (
              <input
                {...control}
                type="date"
                value={filtros.hasta}
                onChange={(event) => { setFiltros((actual) => ({ ...actual, hasta: event.target.value })); }
                }
              />
            )}
          </Field>
        </div>
      </Card>

      {!cargandoExpedientes && expedientes.length === 0 && (
        <Alert kind="info">
          No hay expedientes con versiones en revisión o reevaluación donde registrar observaciones.
        </Alert>
      )}

      {expediente && (
        <ListaObservaciones
          observaciones={visibles}
          cargando={cargando}
          error={error}
          recargar={recargar}
          expedienteCodigo={expediente.code}
        />
      )}
    </>
  );
}

export function ObservacionesPage() {
  return (
    <div className={layout.stack}>
      <title>Registro de observaciones | SIGESDOC</title>
      <PageHeader eyebrow="Expedientes" title="Registro de observaciones" />
      <RequirePermission permission="observations.create" action="registrar observaciones">
        <Observaciones />
      </RequirePermission>
    </div>
  );
}
