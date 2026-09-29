import { useEffect, useMemo, useState } from 'react';
import { dossiersApi, templatesApi } from '../../common/api/dossiers.ts';
import type { CatalogOption, Dossier } from '../../common/api/dossierContract.ts';
import { ApiError, errorMessage } from '../../common/api/errors.ts';
import type { TemplateField } from '../../common/api/templateContract.ts';
import { useRecurso } from '../../common/api/useRecurso.ts';
import { Alert, Button } from '../../common/components/index.ts';
import { CampoPlantilla, type Catalogos } from './CampoPlantilla.tsx';
import { contenidoInicial, type Contenido, type Item, type Valor } from './contenido.ts';
import { GrupoRepetible } from './GrupoRepetible.tsx';
import { validarContenido, type Hallazgo } from './validacion.ts';
import styles from './programa.module.css';

function catalogosDe(campos: readonly TemplateField[], nombres = new Set<string>()): Set<string> {
  for (const campo of campos) {
    if (campo.optionsSource) nombres.add(campo.optionsSource.catalog);
    if (campo.config?.fields) catalogosDe(campo.config.fields, nombres);
  }
  return nombres;
}

interface FormularioProgramaProps {
  dossier: Dossier;
  /** Permiso `dossiers.edit` y versión en un estado editable (RECEIVED, CHANGES_REQUIRED). */
  editable: boolean;
}

/**
 * CU-01: contenido del programa de asignatura dibujado desde la plantilla publicada
 * (template-data-contract.md). Se guarda con `PATCH /dossiers/{id}/versions/{versionId}` en modo
 * borrador: el servidor acepta campos incompletos y valida del todo al pasar a revisión.
 */
