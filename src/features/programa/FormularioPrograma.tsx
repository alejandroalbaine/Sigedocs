import { useEffect, useMemo, useState } from 'react';
import { dossiersApi, subjectsApi, templatesApi } from '../../common/api/dossiers.ts';
import type { FieldError } from '../../common/api/contract.ts';
import type { CatalogOption, Dossier, Subject } from '../../common/api/dossierContract.ts';
import { ApiError, errorMessage } from '../../common/api/errors.ts';
import type { TemplateField } from '../../common/api/templateContract.ts';
import { useRecurso } from '../../common/api/useRecurso.ts';
import { Alert, Button } from '../../common/components/index.ts';
import { CampoPlantilla, type Catalogos } from './CampoPlantilla.tsx';
import { contenidoInicial, type Contenido, type Item, type Valor } from './contenido.ts';
import { GrupoRepetible } from './GrupoRepetible.tsx';
import { validarContenido, type Hallazgo } from './validacion.ts';
import {
  destinosPrograma,
  hallazgosServidor,
  idCampo,
  idSeccion,
  pertenece,
  ubicarHallazgos,
} from './erroresPrograma.ts';
import { MensajesCampo } from './MensajesCampo.tsx';
import { ResumenErrores } from './ResumenErrores.tsx';
import { conReglasOficiales, validarLimitesOficiales } from './reglasOficiales.ts';
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
  erroresRevision?: readonly FieldError[];
  onCorregir?: (ruta: string) => void;
}

/**
 * CU-01: contenido del programa de asignatura dibujado desde la plantilla publicada
 * (template-data-contract.md). Se guarda con `PATCH /dossiers/{id}/versions/{versionId}` en modo
 * borrador: el servidor acepta campos incompletos y valida del todo al pasar a revisión.
 */
