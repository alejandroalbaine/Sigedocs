import { useState } from 'react';
import {
  AlertTriangle,
  Archive,
  BadgeCheck,
  CheckCircle2,
  ChevronDown,
  Download,
  FilePlus2,
  FileQuestion,
  Layers3,
  LoaderCircle,
  LockKeyhole,
  Palette,
  RotateCcw,
  Search,
  ShieldAlert,
  Trash2,
} from 'lucide-react';
import { Alert, Dialog } from '../../common/components/index.ts';
import { downloadJson } from '../../common/utils/download.ts';
import { ESTADOS_UNDERGRAD, GRUPOS_ESTADO } from '../../common/workflow/estados.ts';
import { claseEstado } from '../documental/estadoBadge.ts';
import { COLORES, ESCALA_TIPOGRAFICA, MINIMO_JUSTIFICACION, TOKENS_EXPORTABLES } from './kit.ts';
import styles from '../documental/documental.module.css';

function etiquetaGrupo(grupo: string) {
  return GRUPOS_ESTADO.find((item) => item.id === grupo)?.etiqueta ?? grupo;
}

export function UiKitPage() {
  const [accordionState, setAccordionState] = useState({ open: false, version: 0 });
  const [modalOpen, setModalOpen] = useState(false);
  const [justification, setJustification] = useState('');
  const [modalResult, setModalResult] = useState('');
  const [title, setTitle] = useState('');
  const [titleTouched, setTitleTouched] = useState(false);
  const sectionKey = (id: number) => `${accordionState.version}-${id}`;
  const titleError = titleTouched && !title.trim() ? 'Complete el título del expediente.' : '';
  const justificationValid = justification.trim().length >= MINIMO_JUSTIFICACION;

  function exportTokens() {
    const computed = getComputedStyle(document.documentElement);
    downloadJson(
      'sigesdoc-design-tokens.json',
      Object.fromEntries(
        TOKENS_EXPORTABLES.map((name) => [name, computed.getPropertyValue(name).trim()]),
      ),
    );
  }

  function closeModal() {
    setModalOpen(false);
    setJustification('');
  }

  return (
    <div className={styles.page}>
      <title>Biblioteca UI | SIGESDOC</title>
      <header className={`${styles.hero} ${styles.kitHeader}`}>
        <div>
          <p className={styles.eyebrow}>
            <span className={styles.badge}>Versión Minimalista v.2</span> Paleta y tipografía del
            documento base de Figma
          </p>
          <h1>
            Librería de Componentes UI &amp;
            <br />
            Estados del Sistema
          </h1>
          <p>
            Referencia común entre Figma y el desarrollo: cada pantalla nueva reutiliza estos
            colores, textos y componentes.
          </p>
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
        key={sectionKey(0)}
        className={styles.accordion}
        open={accordionState.open || undefined}
      >
        <summary>
          <Palette size={19} />
          <span>
            0. Paleta y tipografía
            <small>Valores exactos del documento base de Figma e Inter como fuente única</small>
          </span>
        </summary>
        <div className={styles.kitBody}>
          {(['Primarios', 'Acento', 'Fondos', 'Semánticos'] as const).map((grupo) => (
            <section key={grupo} aria-label={`Colores ${grupo.toLowerCase()}`}>
              <h3 className={styles.kitSubtitle}>{grupo}</h3>
              <ul className={styles.swatchGrid}>
                {COLORES.filter((color) => color.grupo === grupo).map((color) => (
                  <li key={color.token} className={styles.swatch}>
                    <span
                      className={styles.swatchColor}
                      style={{ background: `var(${color.token})` }}
                    />
                    <strong>{color.nombre}</strong>
                    <code>{color.hex}</code>
                    <small className={styles.subtle}>{color.uso}</small>
                  </li>
                ))}
              </ul>
            </section>
          ))}
          <p className={styles.deferredNote}>
            <ShieldAlert size={16} /> Contraste AA: el texto sobre naranja va en azul institucional
            (5.3:1) y el texto naranja pequeño usa #A85100 (5.5:1). El naranja oscuro #C95E00 queda
            para bordes e íconos.
          </p>
          <h3 className={styles.kitSubtitle}>Escala tipográfica · Inter</h3>
          <ul className={styles.typeScale}>
            {ESCALA_TIPOGRAFICA.map((nivel) => (
              <li key={nivel.clase}>
                <span className={styles[nivel.clase]}>{nivel.ejemplo}</span>
                <small className={styles.subtle}>{nivel.descripcion}</small>
              </li>
            ))}
          </ul>
        </div>
      </details>

      <details
        key={sectionKey(1)}
        className={styles.accordion}
        open={accordionState.open || undefined}
      >
        <summary>
          <Layers3 size={19} />
          <span>
            1. Los 4 estados generales del sistema<small>Carga, vacío, éxito y error</small>
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
            <p>No hay expedientes que coincidan con su búsqueda. Pruebe con otros filtros.</p>
          </article>
          <article className={styles.kitState}>
            <CheckCircle2 />
            <strong>Éxito</strong>
            <Alert kind="success">Expediente ECD-2026-0001 registrado correctamente.</Alert>
          </article>
          <article className={styles.kitState}>
            <AlertTriangle />
            <strong>Error</strong>
            <Alert kind="error">No fue posible completar la operación. Inténtelo de nuevo.</Alert>
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
          <span aria-hidden="true" />
          <small className={styles.subtle}>Normal</small>
          <small className={styles.subtle}>Con ícono</small>
          <small className={styles.subtle}>Deshabilitado</small>
          <span>Primario institucional</span>
          <button className={styles.button}>Consultar expediente</button>
          <button className={styles.button}>
            <Search size={16} /> Buscar
          </button>
          <button className={styles.button} disabled>
            Deshabilitado
          </button>
          <span>Acción destacada</span>
          <button className={`${styles.button} ${styles.buttonOrange}`}>
            Registrar expediente
          </button>
          <button className={`${styles.button} ${styles.buttonOrange}`}>
            <FilePlus2 size={16} /> Nuevo registro
          </button>
          <button className={`${styles.button} ${styles.buttonOrange}`} disabled>
            Deshabilitado
          </button>
          <span>Secundario</span>
          <button className={`${styles.button} ${styles.buttonSecondary}`}>Cancelar</button>
          <button className={`${styles.button} ${styles.buttonSecondary}`}>
            <RotateCcw size={16} /> Devolver
          </button>
          <button className={`${styles.button} ${styles.buttonSecondary}`} disabled>
            Deshabilitado
          </button>
          <span>Destructivo</span>
          <button className={`${styles.button} ${styles.buttonDanger}`}>Eliminar borrador</button>
          <button className={`${styles.button} ${styles.buttonDanger}`}>
            <Trash2 size={16} /> Descartar
          </button>
          <button className={`${styles.button} ${styles.buttonDanger}`} disabled>
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
            3. Distintivos de estado del expediente
            <small>Los 11 estados del flujo de pregrado y grado (ADR-014)</small>
          </span>
        </summary>
        <div className={styles.kitGrid}>
          {Object.entries(ESTADOS_UNDERGRAD).map(([code, state]) => (
            <article className={styles.kitState} key={code}>
              <span className={`${claseEstado(code)} ${styles.kitBadge}`}>{state.nombre}</span>
              <strong>{code}</strong>
              <p className={styles.subtle}>Grupo: {etiquetaGrupo(state.grupo)}.</p>
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
            <small>Etiqueta visible, ayuda y error junto al campo (T1 §3.9.11)</small>
          </span>
        </summary>
        <div className={styles.grid3}>
          <div className={styles.field}>
            <label htmlFor="kit-code">Código de expediente</label>
            <input
              id="kit-code"
              className={styles.input}
              value="ECD-2026-0001"
              readOnly
              aria-describedby="kit-code-help"
            />
            <small id="kit-code-help" className={styles.subtle}>
              Lo asigna el servidor al registrar.
            </small>
          </div>
          <div className={styles.field}>
            <label htmlFor="kit-title">Título del expediente *</label>
            <input
              id="kit-title"
              className={styles.input}
              value={title}
              required
              aria-invalid={titleError ? true : undefined}
              aria-describedby={titleError ? 'kit-title-error' : undefined}
              placeholder="Deje vacío y salga del campo"
              onChange={(event) => {
                setTitle(event.target.value);
              }}
              onBlur={() => {
                setTitleTouched(true);
              }}
            />
            {titleError && (
              <small id="kit-title-error" className={styles.fieldError} role="alert">
                {titleError}
              </small>
            )}
          </div>
          <div className={styles.field}>
            <label htmlFor="kit-level">Nivel académico *</label>
            <select id="kit-level" className={styles.select} defaultValue="bachelor">
              <option value="bachelor">Grado</option>
              <option value="associate">Técnico superior</option>
            </select>
          </div>
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
            <small>Confirmación con justificación obligatoria (T1 §3.4.9)</small>
          </span>
        </summary>
        <div className={styles.emptyRow}>
          <p>Demostración interactiva del diálogo. No ejecuta cambios en el servidor.</p>
          {modalResult && <Alert kind="info">{modalResult}</Alert>}
          <button
            className={styles.button}
            onClick={() => {
              setModalResult('');
              setModalOpen(true);
            }}
          >
            Abrir diálogo de ejemplo
          </button>
        </div>
      </details>

      <Dialog open={modalOpen} title="Devolver expediente con observaciones" onClose={closeModal}>
        <div className={styles.dialogContent}>
          <p className={styles.notice}>
            El expediente vuelve a &quot;Requiere ajustes&quot; y se crea una nueva versión
            (ADR-014, T3). El servidor autoriza y registra la acción.
          </p>
          <div className={styles.field}>
            <label htmlFor="kit-justification">Observaciones obligatorias *</label>
            <textarea
              id="kit-justification"
              className={styles.textarea}
              value={justification}
              aria-describedby="kit-justification-help"
              onChange={(event) => {
                setJustification(event.target.value);
              }}
            />
            <small id="kit-justification-help" className={styles.subtle}>
              {justification.trim().length}/{MINIMO_JUSTIFICACION} caracteres mínimos.
            </small>
          </div>
          <footer className={styles.dialogActions}>
            <button className={`${styles.button} ${styles.buttonSecondary}`} onClick={closeModal}>
              Cancelar
            </button>
            <button
              className={`${styles.button} ${styles.buttonOrange}`}
              disabled={!justificationValid}
              onClick={() => {
                setModalResult('Demostración: la devolución no se envió al servidor.');
                closeModal();
              }}
            >
              Confirmar devolución
            </button>
          </footer>
        </div>
      </Dialog>
    </div>
  );
}
