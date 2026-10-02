import { useEffect, useMemo, useState } from 'react';
import { RequirePermission } from '../../common/auth/RequirePermission.tsx';

import {
  Alert,
  Button,
  Card,
  Field,
  PageHeader,
  Pagination,
  type SortState,
} from '../../common/components/index.ts';
import { totalPages } from '../../common/utils/pagination.ts';
import { dossiersService, type ExpedienteResumen } from '../../features/dossiers/dossiersService.ts';
import {
  FILTROS_AUDITORIA_VACIOS,
  type FiltrosAuditoria,
} from '../../features/trazabilidad/auditContract.ts';
import { useAuditoria } from '../../features/trazabilidad/useAuditoria.ts';
import type { EventoTrazabilidad } from '../../features/trazabilidad/catalogos.ts';
import { filtrarEventos, ordenarEventos } from '../../features/trazabilidad/consulta.ts';
import { DetalleEvento } from '../../features/trazabilidad/DetalleEvento.tsx';
import { FiltrosTrazabilidad as Filtros } from '../../features/trazabilidad/FiltrosTrazabilidad.tsx';
import { TablaEventos } from '../../features/trazabilidad/TablaEventos.tsx';
import styles from '../layout/page.module.css';

const TAMANOS = [10, 20, 50] as const;

/** Expedientes disponibles para auditar. B7 es por expediente, no hay vista global. */
function useExpedientes(): { expedientes: ExpedienteResumen[]; cargando: boolean } {
  const [expedientes, setExpedientes] = useState<ExpedienteResumen[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let vigente = true;
    dossiersService
      .listar()
      .then((datos) => {
        if (vigente) setExpedientes(datos);
      })
      .catch(() => {
        if (vigente) setExpedientes([]);
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });
    return () => {
      vigente = false;
    };
  }, []);

  return { expedientes, cargando };
}

/**
 * Traduce los filtros del flujo curricular a los del contrato B7. El backend solo
 * entiende `type`, `from` y `to`; expediente, usuario y texto libre se resuelven en la
 * interfaz sobre los eventos ya servidos.
 */
function aFiltrosAuditoria(filtros: { tipoEvento: string; desde: string; hasta: string }): FiltrosAuditoria {
  return {
    ...FILTROS_AUDITORIA_VACIOS,
    type: filtros.tipoEvento,
    from: filtros.desde,
    to: filtros.hasta,
  };
}

function Historial() {
  const { expedientes, cargando: cargandoExpedientes } = useExpedientes();
  /** Vacío significa «todavía no se ha elegido», y entonces se audita el primero. */
  const [elegido, setElegido] = useState('');
  const [texto, setTexto] = useState({ expediente: '', usuario: '', texto: '' });
  const [orden, setOrden] = useState<SortState>({ key: 'fecha', direction: 'desc' });
  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState<number>(20);
  const [seleccionado, setSeleccionado] = useState<EventoTrazabilidad | null>(null);

  // Derivar el expediente inicial evita un efecto que solo hace un setState.
  const expedienteId = elegido || expedientes[0]?.dossierId || '';
  const expediente = useMemo(
    () => expedientes.find((item) => item.dossierId === expedienteId) ?? null,
    [expedientes, expedienteId],
  );

  const contexto = useMemo(
    () =>
      expediente
        ? { dossierId: expediente.dossierId, codigo: expediente.code, titulo: expediente.title }
        : null,
    [expediente],
  );

  const { eventos, cargando, error, aplicar, recargar } = useAuditoria(contexto);

  // Los filtros de `type`, `from` y `to` ya los aplicó el servicio al pedir los eventos;
  // aquí quedan los que el contrato no expone (expediente, usuario, estado y texto).
  const resultado = useMemo(
    () =>
      ordenarEventos(
        filtrarEventos(eventos, {
          ...texto,
          tipoEvento: '',
          desde: '',
          hasta: '',
        }),
        orden,
      ),
    [eventos, texto, orden],
  );
  const paginaActual = Math.min(pagina, totalPages(resultado.length, porPagina));
  const visibles = resultado.slice((paginaActual - 1) * porPagina, paginaActual * porPagina);
  // Sin expediente elegido todavía no hay nada que auditar: mostrar una tabla vacía
  // sugeriría que el expediente no tiene eventos.
  const sinExpedientes = !cargandoExpedientes && expedientes.length === 0;
  const consultar = contexto !== null;

  return (
    <>
      <Card title="Expediente auditado">
        <Field
          label="Expediente"
          help="La trazabilidad se consulta expediente por expediente."
        >
          {(control) => (
            <select
              {...control}
              value={expedienteId}
              disabled={cargandoExpedientes || expedientes.length === 0}
              onChange={(event) => {
                setElegido(event.target.value);
                setPagina(1);
                setTexto({ expediente: '', usuario: '', texto: '' });
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
      </Card>

      <Card title="Filtros y búsqueda">
        <Filtros
          onAplicar={(siguientes) => {
            aplicar(aFiltrosAuditoria(siguientes));
            setTexto({
              expediente: siguientes.expediente,
              usuario: siguientes.usuario,
              texto: siguientes.texto,
            });
            setPagina(1);
          }}
        />
      </Card>

      <Card
        title="Eventos"
        description="Usuario, fecha, acción, versión y el resumen que dejó el servidor."
        actions={
          <Button variant="text" size="sm" onClick={recargar}>
            Actualizar
          </Button>
        }
      >
        {cargando && <p className={styles.nota}>Cargando eventos de trazabilidad…</p>}

        {!cargando && error && (
          <div className={styles.errorBloque}>
            <Alert kind="error">{error}</Alert>
            <Button variant="secondary" size="sm" onClick={recargar}>
              Reintentar
            </Button>
          </div>
        )}

        {!cargando && !error && sinExpedientes && (
          <Alert kind="info">No hay expedientes disponibles para auditar.</Alert>
        )}

        {!cargando && !error && consultar && (
          <TablaEventos
            eventos={visibles}
            orden={orden}
            onOrdenar={(columna) => {
              setOrden((actual) => ({
                key: columna,
                direction: actual.key === columna && actual.direction === 'desc' ? 'asc' : 'desc',
              }));
            }}
            onVerDetalle={setSeleccionado}
          />
        )}

        {consultar && (
          <Pagination
            page={paginaActual}
            pageSize={porPagina}
            total={resultado.length}
            itemLabel="eventos"
            onPageChange={setPagina}
            pageSizeOptions={TAMANOS}
            onPageSizeChange={(tamano: number) => {
              setPorPagina(tamano);
              setPagina(1);
            }}
          />
        )}
      </Card>

      <DetalleEvento
        evento={seleccionado}
        onCerrar={() => {
          setSeleccionado(null);
        }}
      />
    </>
  );
}

export function HistorialPage() {
  return (
    <div className={styles.stack}>
      <title>Historial y trazabilidad | SIGESDOC</title>
      <PageHeader
        eyebrow="Auditoría"
        title="Historial y trazabilidad"
        description="Cronología auditable de las acciones sobre los expedientes curriculares."
      />
      <RequirePermission permission="audit.read" action="consultar la trazabilidad">
        <Historial />
      </RequirePermission>
    </div>
  );
}
