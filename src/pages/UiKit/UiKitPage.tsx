import { useState } from 'react';
import {
  AlertTriangle,
  Archive,
  BadgeCheck,
  CheckCircle2,
  ChevronDown,
  Download,
  FileQuestion,
  Layers3,
  LoaderCircle,
  LockKeyhole,
  ShieldAlert,
  X,
} from 'lucide-react';
import { downloadJson } from '../../common/utils/download.ts';
import styles from '../documental/documental.module.css';

export function UiKitPage() {
  const [accordionState, setAccordionState] = useState({ open: false, version: 0 });
  const [modalOpen, setModalOpen] = useState(false);
  const [justification, setJustification] = useState('');
  const sectionKey = (id: number) => `${accordionState.version}-${id}`;
  function exportTokens() {
    const computed = getComputedStyle(document.documentElement);
    const names = [
      '--institutional-navy',
      '--institutional-orange',
      '--institutional-canvas',
      '--institutional-selection',
      '--institutional-ink',
      '--institutional-text',
      '--institutional-muted',
      '--institutional-line',
      '--institutional-success',
      '--institutional-danger',
    ];
    downloadJson(
      'sigesdoc-design-tokens.json',
      Object.fromEntries(names.map((name) => [name, computed.getPropertyValue(name).trim()])),
    );
  }

  return (
    <div className={styles.page}>
      <title>Biblioteca UI | SIGESDOC</title>
      <header className={`${styles.hero} ${styles.kitHeader}`}>
        <div>
          <p className={styles.eyebrow}>
            <span className={styles.badge}>Design System v2.4.0 · Minimal Zen</span> WCAG 2.2 AA
          </p>
          <h1>
            Librería de Componentes UI &amp;
            <br />
            Estados del Sistema
          </h1>
          <p>Catálogo institucional de patrones accesibles para todo SIGESDOC.</p>
        </div>
        <div className={styles.headerActions}>
          <button
            className={`${styles.button} ${styles.buttonSecondary}`}
            onClick={() => {
              setAccordionState((current) => ({
                open: !current.open,
                version: current.version + 1,
              }));
            }}
          >
            <ChevronDown size={16} /> {accordionState.open ? 'Colapsar todos' : 'Expandir todos'}
          </button>
          <button className={styles.button} onClick={exportTokens}>
            <Download size={16} /> Exportar tokens JSON
          </button>
        </div>
      </header>

      <details
        key={sectionKey(1)}
        className={styles.accordion}
        open={accordionState.open || undefined}
      >
        <summary>
          <Layers3 size={19} />
          <span>
            1. Los 4 estados generales del sistema<small>Loading, vacío, éxito y error</small>
          </span>
        </summary>
        <div className={styles.kitGrid}>
          <article className={styles.kitState}>
            <LoaderCircle className={styles.spin} />
            <strong>En espera / carga</strong>
            <p className={styles.subtle}>Estructura de carga para prevenir saltos visuales.</p>
            <span className={styles.skeleton} />
          </article>
          <article className={styles.kitState}>
            <FileQuestion />
            <strong>Vacío / sin registros</strong>
            <p>No se encontraron expedientes en esta serie.</p>
            <button className={`${styles.button} ${styles.buttonOrange}`}>
              Radicar expediente
            </button>
          </article>
          <article className={styles.kitState}>
            <CheckCircle2 />
            <strong>Éxito / conforme</strong>
            <p className={styles.notice}>Expediente radicado satisfactoriamente.</p>
          </article>
          <article className={styles.kitState}>
            <AlertTriangle />
            <strong>Error / reparación crítica</strong>
            <p className={styles.error}>No fue posible completar la operación.</p>
          </article>
        </div>
      </details>

      <details
        key={sectionKey(2)}
        className={styles.accordion}
        open={accordionState.open || undefined}
      >
        <summary>
          <BadgeCheck size={19} />
          <span>
            2. Matriz de botones y jerarquía táctil<small>Área mínima de interacción de 44px</small>
          </span>
        </summary>
        <div className={styles.buttonMatrix}>
          <span>Primario institucional</span>
          <button className={styles.button}>Consultar archivo</button>
          <button className={styles.button}>Estado activo</button>
          <button className={styles.button} disabled>
            Deshabilitado
          </button>
          <span>Acción destacada</span>
          <button className={`${styles.button} ${styles.buttonOrange}`}>
            Registrar expediente
          </button>
          <button className={`${styles.button} ${styles.buttonOrange}`}>Estado activo</button>
          <button className={`${styles.button} ${styles.buttonOrange}`} disabled>
            Deshabilitado
          </button>
          <span>Secundario</span>
          <button className={`${styles.button} ${styles.buttonSecondary}`}>
            Filtros avanzados
          </button>
          <button className={`${styles.button} ${styles.buttonSecondary}`}>Cancelar</button>
          <button className={`${styles.button} ${styles.buttonSecondary}`} disabled>
            Deshabilitado
          </button>
        </div>
      </details>

      <details
        key={sectionKey(3)}
        className={styles.accordion}
        open={accordionState.open || undefined}
      >
        <summary>
          <Archive size={19} />
          <span>
            3. Distintivos de ciclo vital documental
            <small>Identificadores de conservación archivística</small>
          </span>
        </summary>
        <div className={styles.kitGrid}>
          {[
            ['Vigencia activa', 'Archivo de gestión'],
            ['En trámite legal', 'Flujo corriente'],
            ['Cotejo técnico', 'Mesa de control'],
            ['Subsanación', 'Alerta de reparo'],
            ['Custodia permanente', 'Archivo histórico'],
          ].map(([status, description], index) => (
            <article className={styles.kitState} key={status}>
              <span
                className={
                  index === 3
                    ? styles.badgeWarning
                    : index === 4
                      ? styles.badge
                      : styles.badgeSuccess
                }
              >
                {status}
              </span>
              <strong>{description}</strong>
              <p className={styles.subtle}>Patrón cromático institucional con texto explícito.</p>
            </article>
          ))}
        </div>
      </details>

      <details
        key={sectionKey(4)}
        className={styles.accordion}
        open={accordionState.open || undefined}
      >
        <summary>
          <ShieldAlert size={19} />
          <span>
            4. Componentes de formulario y entradas accesibles
            <small>Validación asistida y controles de 44px</small>
          </span>
        </summary>
        <div className={styles.grid3}>
          <label className={styles.field}>
            Código de expediente
            <input className={styles.input} defaultValue="UAPA-CUR-2024-8819" />
          </label>
          <label className={styles.field}>
            Fecha de creación
            <input
              className={styles.input}
              type="date"
              aria-invalid="true"
              defaultValue="2025-14-99"
            />
          </label>
          <label className={styles.field}>
            Serie documental
            <select className={styles.select}>
              <option>Planes y programas de estudio</option>
              <option>Resoluciones y actas</option>
            </select>
          </label>
        </div>
      </details>

      <details
        key={sectionKey(5)}
        className={styles.accordion}
        open={accordionState.open || undefined}
      >
        <summary>
          <LockKeyhole size={19} />
          <span>
            5. Patrón modal para acciones críticas
            <small>Confirmación con justificación obligatoria</small>
          </span>
        </summary>
        <div className={styles.emptyRow}>
          <p>Demostración interactiva del diálogo. No ejecuta cambios en el servidor.</p>
          <button
            className={styles.button}
            onClick={() => {
              setModalOpen(true);
            }}
          >
            Abrir diálogo canónico
          </button>
        </div>
      </details>

      {modalOpen && (
        <div
          className={styles.modalBackdrop}
          role="presentation"
          onMouseDown={() => {
            setModalOpen(false);
          }}
        >
          <section
            className={styles.modal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="audit-title"
            onMouseDown={(event) => {
              event.stopPropagation();
            }}
          >
            <header>
              <span>
                <LockKeyhole size={18} />{' '}
                <strong id="audit-title">Transferencia definitiva al Archivo Histórico</strong>
              </span>
              <button
                aria-label="Cerrar"
                onClick={() => {
                  setModalOpen(false);
                }}
              >
                <X />
              </button>
            </header>
            <div>
              <p className={styles.statusNotice}>
                Acción administrativa irreversible. Backend debe autorizarla y registrar su
                auditoría.
              </p>
              <label className={styles.field}>
                Justificación archivística obligatoria
                <textarea
                  className={styles.textarea}
                  value={justification}
                  onChange={(event) => {
                    setJustification(event.target.value);
                  }}
                  minLength={30}
                />
              </label>
            </div>
            <footer>
              <button
                className={`${styles.button} ${styles.buttonSecondary}`}
                onClick={() => {
                  setModalOpen(false);
                }}
              >
                Cancelar
              </button>
              <button
                className={`${styles.button} ${styles.buttonOrange}`}
                disabled
                title="La ruta de transferencia no está publicada"
              >
                Confirmar transferencia
              </button>
            </footer>
          </section>
        </div>
      )}
    </div>
  );
}