export function FormularioPrograma({
  dossier,
  editable,
  erroresRevision = [],
  onCorregir,
}: FormularioProgramaProps) {
  const { dossierId, currentVersion, template } = dossier;

  const version = useRecurso(
    () => dossiersApi.version(dossierId, currentVersion.versionId),
    [dossierId, currentVersion.versionId],
  );

  const templateVersionId = version.data?.templateVersionId ?? template.templateVersionId;

  const metadatosPlantilla = useRecurso(
    () => templatesApi.get(template.templateId),
    [template.templateId],
  );

  const plantilla = useRecurso(
    () => templatesApi.version(template.templateId, templateVersionId),
    [template.templateId, templateVersionId],
  );

  const nombresCatalogo = useMemo(
    () =>
      plantilla.data
        ? [...catalogosDe(plantilla.data.sections.flatMap((seccion) => seccion.fields))].sort()
        : [],
    [plantilla.data],
  );

  const [catalogosCargados, setCatalogos] = useState<{
    clave: string;
    datos: Catalogos;
  }>({
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
      if (vigente) {
        setCatalogos({
          clave: claveCatalogos,
          datos: Object.fromEntries(pares),
        });
      }
    });

    return () => {
      vigente = false;
    };
  }, [claveCatalogos]);

  const catalogos: Catalogos =
    catalogosCargados.clave === claveCatalogos
      ? catalogosCargados.datos
      : Object.fromEntries(nombresCatalogo.map((nombre) => [nombre, 'cargando' as const]));

  const [subject, setSubject] = useState<Subject | null>(null);
  const [subjectPending, setSubjectPending] = useState(true);

  useEffect(() => {
    let vigente = true;

    void subjectsApi
      .get(dossier.subjectCode)
      .then(({ data }) => {
        if (vigente) {
          setSubject(data);
          setSubjectPending(false);
        }
      })
      .catch(() => {
        if (vigente) {
          setSubject(null);
          setSubjectPending(false);
        }
      });

    return () => {
      vigente = false;
    };
  }, [dossier.subjectCode]);

  const clave = `${currentVersion.versionId}:${templateVersionId}`;

  const base = useMemo(
    () =>
      plantilla.data && version.data
        ? contenidoInicial(plantilla.data, version.data.content)
        : null,
    [plantilla.data, version.data],
  );

  const [edicion, setEdicion] = useState<{
    clave: string;
    contenido: Contenido;
  } | null>(null);

  const contenido = edicion?.clave === clave ? edicion.contenido : base;

  const [mostrarReglas, setMostrarReglas] = useState(erroresRevision.length > 0);
  const [guardando, setGuardando] = useState(false);
  const [reenviando, setReenviando] = useState(false);

  const [aviso, setAviso] = useState<{
    kind: 'success' | 'error' | 'info';
    texto: string;
  } | null>(null);

  const [erroresServidor, setErroresServidor] = useState<Hallazgo[]>([]);

  if (version.loading || plantilla.loading || metadatosPlantilla.loading) {
    return <p className={styles.vacio}>Consultando…</p>;
  }

  if (version.pendiente || plantilla.pendiente) {
    return (
      <Alert kind="info">
        El formulario del programa de asignatura está en preparación y aparecerá aquí en cuanto esté
        disponible.
      </Alert>
    );
  }

  if (version.error || plantilla.error || metadatosPlantilla.error) {
    return (
      <Alert kind="error">{version.error || plantilla.error || metadatosPlantilla.error}</Alert>
    );
  }

  if (!plantilla.data || !contenido) return null;

  const plantillaValidada = conReglasOficiales(plantilla.data, metadatosPlantilla.data?.code ?? '');
  const hallazgos = ubicarHallazgos(
    [
      ...(mostrarReglas ? validarContenido(plantillaValidada, contenido) : []),
      ...erroresServidor,
      ...hallazgosServidor(erroresRevision),
    ],
    destinosPrograma(plantillaValidada, contenido),
  );

  const errores = hallazgos.filter((hallazgo) => hallazgo.severidad === 'error').length;

  const secciones = plantillaValidada.sections
    .filter((seccion) => seccion.isActive)
    .sort((a, b) => a.position - b.position);

  function cambiar(seccion: string, campo: string, valor: Valor) {
    if (!contenido) return;

    setEdicion({
      clave,
      contenido: {
        ...contenido,
        [seccion]: {
          ...contenido[seccion],
          [campo]: valor,
        },
      },
    });

    const ruta = `${seccion}.${campo}`;
    setErroresServidor((actuales) =>
      actuales.filter((error) => !pertenece(error.ruta, ruta) && error.ruta !== seccion),
    );
    onCorregir?.(ruta);
    setAviso(null);
  }

  async function guardar() {
    if (!contenido) return;

    setGuardando(true);
    setMostrarReglas(true);
    setErroresServidor([]);

    try {
      await dossiersApi.saveContent(dossierId, currentVersion.versionId, contenido);

      setAviso({
        kind: 'success',
        texto: `Borrador de ${currentVersion.label} guardado.`,
      });

      version.reload();
      setEdicion(null);
    } catch (reason) {
      if (reason instanceof ApiError && reason.fieldErrors.length) {
        setErroresServidor(hallazgosServidor(reason.fieldErrors));
      }

      setAviso({
        kind: reason instanceof ApiError && reason.status === 404 ? 'info' : 'error',
        texto:
          reason instanceof ApiError && reason.status === 404
            ? 'No se guardó: la edición del contenido aún está en preparación.'
            : errorMessage(reason, 'No fue posible guardar el programa.'),
      });
    } finally {
      setGuardando(false);
    }
  }

  async function reenviar() {
    if (!contenido || !plantilla.data) return;

    const limites = validarLimitesOficiales(
      plantilla.data,
      contenido,
      metadatosPlantilla.data?.code ?? '',
    );
    if (limites.length) {
      setMostrarReglas(true);
      setAviso({
        kind: 'error',
        texto: 'El programa no cumple las reglas de la plantilla. Revise los campos señalados.',
      });
      return;
    }

    setReenviando(true);
    setMostrarReglas(true);
    setErroresServidor([]);
    setAviso(null);

    try {
      // Guardar primero los cambios actuales del formulario.
      await dossiersApi.saveContent(dossierId, currentVersion.versionId, contenido);

      // Consultar las acciones que el backend permite para este expediente.
      const { data: transiciones } = await dossiersApi.availableTransitions(dossierId);

      const reenviarPrograma = transiciones.find((transicion) => transicion.code === 'RESUBMIT');

      if (!reenviarPrograma) {
        setAviso({
          kind: 'info',
          texto: 'El reenvío no está disponible para este expediente en este momento.',
        });
        return;
      }

      // Ejecutar la transición real proporcionada por el backend.
      await dossiersApi.transition(dossierId, {
        transitionId: reenviarPrograma.transitionId,
        versionId: currentVersion.versionId,
      });

      setEdicion(null);

      setAviso({
        kind: 'success',
        texto: 'Programa reenviado correctamente.',
      });

      version.reload();
    } catch (reason) {
      if (reason instanceof ApiError && reason.fieldErrors.length > 0) {
        setErroresServidor(hallazgosServidor(reason.fieldErrors));
      }

      setAviso({
        kind: 'error',
        texto:
          reason instanceof ApiError && reason.status === 422
            ? 'El programa no cumple las reglas de la plantilla. Revise los campos señalados.'
            : errorMessage(reason, 'No fue posible reenviar el programa.'),
      });
    } finally {
      setReenviando(false);
    }
  }

  return (
    <div className={styles.formulario}>
      <header className={styles.resumen}>
        <div>
          <strong>
            {metadatosPlantilla.data?.name ?? 'Programa de asignatura'} · versión{' '}
            {plantilla.data.versionNumber}
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

      <ResumenErrores plantilla={plantillaValidada} contenido={contenido} hallazgos={hallazgos} />

      {secciones.map((seccion) => {
        const deSeccion = hallazgos.filter(
          (hallazgo) => hallazgo.severidad === 'error' && pertenece(hallazgo.ruta, seccion.key),
        ).length;

        return (
          <details
            key={seccion.key}
            className={styles.seccion}
            id={idSeccion(seccion.key)}
            tabIndex={-1}
            open
          >
            <summary>
              <span>
                {seccion.title}
                {seccion.isRequired ? ' *' : ''}
              </span>

              {deSeccion > 0 && <span className={styles.contadorError}>{deSeccion}</span>}
            </summary>

            {seccion.description && <p className={styles.ayuda}>{seccion.description}</p>}

            <MensajesCampo
              id={`${idSeccion(seccion.key)}-error`}
              hallazgos={hallazgos}
              ruta={seccion.key}
            />
            <div className={styles.campos}>
              {[...seccion.fields]
                .sort((a, b) => a.position - b.position)
                .map((campo) => {
                  const ruta = `${seccion.key}.${campo.key}`;
                  const valor = contenido[seccion.key]?.[campo.key];
                  if (
                    campo.key === 'asignatura' ||
                    campo.key === 'clave_asignatura' ||
                    campo.key === 'creditos' ||
                    campo.key === 'prerrequisitos'
                  ) {
                    let valorActual: Valor = valor;

                    if (campo.key === 'asignatura') {
                      valorActual = subject?.name ?? valor ?? 'Consultando asignatura...';
                    }

                    if (campo.key === 'clave_asignatura') {
                      valorActual = subject?.code ?? dossier.subjectCode;
                    }

                    if (campo.key === 'prerrequisitos') {
                      valorActual = subject
                        ? subject.prerequisites.join(', ') || 'Sin prerrequisitos'
                        : (valor ?? 'Consultando prerrequisitos...');
                    }

                    if (campo.key === 'creditos' && (valorActual === '' || valorActual == null)) {
                      valorActual = 'Pendiente del catálogo';
                    }

                    return (
                      <div key={campo.key} className={styles.campo}>
                        <span className={styles.etiqueta}>
                          {campo.label}
                          {campo.isRequired ? ' *' : ''}
                        </span>

                        <span className={styles.lectura}>
                          {subjectPending && campo.key !== 'creditos'
                            ? 'Consultando...'
                            : typeof valorActual === 'string' || typeof valorActual === 'number'
                              ? String(valorActual)
                              : ''}
                        </span>

                        <MensajesCampo
                          id={`${idCampo(ruta)}-error`}
                          hallazgos={hallazgos}
                          ruta={ruta}
                        />
                      </div>
                    );
                  }

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

          <Button
            size="sm"
            loading={guardando}
            disabled={reenviando}
            onClick={() => void guardar()}
          >
            Guardar borrador
          </Button>

          {dossier.currentState.code === 'CHANGES_REQUIRED' && (
            <Button
              size="sm"
              loading={reenviando}
              disabled={guardando || reenviando}
              onClick={() => void reenviar()}
            >
              Reenviar
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
