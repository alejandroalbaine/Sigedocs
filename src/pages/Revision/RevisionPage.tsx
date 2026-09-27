import { useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router';
import {
  ClipboardList,
  Download,
  FileArchive,
  FileCheck2,
  Files,
  History,
  Link2,
  LockKeyhole,
  Printer,
  ShieldCheck,
} from 'lucide-react';
import { RequirePermission } from '../../common/auth/RequirePermission.tsx';
import { useCurrentUser } from '../../common/auth/SessionContext.ts';
import { ChecklistRevision } from '../../features/revision/ChecklistRevision.tsx';
import { DecisionRevision } from '../../features/revision/DecisionRevision.tsx';
import { REQUISITOS } from '../../features/revision/reglas.ts';
import { useDossiers } from '../documental/useDossiers.ts';
import styles from './RevisionPage.module.css';

type TabId = 'resumen' | 'metadatos' | 'versiones' | 'bitacora' | 'relaciones';

const tabs = [
  { id: 'resumen', label: 'Resumen & Visor PDF', icon: FileCheck2 },
  { id: 'metadatos', label: 'Metadatos Completos', icon: ClipboardList },
  { id: 'versiones', label: 'Archivo y Versiones', icon: FileArchive },
  { id: 'bitacora', label: 'Bitácora Inalterable', icon: LockKeyhole },
  { id: 'relaciones', label: 'Relaciones y Anexos', icon: Link2 },
] satisfies { id: TabId; label: string; icon: typeof FileCheck2 }[];

function InfoPanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className={styles.infoPanel}>
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function Revision() {
  const user = useCurrentUser();
  const [params] = useSearchParams();
  const { items } = useDossiers();
  const dossier = items.find((item) => item.dossierId === params.get('dossierId')) ?? items[0];
  const [activeTab, setActiveTab] = useState<TabId>('resumen');
  const [verificados, setVerificados] = useState<boolean[]>(() => REQUISITOS.map(() => false));
  const code = dossier?.code ?? 'EXPEDIENTE NO SELECCIONADO';
  const title = dossier?.title ?? 'Seleccione un expediente desde Gestión Documental';

  return (
    <div className={styles.page}>
      <div className={styles.breadcrumb}>
        SIGESDOC &nbsp; / &nbsp; Expedientes Académicos &nbsp; / &nbsp; <strong>{code}</strong>
        &nbsp; / &nbsp; <b>Detalle y Dictamen Técnico</b>
      </div>

      <section className={styles.hero}>
        <div className={styles.heroTitle}>
          <span className={styles.code}>{code}</span>
          <small>Serie académica institucional</small>
          <h1>{title}</h1>
          <div className={styles.tags}>
            <span>
              <ShieldCheck size={14} /> Vigente (TRD Activa)
            </span>
            <span>
              <LockKeyhole size={14} /> Nivel: Confidencial Académico
            </span>
            <span>
              <Files size={14} /> Foliado electrónico pendiente
            </span>
          </div>
        </div>
        <div className={styles.heroActions}>
          <button
            type="button"
            onClick={() => {
              window.print();
            }}
          >
            <Printer size={16} /> Imprimir Hoja de Control
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('bitacora');
            }}
          >
            <History size={16} /> Historial de Cambios
          </button>
          <button
            className={styles.download}
            disabled
            title="Backend todavía no publica la descarga compilada"
          >
            <Download size={16} /> Descargar Expediente Compilado (ZIP)
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

      {activeTab === 'resumen' && (
        <div className={styles.workspace}>
          <section className={styles.viewerPanel}>
            <div className={styles.viewerTools}>
              <span>
                ‹ &nbsp; Página <b>1</b> de 1 &nbsp; ›
              </span>
              <span>
                − &nbsp; <b>100%</b> &nbsp; ＋
              </span>
              <span className={styles.seal}>
                <ShieldCheck size={14} /> Sello Cualificado X.509
              </span>
            </div>
            <div className={styles.document}>
              <header>
                <b>U</b>
                <span>
                  <strong>UNIVERSIDAD ABIERTA PARA ADULTOS</strong>
                  <small>Santiago de los Caballeros, República Dominicana</small>
                </span>
                <code>FOLIO ELEC. 0001 / 0001</code>
              </header>
              <h2>VICERRECTORÍA ACADÉMICA</h2>
              <h3>DIRECCIÓN DE GESTIÓN CURRICULAR E INNOVACIÓN PEDAGÓGICA</h3>
              <p className={styles.resolution}>EXPEDIENTE CURRICULAR</p>
              <p>
                <strong>CONSIDERANDO:</strong> Que el expediente <b>{title}</b> se encuentra bajo
                custodia institucional y sujeto a verificación conforme a la Ley General de Archivos
                481-08.
              </p>
              <p>
                <strong>CONSIDERANDO:</strong> Que la revisión técnica debe conservar la integridad
                documental, la trazabilidad y los permisos efectivos entregados por el servicio.
              </p>
              <p>
                <strong>VISTA:</strong> La normativa archivística institucional, la Tabla de
                Retención Documental y el flujo académico aplicable.
              </p>
              <p>
                <strong>RESUELVE:</strong> Mantener el expediente en el estado{' '}
                <b>{dossier?.currentState.name ?? 'pendiente de selección'}</b> hasta completar el
                dictamen autorizado.
              </p>
              <div className={styles.signatures}>
                <div>
                  <ShieldCheck size={15} /> <strong>FIRMA DIGITAL CUALIFICADA</strong>
                  <br />
                  Responsable del expediente
                </div>
                <div>
                  <ShieldCheck size={15} /> <strong>FIRMA DIGITAL CUALIFICADA</strong>
                  <br />
                  Revisor institucional
                </div>
              </div>
              <footer>SIGESDOC Archivo Curricular · Sistema acreditado &nbsp; {code}</footer>
            </div>
            <p className={styles.fileLine}>
              <Files size={14} /> Documento digital no disponible: backend aún no expone la ruta de
              contenido.
            </p>
          </section>

          <aside className={styles.reviewPanel}>
            <div className={styles.reviewer}>
              <ShieldCheck size={19} />
              <strong>{user.name}</strong>
              <small>En dictamen · Plazo institucional</small>
            </div>
            <details className={styles.reviewBlock} open>
              <summary>
                Verificación Normativa Ley 481-08{' '}
                <b>
                  {verificados.filter(Boolean).length} / {REQUISITOS.length}
                </b>
              </summary>
              <ChecklistRevision
                verificados={verificados}
                onChange={(index, checked) => {
                  setVerificados((current) =>
                    current.map((value, i) => (i === index ? checked : value)),
                  );
                }}
              />
            </details>
            <details className={styles.reviewBlock} open>
              <summary>Observaciones Archivísticas y Dictamen</summary>
              <p>
                Las observaciones se validan en el bloque de resolución antes de intentar una
                decisión.
              </p>
            </details>
            <details className={styles.reviewBlock}>
              <summary>Ficha de Custodia y Disposición TRD</summary>
              <p>Contenido pendiente de contrato del backend.</p>
            </details>
            <section className={styles.decision}>
              <h3>Resolución del archivero</h3>
              <DecisionRevision checklistCompleto={verificados.every(Boolean)} />
            </section>
          </aside>
        </div>
      )}

      {activeTab === 'metadatos' && (
        <InfoPanel title="Metadatos completos del expediente">
          <dl className={styles.metadataGrid}>
            <div>
              <dt>Código de radicación</dt>
              <dd>{code}</dd>
            </div>
            <div>
              <dt>Nivel académico</dt>
              <dd>{dossier?.academicLevel ?? 'No disponible'}</dd>
            </div>
            <div>
              <dt>Unidad productora</dt>
              <dd>{dossier?.schoolCode ?? 'No disponible'}</dd>
            </div>
            <div>
              <dt>Programa</dt>
              <dd>{dossier?.degreeProgramCode ?? 'No disponible'}</dd>
            </div>
            <div>
              <dt>Asignatura</dt>
              <dd>{dossier?.subjectCode ?? 'No disponible'}</dd>
            </div>
            <div>
              <dt>Estado actual</dt>
              <dd>{dossier?.currentState.name ?? 'No disponible'}</dd>
            </div>
          </dl>
        </InfoPanel>
      )}
      {activeTab === 'versiones' && (
        <InfoPanel title="Archivo y versiones">
          <div className={styles.versionCard}>
            <FileArchive size={28} />
            <div>
              <strong>Versión vigente del expediente</strong>
              <p>
                {dossier
                  ? `Registro ${dossier.code}, creado ${new Date(dossier.createdAt).toLocaleString('es-DO')}.`
                  : 'Seleccione un expediente.'}
              </p>
              <small>
                El historial de archivos se habilitará cuando backend publique la ruta de versiones.
              </small>
            </div>
          </div>
        </InfoPanel>
      )}
      {activeTab === 'bitacora' && (
        <InfoPanel title="Bitácora inalterable">
          <ol className={styles.timeline}>
            {dossier && (
              <>
                <li>
                  <strong>Expediente radicado</strong>
                  <span>{new Date(dossier.createdAt).toLocaleString('es-DO')}</span>
                  <small>Registrado por {dossier.createdBy.name}</small>
                </li>
                <li>
                  <strong>Estado actual: {dossier.currentState.name}</strong>
                  <span>Información entregada por la API</span>
                </li>
              </>
            )}
            <li className={styles.pending}>
              <strong>Eventos de auditoría detallados</strong>
              <small>
                Pendientes de una ruta oficial del backend; no se muestran eventos simulados.
              </small>
            </li>
          </ol>
        </InfoPanel>
      )}
      {activeTab === 'relaciones' && (
        <InfoPanel title="Relaciones y anexos">
          <div className={styles.emptyState}>
            <Link2 size={34} />
            <strong>No existen relaciones disponibles</strong>
            <p>La API actual no publica anexos ni relaciones entre expedientes.</p>
          </div>
        </InfoPanel>
      )}
    </div>
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
