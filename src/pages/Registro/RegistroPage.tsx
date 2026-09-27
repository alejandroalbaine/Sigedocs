import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Download,
  Eye,
  FileCheck2,
  FileText,
  Fingerprint,
  Save,
  ShieldCheck,
  UploadCloud,
} from 'lucide-react';
import { domainRequest } from '../../common/api/domainClient.ts';
import { errorMessage } from '../../common/api/errors.ts';
import type { CreateDossierInput, Dossier } from '../documental/types.ts';
import styles from '../documental/documental.module.css';

const initial: CreateDossierInput = {
  title: '',
  academicLevel: 'bachelor',
  schoolCode: '',
  degreeProgramCode: '',
  subjectCode: '',
};
const stepNames = [
  'Información General',
  'Clasificación & Alcance',
  'Archivo Digital',
  'Retención',
  'Confirmación',
];

function loadDraft() {
  const raw = localStorage.getItem('sigesdoc:dossier-draft');
  if (!raw) return initial;
  try {
    return { ...initial, ...(JSON.parse(raw) as Partial<typeof initial>) };
  } catch {
    localStorage.removeItem('sigesdoc:dossier-draft');
    return initial;
  }
}

export function RegistroPage() {
  const [form, setForm] = useState(loadDraft);
  const [step, setStep] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState('');
  const [fileHash, setFileHash] = useState('');
  const [notes, setNotes] = useState('');
  const [values, setValues] = useState(['legal', 'academic', 'historic']);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState<Dossier | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(
    () => () => {
      if (fileUrl) URL.revokeObjectURL(fileUrl);
    },
    [fileUrl],
  );
  function set<K extends keyof CreateDossierInput>(name: K, value: CreateDossierInput[K]) {
    setForm((current) => ({ ...current, [name]: value }));
  }
  function toggleValue(value: string) {
    setValues((current) =>
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value],
    );
  }

  async function selectFile(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0];
    if (!selected) return;
    if (selected.size > 50 * 1024 * 1024) {
      setMessage('El archivo supera el límite de 50 MB.');
      return;
    }
    if (fileUrl) URL.revokeObjectURL(fileUrl);
    setFile(selected);
    setFileUrl(URL.createObjectURL(selected));
    const digest = await crypto.subtle.digest('SHA-256', await selected.arrayBuffer());
    setFileHash(
      [...new Uint8Array(digest)]
        .map((value) => value.toString(16).padStart(2, '0'))
        .join('')
        .slice(0, 20),
    );
    setMessage(
      'Archivo validado localmente. La carga definitiva espera la ruta oficial del backend.',
    );
  }

  function saveDraft() {
    localStorage.setItem('sigesdoc:dossier-draft', JSON.stringify(form));
    setMessage('Borrador guardado en este navegador.');
  }
  function reset() {
    localStorage.removeItem('sigesdoc:dossier-draft');
    setForm(initial);
    setStep(1);
    setFile(null);
    setFileHash('');
    setNotes('');
    setCreated(null);
    if (fileUrl) URL.revokeObjectURL(fileUrl);
    setFileUrl('');
    setMessage('Radicación restablecida.');
  }
  function next() {
    if (step === 1 && !form.title.trim()) {
      setMessage('Complete el título del expediente.');
      return;
    }
    if (
      step === 2 &&
      (!form.schoolCode.trim() || !form.degreeProgramCode.trim() || !form.subjectCode.trim())
    ) {
      setMessage('Complete los códigos de unidad, programa y asignatura.');
      return;
    }
    setMessage('');
    setStep((current) => Math.min(5, current + 1));
  }
  async function submit() {
    setSaving(true);
    setMessage('');
    try {
      const { data } = await domainRequest<Dossier>('/dossiers', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      setCreated(data);
      localStorage.removeItem('sigesdoc:dossier-draft');
      setMessage(
        `Expediente ${data.code} registrado correctamente en estado ${data.currentState.name}.`,
      );
    } catch (error) {
      setMessage(errorMessage(error, 'No fue posible registrar el expediente.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.page}>
      <title>Registrar expediente | SIGESDOC</title>
      <header>
        <p className={`${styles.eyebrow} ${styles.eyebrowOrange}`}>
          Expediente Curricular Digital · CU-18
        </p>
        <h1>Registrar expediente curricular</h1>
        <p className={styles.subtle}>
          Asistente de cinco pasos. Solo se envían al servidor los campos que acepta su contrato: el
          código, la versión 1.0 y el estado inicial los asigna el servidor.
        </p>
      </header>

      <ol className={styles.steps}>
        {stepNames.map((name, index) => {
          const number = index + 1;
          return (
            <li
              key={name}
              className={`${styles.step} ${number < step ? styles.stepDone : ''} ${number === step ? styles.stepActive : ''}`}
            >
              <button
                type="button"
                onClick={() => {
                  if (number <= step) setStep(number);
                }}
              >
                <span className={styles.stepNumber}>{number < step ? '✓' : number}</span>
                <span>
                  Paso {String(number).padStart(2, '0')} · {name}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
      {message && <div className={created ? styles.notice : styles.statusNotice}>{message}</div>}

      <section className={styles.form} aria-labelledby="wizard-title">
        <div>
          <h2 id="wizard-title">
            Paso {step}: {stepNames[step - 1]}
          </h2>
          <p className={styles.subtle}>
            Complete esta sección y continúe. Puede regresar sin perder la información.
          </p>
        </div>

        {step === 1 && (
          <div className={styles.grid2}>
            <div className={styles.field}>
              <label htmlFor="title">Título del expediente *</label>
              <input
                id="title"
                className={styles.input}
                value={form.title}
                onChange={(event) => {
                  set('title', event.target.value);
                }}
                placeholder="Ej. Pensum Licenciatura Ciberseguridad 2026"
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="level">Nivel académico *</label>
              <select
                id="level"
                className={styles.select}
                value={form.academicLevel}
                onChange={(event) => {
                  set('academicLevel', event.target.value as CreateDossierInput['academicLevel']);
                }}
              >
                <option value="associate">Técnico superior</option>
                <option value="bachelor">Grado</option>
              </select>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className={styles.grid3}>
            <div className={styles.field}>
              <label htmlFor="school">Unidad productora *</label>
              <input
                id="school"
                className={styles.input}
                value={form.schoolCode}
                onChange={(event) => {
                  set('schoolCode', event.target.value);
                }}
                placeholder="ESC-ING"
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="program">Código de programa *</label>
              <input
                id="program"
                className={styles.input}
                value={form.degreeProgramCode}
                onChange={(event) => {
                  set('degreeProgramCode', event.target.value);
                }}
                placeholder="ISW"
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="subject">Código de asignatura *</label>
              <input
                id="subject"
                className={styles.input}
                value={form.subjectCode}
                onChange={(event) => {
                  set('subjectCode', event.target.value);
                }}
                placeholder="ISW-201"
              />
            </div>
          </div>
        )}

        {step === 3 && (
          <>
            <button
              type="button"
              className={styles.uploadBox}
              onClick={() => fileInput.current?.click()}
            >
              <UploadCloud size={34} />
              <span>
                <strong>Arrastre el documento principal o haga clic para examinar</strong>
                <small>PDF/A o DOCX institucional · máximo 50 MB</small>
              </span>
            </button>
            <input
              ref={fileInput}
              type="file"
              accept=".pdf,.doc,.docx,application/pdf"
              className="visually-hidden"
              onChange={(event) => void selectFile(event)}
            />
            <section className={styles.filePanel}>
              <header>
                <span>
                  <FileText size={18} />{' '}
                  <strong>{file?.name ?? 'Documento principal pendiente'}</strong>
                </span>
                <span className={styles.badge}>PDF o Word</span>
              </header>
              <div className={styles.fileRow}>
                <span className={styles.fileIcon}>
                  <FileCheck2 />
                </span>
                <span>
                  <strong>
                    {file
                      ? `${(file.size / 1024 / 1024).toFixed(2)} MB`
                      : 'Sin archivo seleccionado'}
                  </strong>
                  <small>
                    {fileHash
                      ? `Huella local SHA-256 ${fileHash}…`
                      : 'La carga definitiva se habilitará con la ruta de archivos.'}
                  </small>
                </span>
                {fileUrl && (
                  <>
                    <a
                      className={`${styles.button} ${styles.buttonQuiet}`}
                      href={fileUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Eye size={15} /> Vista previa
                    </a>
                    <a
                      className={`${styles.button} ${styles.buttonQuiet}`}
                      href={fileUrl}
                      download={file?.name}
                    >
                      <Download size={15} /> Descargar
                    </a>
                  </>
                )}
              </div>
            </section>
          </>
        )}

        {step === 4 && (
          <>
            <section className={styles.formSection}>
              <h3>Valores archivísticos primarios y secundarios</h3>
              <div className={styles.grid4}>
                {(
                  [
                    ['administrative', 'Administrativo'],
                    ['legal', 'Legal / Jurídico'],
                    ['academic', 'Académico'],
                    ['historic', 'Histórico / Permanente'],
                  ] as const
                ).map(([value, label]) => (
                  <label key={value}>
                    <input
                      type="checkbox"
                      checked={values.includes(value)}
                      onChange={() => {
                        toggleValue(value);
                      }}
                    />{' '}
                    {label}
                  </label>
                ))}
              </div>
              <div className={styles.field}>
                <label htmlFor="notes">Notas archivísticas (opcional)</label>
                <textarea
                  id="notes"
                  className={styles.textarea}
                  value={notes}
                  onChange={(event) => {
                    setNotes(event.target.value);
                  }}
                  maxLength={500}
                  placeholder="Observaciones de entrada…"
                />
                <small className={styles.subtle}>
                  {notes.length}/500 · Se conserva en el borrador visual; el contrato actual no
                  acepta este atributo.
                </small>
              </div>
            </section>
            <p className={styles.deferredNote}>
              <ShieldCheck size={16} /> Gestión archivística diferida (Informe Módulo II, §5.1):
              estos valores se conservan en el borrador y no se envían al servidor.
            </p>
          </>
        )}

        {step === 5 && (
          <section className={styles.reviewSummary}>
            <Fingerprint size={34} />
            <div>
              <h3>Revise antes de radicar</h3>
              <dl>
                <div>
                  <dt>Título</dt>
                  <dd>{form.title}</dd>
                </div>
                <div>
                  <dt>Nivel</dt>
                  <dd>{form.academicLevel}</dd>
                </div>
                <div>
                  <dt>Unidad / programa / asignatura</dt>
                  <dd>
                    {form.schoolCode} · {form.degreeProgramCode} · {form.subjectCode}
                  </dd>
                </div>
                <div>
                  <dt>Archivo local</dt>
                  <dd>{file?.name ?? 'No adjuntado (la API actual no recibe archivos)'}</dd>
                </div>
              </dl>
              {created && (
                <p className={styles.notice}>
                  <strong>Radicación completada:</strong> {created.code}
                </p>
              )}
            </div>
          </section>
        )}

        <div className={styles.actions}>
          <div className={styles.resultActions}>
            <button
              type="button"
              className={`${styles.button} ${styles.buttonQuiet}`}
              onClick={saveDraft}
            >
              <Save size={15} /> Guardar borrador
            </button>
            <button
              type="button"
              className={`${styles.button} ${styles.buttonSecondary}`}
              onClick={reset}
            >
              Cancelar radicación
            </button>
          </div>
          <div className={styles.resultActions}>
            {step > 1 && (
              <button
                type="button"
                className={`${styles.button} ${styles.buttonSecondary}`}
                onClick={() => {
                  setStep((current) => current - 1);
                }}
              >
                <ArrowLeft size={15} /> Paso anterior
              </button>
            )}
            {step < 5 ? (
              <button
                type="button"
                className={`${styles.button} ${styles.buttonOrange}`}
                onClick={next}
              >
                Continuar <ArrowRight size={15} />
              </button>
            ) : (
              <button
                type="button"
                className={`${styles.button} ${styles.buttonOrange}`}
                disabled={saving || Boolean(created)}
                onClick={() => void submit()}
              >
                {saving ? 'Registrando…' : created ? 'Expediente registrado' : 'Radicar expediente'}{' '}
                <ShieldCheck size={15} />
              </button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
