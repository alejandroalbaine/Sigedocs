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
} from 'lucide-react';
import { RequirePermission } from '../../common/auth/RequirePermission.tsx';
import { useCurrentUser } from '../../common/auth/SessionContext.ts';
import { hasPermission } from '../../common/auth/permissions.ts';
import { EmptyState } from '../../common/components/index.ts';
import {
  admiteDecisionTecnica,
  ESTADOS_UNDERGRAD,
  ORDEN_UNDERGRAD,
  proximaAccion,
} from '../../common/workflow/estados.ts';
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
import type { Dossier } from '../documental/types.ts';
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

function Expediente({ dossier }: { dossier: Dossier }) {
  const user = useCurrentUser();
  const [activeTab, setActiveTab] = useState<TabId>('resumen');
  const [resultados, setResultados] = useState<ResultadoCriterio[]>(resultadosIniciales);
  const puedeDevolver = hasPermission(user.permissions, 'workflow.request_changes');
  const puedeAprobar = hasPermission(user.permissions, 'workflow.approve_for_pilot');
  const decisionHabilitada = admiteDecisionTecnica(dossier.currentState.code);
  const { evaluados, total } = resumirChecklist(resultados);
  const responsable = dossier.assignedSpecialist?.name ?? 'Sin asignar';

  return (
    <div className={styles.page}>
      <div className={styles.breadcrumb}>
        <Link to="/expedientes">Gestión documental</Link> &nbsp; / &nbsp;{' '}
        <strong>{dossier.code}</strong> &nbsp; / &nbsp; <b>Detalle y revisión</b>
      </div>

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
                    ['Fecha de registro', new Date(dossier.createdAt).toLocaleString('es-DO')],
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
            <InfoPanel title="Contenido y archivos">
              <div className={styles.versionCard}>
                <FileText size={28} />
                <div>
                  <strong>Programa de asignatura · {dossier.currentVersion.label}</strong>
                  <p>
                    Plantilla aplicada: <code>{dossier.template.templateVersionId}</code>
                  </p>
                </div>
              </div>
              <Pendiente>
                El contenido del programa y sus adjuntos se consultarán con{' '}
                <code>
                  GET /dossiers/{'{id}'}/versions/{'{versionId}'}
                </code>
                , que el backend aún no implementa. No se muestra un documento de ejemplo.
              </Pendiente>
            </InfoPanel>
          )}

          {activeTab === 'checklist' && (
            <InfoPanel title="Revisión y checklist">
              <p className={styles.lead}>
                Cada criterio se contrasta con su documento maestro. Un criterio obligatorio en
                &quot;No cumple&quot; bloquea la aprobación (REG-06).
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
                La validación cruzada automática contra documentos maestros está diferida (Informe
                Módulo II, §5.1); el especialista registra el resultado de forma manual.
              </Pendiente>
            </InfoPanel>
          )}

          {activeTab === 'observaciones' && (
            <InfoPanel title="Observaciones">
              <div className={styles.emptyState}>
                <MessageSquareText size={34} />
                <strong>Sin observaciones registradas</strong>
                <p>
                  Las observaciones por criterio, sección o campo aparecerán aquí con su estado
                  (pendiente, atendida o resuelta).
                </p>
              </div>
              <Pendiente>
                El backend aún no implementa la ruta de observaciones; las que escriba en el panel
                de revisión no se guardan.
              </Pendiente>
            </InfoPanel>
          )}

          {activeTab === 'versiones' && (
            <InfoPanel title="Versiones">
              <ol className={styles.timeline}>
                <li>
                  <strong>{dossier.currentVersion.label} · versión vigente</strong>
                  <span>Estado curricular: {dossier.currentState.name}</span>
                  <small>
                    La versión documental y el estado curricular son dimensiones distintas (REG-04).
                  </small>
                </li>
              </ol>
              <Pendiente>
                Las versiones anteriores se listarán con{' '}
                <code>GET /dossiers/{'{id}'}/versions</code>. La comparación entre versiones está
                diferida al Curso Final de Grado (CU-09).
              </Pendiente>
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
              <Pendiente>
                Las transiciones disponibles para su usuario llegarán con{' '}
                <code>GET /dossiers/{'{id}'}/available-transitions</code>. El servidor valida cada
                transición (REG-05).
              </Pendiente>
            </InfoPanel>
          )}

          {activeTab === 'historial' && (
            <InfoPanel title="Historial y auditoría">
              <ol className={styles.timeline}>
                <li>
                  <strong>Expediente registrado</strong>
                  <span>{new Date(dossier.createdAt).toLocaleString('es-DO')}</span>
                  <small>Por {dossier.createdBy.name}</small>
                </li>
                <li>
                  <strong>Estado actual: {dossier.currentState.name}</strong>
                  <span>Información entregada por la API</span>
                </li>
                <li className={styles.pending}>
                  <strong>Eventos de auditoría detallados</strong>
                  <small>
                    Pendientes de la ruta de historial del backend; no se muestran eventos
                    simulados.
                  </small>
                </li>
              </ol>
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
            {!puedeDevolver && !puedeAprobar ? (
              <p className={styles.lead}>
                Su rol puede consultar este expediente, pero no emitir decisiones técnicas.
              </p>
            ) : decisionHabilitada ? (
              <DecisionRevision
                resultados={resultados}
                puedeDevolver={puedeDevolver}
                puedeAprobar={puedeAprobar}
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
  const { items, loading, error } = useDossiers();
  const dossier = items.find((item) => item.dossierId === params.get('dossierId')) ?? items[0];

  if (loading) {
    return <p className={styles.loading}>Consultando expedientes…</p>;
  }
  if (!dossier) {
    return (
      <div className={styles.page}>
        <EmptyState title="Seleccione un expediente">
          {error ||
            'No hay expedientes visibles para su usuario. Abra uno desde Gestión documental para revisarlo.'}
        </EmptyState>
        <Link className={styles.backLink} to="/expedientes">
          Ir a Gestión documental
        </Link>
      </div>
    );
  }
  return <Expediente key={dossier.dossierId} dossier={dossier} />;
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
