import { useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router';
import {
  ClipboardCheck,
  FileText,
  GitBranch,
  History,
  Info,
  Layers,
  MessageSquareText,
  Printer,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import { dossiersApi } from '../../common/api/dossiers.ts';
import type { Dossier, TransitionResult } from '../../common/api/dossierContract.ts';
import { useRecurso, type Recurso } from '../../common/api/useRecurso.ts';
import { RequirePermission } from '../../common/auth/RequirePermission.tsx';
import { useCurrentUser } from '../../common/auth/SessionContext.ts';
import { hasPermission } from '../../common/auth/permissions.ts';
import { Alert, EmptyState } from '../../common/components/index.ts';
import {
  admiteDecisionTecnica,
  ESTADOS_UNDERGRAD,
  ORDEN_UNDERGRAD,
  proximaAccion,
} from '../../common/workflow/estados.ts';
import { FormularioObservacion } from '../../features/observaciones/FormularioObservacion.tsx';
import { FormularioPrograma } from '../../features/programa/FormularioPrograma.tsx';
import { AccionesFlujo } from '../../features/revision/AccionesFlujo.tsx';
import { AsignacionExpediente } from '../../features/revision/AsignacionExpediente.tsx';
import { ChecklistRevision } from '../../features/revision/ChecklistRevision.tsx';
import { DecisionRevision } from '../../features/revision/DecisionRevision.tsx';
import {
  CRITERIOS,
  OPCIONES_RESULTADO,
  resultadosIniciales,
  resumirChecklist,
  type ResultadoCriterio,
} from '../../features/revision/reglas.ts';
import { claseEstado } from '../documental/estadoBadge.ts';
import { useDossiers } from '../documental/useDossiers.ts';
import styles from './RevisionPage.module.css';

/** Las siete pestañas del expediente definidas en el Informe T1 §3.7. */
const tabs = [
  { id: 'resumen', label: 'Resumen y metadatos', icon: Info },
  { id: 'contenido', label: 'Contenido y archivos', icon: FileText },
  { id: 'checklist', label: 'Revisión y checklist', icon: ClipboardCheck },
  { id: 'observaciones', label: 'Observaciones', icon: MessageSquareText },
  { id: 'versiones', label: 'Versiones', icon: Layers },
  { id: 'workflow', label: 'Workflow', icon: GitBranch },
  { id: 'historial', label: 'Historial y auditoría', icon: History },
] as const;

type TabId = (typeof tabs)[number]['id'];

const NIVELES: Record<Dossier['academicLevel'], string> = {
  associate: 'Técnico superior',
  bachelor: 'Grado',
};

const fecha = (valor: string) => new Date(valor).toLocaleString('es-DO');

function InfoPanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className={styles.infoPanel}>
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function Pendiente({ children }: { children: ReactNode }) {
  return (
    <p className={styles.pendingNote}>
      <Info size={15} /> {children}
    </p>
  );
}

/** Estados de carga comunes a las pestañas que consultan el servidor. */
function EstadoRecurso<T>({
  recurso,
  modulo,
  children,
}: {
  recurso: Recurso<T>;
  /** Qué se consulta, en lenguaje del usuario (p. ej. «El historial de versiones»). */
  modulo: string;
  children: (data: T) => ReactNode;
}) {
  if (recurso.loading) return <p className={styles.loading}>Consultando…</p>;
  if (recurso.pendiente) {
    return (
      <Pendiente>
        {modulo} está en preparación y aparecerá aquí en cuanto esté disponible.
      </Pendiente>
    );
  }
  if (recurso.error) return <Alert kind="error">{recurso.error}</Alert>;
  return recurso.data === null ? null : <>{children(recurso.data)}</>;
}

function Expediente({ dossier, onCambio }: { dossier: Dossier; onCambio: () => void }) {
  const user = useCurrentUser();
  const [activeTab, setActiveTab] = useState<TabId>('resumen');
  const [resultados, setResultados] = useState<ResultadoCriterio[]>(resultadosIniciales);
  const [ultimo, setUltimo] = useState<TransitionResult | null>(null);
  const id = dossier.dossierId;
  const puedeDevolver = hasPermission(user.permissions, 'workflow.request_changes');
  const puedeAprobar = hasPermission(user.permissions, 'workflow.approve_for_pilot');
  const puedeAsignar = hasPermission(user.permissions, 'workflow.assign');
  const puedeObservar = hasPermission(user.permissions, 'observations.create');
  const puedeEditar = hasPermission(user.permissions, 'dossiers.edit');
  const decisionHabilitada = admiteDecisionTecnica(dossier.currentState.code);
  const { evaluados, total } = resumirChecklist(resultados);
  const responsable = dossier.assignedSpecialist?.name ?? 'Sin asignar';
  const clave = `${id}:${dossier.currentState.code}:${dossier.currentVersion.versionId}`;

  const transiciones = useRecurso(() => dossiersApi.availableTransitions(id), [clave]);
  const versiones = useRecurso(activeTab === 'versiones' ? () => dossiersApi.versions(id) : null, [
    clave,
    activeTab,
  ]);
  const observaciones = useRecurso(
    activeTab === 'observaciones'
      ? () => dossiersApi.observations(id, dossier.currentVersion.versionId)
      : null,
    [clave, activeTab],
  );
  const historial = useRecurso(activeTab === 'historial' ? () => dossiersApi.history(id) : null, [
    clave,
    activeTab,
  ]);

  function transicionRealizada(resultado: TransitionResult) {
    setUltimo(resultado);
    setResultados(resultadosIniciales());
    onCambio();
  }

  return (
    <div className={styles.page}>
      <div className={styles.breadcrumb}>
        <Link to="/expedientes">Gestión documental</Link> &nbsp; / &nbsp;{' '}
        <strong>{dossier.code}</strong> &nbsp; / &nbsp; <b>Detalle y revisión</b>
      </div>

      {ultimo && (
        <Alert kind="success">
          Transición registrada: {ultimo.fromState.name} → {ultimo.toState.name}
          {ultimo.newVersionId ? '. Se creó una nueva versión del expediente.' : '.'}
        </Alert>
      )}

      <section className={styles.hero}>
        <div className={styles.heroTitle}>
          <span className={styles.code}>{dossier.code}</span>
          <small>Programa de asignatura · {dossier.subjectCode}</small>
          <h1>{dossier.title}</h1>
          <dl className={styles.context} aria-label="Contexto del expediente">
            <div>
              <dt>Estado curricular</dt>
              <dd>
                <span className={claseEstado(dossier.currentState.code)}>
                  {dossier.currentState.name}
                </span>
              </dd>
            </div>
            <div>
              <dt>Versión</dt>
              <dd>{dossier.currentVersion.label}</dd>
            </div>
            <div>
              <dt>Responsable</dt>
              <dd>{responsable}</dd>
            </div>
            <div>
              <dt>Próxima acción</dt>
              <dd>{proximaAccion(dossier.currentState.code)}</dd>
            </div>
          </dl>
        </div>
        <div className={styles.heroActions}>
          <button
            type="button"
            onClick={() => {
              window.print();
            }}
          >
            <Printer size={16} /> Imprimir hoja de control
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('historial');
            }}
          >
            <History size={16} /> Ver historial
          </button>
        </div>
      </section>

      <nav className={styles.tabs} aria-label="Secciones del expediente">
        {tabs.map((tab, index) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              className={activeTab === tab.id ? styles.active : ''}
              aria-current={activeTab === tab.id ? 'page' : undefined}
              onClick={() => {
                setActiveTab(tab.id);
              }}
            >
              <Icon size={16} /> {index + 1}. {tab.label}
            </button>
          );
        })}
      </nav>

      <div className={styles.workspace}>
        <div>
          {activeTab === 'resumen' && (
            <InfoPanel title="Resumen y metadatos">
              <dl className={styles.metadataGrid}>
                {(
                  [
                    ['Código', dossier.code],
                    ['Nivel académico', NIVELES[dossier.academicLevel]],
                    ['Unidad académica', dossier.schoolCode],
                    ['Programa', dossier.degreeProgramCode],
                    ['Asignatura', dossier.subjectCode],
                    ['Estado curricular', dossier.currentState.name],
                    ['Versión vigente', dossier.currentVersion.label],
                    ['Especialista asignado', responsable],
                    ['Registrado por', dossier.createdBy.name],
                    ['Fecha de registro', fecha(dossier.createdAt)],
                  ] as const
                ).map(([label, value]) => (
                  <div key={label}>
                    <dt>{label}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
            </InfoPanel>
          )}

          {activeTab === 'contenido' && (
            <InfoPanel title="Contenido del programa de asignatura">
              <FormularioPrograma
                key={clave}
                dossier={dossier}
                editable={dossier.currentState.isEditable && puedeEditar}
              />
              <Pendiente>
                La carga de archivos adjuntos al expediente estará disponible en una etapa
                posterior.
              </Pendiente>
            </InfoPanel>
          )}

          {activeTab === 'checklist' && (
            <InfoPanel title="Revisión y checklist">
              <p className={styles.lead}>
                Cada criterio se contrasta con su documento maestro. Un criterio obligatorio en
                &quot;No cumple&quot; bloquea la aprobación.
              </p>
              <table className={styles.criteriaTable}>
                <thead>
                  <tr>
                    <th>Criterio</th>
                    <th>Documento maestro</th>
                    <th>Resultado</th>
                  </tr>
                </thead>
                <tbody>
                  {CRITERIOS.map((criterio, index) => (
                    <tr key={criterio.id}>
                      <td>{criterio.texto}</td>
                      <td>{criterio.referencia}</td>
                      <td>
                        {OPCIONES_RESULTADO.find((opcion) => opcion.valor === resultados[index])
                          ?.etiqueta ?? 'Sin evaluar'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <Pendiente>
                El contrato MVP no tiene una ruta propia para los resultados del checklist: se
                guardan dentro de la observación de la decisión, en el historial. La validación
                cruzada automática está diferida (Informe Módulo II, §5.1).
              </Pendiente>
            </InfoPanel>
          )}

          {activeTab === 'observaciones' && (
            <InfoPanel title="Observaciones">
              {puedeObservar && (
                <FormularioObservacion
                  key={clave}
                  dossier={dossier}
                  onRegistrada={observaciones.reload}
                />
              )}
              <h3 className={styles.subheading}>Observaciones de {dossier.currentVersion.label}</h3>
              <EstadoRecurso recurso={observaciones} modulo="La consulta de observaciones">
                {(lista) =>
                  lista.length === 0 ? (
                    <p className={styles.lead}>Sin observaciones registradas en esta versión.</p>
                  ) : (
                    <ol className={styles.timeline}>
                      {lista.map((item) => (
                        <li key={item.observationId}>
                          <strong>{item.text}</strong>
                          <span>
                            {item.createdBy?.name ?? 'Autor no informado'}
                            {item.createdAt ? ` · ${fecha(item.createdAt)}` : ''}
                          </span>
                          {(item.sectionKey ?? item.fieldKey) && (
                            <small>
                              Sección {item.sectionKey ?? '—'} · campo {item.fieldKey ?? '—'}
                            </small>
                          )}
                        </li>
                      ))}
                    </ol>
                  )
                }
              </EstadoRecurso>
            </InfoPanel>
          )}

          {activeTab === 'versiones' && (
            <InfoPanel title="Versiones">
              <EstadoRecurso recurso={versiones} modulo="El historial de versiones">
                {(lista) => (
                  <ol className={styles.timeline}>
                    {lista.map((version) => (
                      <li key={version.versionId}>
                        <strong>
                          {version.label}
                          {version.versionId === dossier.currentVersion.versionId
                            ? ' · versión vigente'
                            : ''}
                        </strong>
                        <span>
                          Estado: {version.state.name} · {version.createdBy.name} ·{' '}
                          {fecha(version.createdAt)}
                        </span>
                        {version.approvedAt && <small>Aprobada {fecha(version.approvedAt)}</small>}
                      </li>
                    ))}
                  </ol>
                )}
              </EstadoRecurso>
              <p className={styles.lead}>
                La versión documental y el estado curricular son dimensiones distintas. La
                comparación entre versiones estará disponible en una etapa posterior.
              </p>
            </InfoPanel>
          )}

          {activeTab === 'workflow' && (
            <InfoPanel title="Workflow">
              <ol className={styles.stages} aria-label="Etapas del flujo de pregrado y grado">
                {ORDEN_UNDERGRAD.map((code) => (
                  <li
                    key={code}
                    className={code === dossier.currentState.code ? styles.stageCurrent : ''}
                    aria-current={code === dossier.currentState.code ? 'step' : undefined}
                  >
                    {ESTADOS_UNDERGRAD[code]?.nombre ?? code}
                  </li>
                ))}
              </ol>
              <p className={styles.lead}>
                <strong>Próxima acción:</strong> {proximaAccion(dossier.currentState.code)}
              </p>
              {puedeAsignar &&
                (dossier.currentState.code === 'RECEIVED' ||
                  dossier.currentState.code === 'ASSIGNED') && (
                  <section className={styles.flowBlock}>
                    <h3 className={styles.subheading}>
                      <UserCheck size={16} /> Asignación para revisión
                    </h3>
                    <AsignacionExpediente dossier={dossier} onAsignado={onCambio} />
                  </section>
                )}
              <section className={styles.flowBlock}>
                <h3 className={styles.subheading}>Acciones disponibles para su usuario</h3>
                <EstadoRecurso recurso={transiciones} modulo="Las acciones del flujo">
                  {(lista) => (
                    <AccionesFlujo
                      dossier={dossier}
                      transiciones={lista}
                      onRealizada={transicionRealizada}
                    />
                  )}
                </EstadoRecurso>
              </section>
            </InfoPanel>
          )}

          {activeTab === 'historial' && (
            <InfoPanel title="Historial y auditoría">
              <EstadoRecurso recurso={historial} modulo="El historial de estados">
                {(lista) => (
                  <ol className={styles.timeline}>
                    <li>
                      <strong>Expediente registrado</strong>
                      <span>{fecha(dossier.createdAt)}</span>
                      <small>Por {dossier.createdBy.name}</small>
                    </li>
                    {lista.map((item) => (
                      <li key={item.historyId}>
                        <strong>
                          {item.transition.name}: {item.fromState?.name ?? '—'} →{' '}
                          {item.toState.name}
                        </strong>
                        <span>
                          {fecha(item.occurredAt)} · {item.user.name} · {item.versionLabel}
                        </span>
                        {item.observation && (
                          <small className={styles.preserve}>{item.observation}</small>
                        )}
                      </li>
                    ))}
                  </ol>
                )}
              </EstadoRecurso>
            </InfoPanel>
          )}
        </div>

        <aside className={styles.reviewPanel} aria-label="Panel de revisión técnico-curricular">
          <div className={styles.reviewer}>
            <span>
              <ShieldCheck size={19} />
            </span>
            <strong>{user.name}</strong>
            <small>Revisión técnico-curricular</small>
          </div>
          <details className={styles.reviewBlock} open>
            <summary>
              Checklist técnico-curricular{' '}
              <b>
                {evaluados} / {total}
              </b>
            </summary>
            <ChecklistRevision
              resultados={resultados}
              disabled={!decisionHabilitada}
              onChange={(index, resultado) => {
                setResultados((current) =>
                  current.map((value, i) => (i === index ? resultado : value)),
                );
              }}
            />
          </details>
          <section className={styles.decision}>
            <h3>Dictamen técnico</h3>
            {decisionHabilitada ? (
              <DecisionRevision
                dossier={dossier}
                resultados={resultados}
                transiciones={transiciones}
                puedeDevolver={puedeDevolver}
                puedeAprobar={puedeAprobar}
                onRealizada={transicionRealizada}
              />
            ) : (
              <p className={styles.lead}>
                Las decisiones se habilitan cuando el expediente está En revisión o En reevaluación.
                Estado actual: <strong>{dossier.currentState.name}</strong>.
              </p>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}

function Revision() {
  const [params] = useSearchParams();
  const pedido = params.get('dossierId');
  const { items, loading, error, reload } = useDossiers();
  const enLista = items.find((item) => item.dossierId === pedido);
  // Un expediente fuera de los primeros 25 del listado se consulta por su identificador.
  const detalle = useRecurso(
    pedido && !loading && !enLista ? () => dossiersApi.get(pedido) : null,
    [pedido, loading, Boolean(enLista)],
  );
  const dossier = enLista ?? detalle.data ?? (pedido ? undefined : items[0]);

  // Tras una transición el listado se recarga sin desmontar el expediente abierto.
  if ((loading && items.length === 0) || (detalle.loading && !detalle.data)) {
    return <p className={styles.loading}>Consultando expedientes…</p>;
  }
  if (!dossier) {
    return (
      <div className={styles.page}>
        <EmptyState title="Seleccione un expediente">
          {error ||
            detalle.error ||
            'No hay expedientes visibles para su usuario. Abra uno desde Gestión documental para revisarlo.'}
        </EmptyState>
        <Link className={styles.backLink} to="/expedientes">
          Ir a Gestión documental
        </Link>
      </div>
    );
  }
  return (
    <Expediente
      key={dossier.dossierId}
      dossier={dossier}
      onCambio={() => {
        reload();
        detalle.reload();
      }}
    />
  );
}

export function RevisionPage() {
  return (
    <>
      <title>Revisión de expediente | SIGESDOC</title>
      <RequirePermission permission="dossiers.read" action="consultar expedientes">
        <Revision />
      </RequirePermission>
    </>
  );
}