export function FormularioPrograma({ dossier, editable }: FormularioProgramaProps) {
  const { dossierId, currentVersion, template } = dossier;
  const version = useRecurso(
    () => dossiersApi.version(dossierId, currentVersion.versionId),
    [dossierId, currentVersion.versionId],
  );
  const templateVersionId = version.data?.templateVersionId ?? template.templateVersionId;
  const plantilla = useRecurso(
    () => templatesApi.version(template.templateId, templateVersionId),
    [template.templateId, templateVersionId],
  );

  const nombresCatalogo = useMemo(
    () =>
      plantilla.data
        ? [...catalogosDe(plantilla.data.version.sections.flatMap((s) => s.fields))].sort()
        : [],
    [plantilla.data],
  );
  const [catalogosCargados, setCatalogos] = useState<{ clave: string; datos: Catalogos }>({
    clave: '',
    datos: {},
  });
  const claveCatalogos = nombresCatalogo.join(',');
  useEffect(() => {
    if (!claveCatalogos) return;
    let vigente = true;
    void Promise.all(
      claveCatalogos
        .split(',')
        .map(async (nombre): Promise<[string, CatalogOption[] | 'pendiente']> => {
          try {
            return [nombre, (await templatesApi.catalog(nombre)).data];
          } catch {
            return [nombre, 'pendiente'];
          }
        }),
    ).then((pares) => {
      if (vigente) setCatalogos({ clave: claveCatalogos, datos: Object.fromEntries(pares) });
    });
    return () => {
      vigente = false;
    };
  }, [claveCatalogos]);
  const catalogos: Catalogos =
    catalogosCargados.clave === claveCatalogos
      ? catalogosCargados.datos
      : Object.fromEntries(nombresCatalogo.map((nombre) => [nombre, 'cargando' as const]));

  const clave = `${currentVersion.versionId}:${templateVersionId}`;
  const base = useMemo(
    () =>
      plantilla.data && version.data
        ? contenidoInicial(plantilla.data, version.data.content)
        : null,
    [plantilla.data, version.data],
  );
  const [edicion, setEdicion] = useState<{ clave: string; contenido: Contenido } | null>(null);
  const contenido = edicion?.clave === clave ? edicion.contenido : base;
  const [mostrarReglas, setMostrarReglas] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState<{ kind: 'success' | 'error' | 'info'; texto: string } | null>(
    null,
  );
  const [erroresServidor, setErroresServidor] = useState<Hallazgo[]>([]);

  if (version.loading || plantilla.loading) return <p className={styles.vacio}>Consultando…</p>;
  if (version.pendiente || plantilla.pendiente) {
    return (
      <Alert kind="info">
        El contenido del programa se carga con{' '}
        {version.pendiente ? 'GET /dossiers/{id}/versions/{versionId}' : 'la plantilla publicada'},
        que el servidor aún no implementa. El formulario aparecerá aquí en cuanto esté disponible.
      </Alert>
    );
  }
  if (version.error || plantilla.error) {
    return <Alert kind="error">{version.error || plantilla.error}</Alert>;
  }
  if (!plantilla.data || !contenido) return null;

  const hallazgos = [
    ...(mostrarReglas ? validarContenido(plantilla.data, contenido) : []),
    ...erroresServidor,
  ];
  const errores = hallazgos.filter((h) => h.severidad === 'error').length;
  const secciones = plantilla.data.version.sections
    .filter((seccion) => seccion.isActive)
    .sort((a, b) => a.position - b.position);

  function cambiar(seccion: string, campo: string, valor: Valor) {
    if (!contenido) return;
    setEdicion({
      clave,
      contenido: { ...contenido, [seccion]: { ...contenido[seccion], [campo]: valor } },
    });
    setAviso(null);
  }

  async function guardar() {
    if (!contenido) return;
    setGuardando(true);
    setMostrarReglas(true);
    setErroresServidor([]);
    try {
      await dossiersApi.saveContent(dossierId, currentVersion.versionId, contenido);
      setAviso({ kind: 'success', texto: `Borrador de ${currentVersion.label} guardado.` });
      version.reload();
      setEdicion(null);
    } catch (reason) {
      if (reason instanceof ApiError && reason.fieldErrors.length) {
        setErroresServidor(
          reason.fieldErrors.map((error) => ({
            ruta: error.field,
            mensaje: `El servidor rechazó este campo (${error.code || 'inválido'}).`,
            severidad: 'error',
          })),
        );
      }
      setAviso({
        kind: reason instanceof ApiError && reason.status === 404 ? 'info' : 'error',
        texto:
          reason instanceof ApiError && reason.status === 404
            ? 'No se guardó: el servidor aún no implementa la edición del contenido.'
            : errorMessage(reason, 'No fue posible guardar el programa.'),
      });
    } finally {
      setGuardando(false);
    }
  }

  const sinRuta = erroresServidor.filter(
    (error) => !error.ruta.includes('.') || !secciones.some((s) => error.ruta.startsWith(s.key)),
  );

  return (
    <div className={styles.formulario}>
      <header className={styles.resumen}>
        <div>
          <strong>
            {plantilla.data.name} · versión de plantilla {plantilla.data.version.versionNumber}
          </strong>
          <small>
            {editable
              ? 'Puede guardar incompleto; para pasar a revisión el programa debe cumplir las reglas.'
              : 'Solo lectura: la versión no está en un estado editable o su rol no puede editarla.'}
          </small>
        </div>
        {mostrarReglas && (
          <span className={errores ? styles.contadorError : styles.contadorOk}>
            {errores ? `${String(errores)} pendiente(s)` : 'Cumple las reglas de la plantilla'}
          </span>
        )}
      </header>

      {secciones.map((seccion) => {
        const deSeccion = hallazgos.filter((h) => h.ruta.startsWith(`${seccion.key}.`)).length;
        return (
          <details key={seccion.key} className={styles.seccion} open>
            <summary>
              <span>
                {seccion.title}
                {seccion.isRequired ? ' *' : ''}
              </span>
              {deSeccion > 0 && <span className={styles.contadorError}>{deSeccion}</span>}
            </summary>
            {seccion.description && <p className={styles.ayuda}>{seccion.description}</p>}
            <div className={styles.campos}>
              {[...seccion.fields]
                .sort((a, b) => a.position - b.position)
                .map((campo) => {
                  const ruta = `${seccion.key}.${campo.key}`;
                  const valor = contenido[seccion.key]?.[campo.key];
                  return campo.type === 'repeatable_group' ? (
                    <GrupoRepetible
                      key={campo.key}
                      campo={campo}
                      items={Array.isArray(valor) ? (valor as Item[]) : []}
                      ruta={ruta}
                      editable={editable}
                      hallazgos={hallazgos}
                      catalogos={catalogos}
                      onChange={(items) => {
                        cambiar(seccion.key, campo.key, items);
                      }}
                    />
                  ) : (
                    <CampoPlantilla
                      key={campo.key}
                      campo={campo}
                      valor={valor}
                      ruta={ruta}
                      editable={editable}
                      hallazgos={hallazgos}
                      catalogos={catalogos}
                      onChange={(nuevo) => {
                        cambiar(seccion.key, campo.key, nuevo);
                      }}
                    />
                  );
                })}
            </div>
          </details>
        );
      })}

      {sinRuta.length > 0 && (
        <Alert kind="error">
          {sinRuta.map((error) => `${error.ruta}: ${error.mensaje}`).join(' · ')}
        </Alert>
      )}
      {aviso && <Alert kind={aviso.kind}>{aviso.texto}</Alert>}
      {editable && (
        <div className={styles.acciones}>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setMostrarReglas(true);
            }}
          >
            Revisar reglas
          </Button>
          <Button size="sm" loading={guardando} onClick={() => void guardar()}>
            Guardar borrador
          </Button>
        </div>
      )}
    </div>
  );
}
