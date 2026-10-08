import { useId, useMemo, useState } from 'react';
import { ArrowLeftRight, GitCompareArrows, Info } from 'lucide-react';
import type { Dossier, DossierVersion } from '../../common/api/dossierContract.ts';
import { useRecurso } from '../../common/api/useRecurso.ts';
import { Alert, Badge, Button, Field } from '../../common/components/index.ts';
import {
  CAMBIO_CAMPO,
  CAMBIO_ELEMENTO,
  TONO_CAMBIO,
  cantidad,
  resumenComparacion,
  type CampoComparado,
  type ElementoComparado,
  type SeccionComparada,
} from './comparacion.ts';
import {
  cargarComparacion,
  ordenarVersiones,
  parInicial,
  type DatosComparacion,
} from './consulta.ts';
import type { Fragmento } from './diferenciaTexto.ts';
import styles from './versiones.module.css';

interface Etiquetas {
  base: string;
  comparada: string;
}

/** Los lectores de pantalla no anuncian <del>/<ins>: el aviso va también como texto oculto. */
function Texto({ fragmentos }: { fragmentos: readonly Fragmento[] }) {
  return fragmentos.map((fragmento, indice) =>
    fragmento.tipo === 'eliminado' ? (
      <del key={indice}>
        <span className="visually-hidden">[quitado: </span>
        {fragmento.texto}
        <span className="visually-hidden">]</span>
      </del>
    ) : fragmento.tipo === 'agregado' ? (
      <ins key={indice}>
        <span className="visually-hidden">[agregado: </span>
        {fragmento.texto}
        <span className="visually-hidden">]</span>
      </ins>
    ) : (
      <span key={indice}>{fragmento.texto}</span>
    ),
  );
}

/** Los dos valores de un campo, uno al lado del otro. */
function Lados({ campo, etiquetas }: { campo: CampoComparado; etiquetas: Etiquetas }) {
  return (
    <div className={styles.lados}>
      <div className={styles.lado} data-lado="base">
        <span className={styles.version}>{etiquetas.base}</span>
        <span className={styles.valor}>
          {campo.texto ? <Texto fragmentos={campo.texto.antes} /> : campo.antes}
        </span>
      </div>
      <div className={styles.lado} data-lado="comparada">
        <span className={styles.version}>{etiquetas.comparada}</span>
        <span className={styles.valor}>
          {campo.texto ? <Texto fragmentos={campo.texto.despues} /> : campo.despues}
        </span>
      </div>
    </div>
  );
}

/** Contenido de un elemento que solo existe en una de las dos versiones (agregado o quitado). */
function ContenidoElemento({
  campos,
  lado,
}: {
  campos: readonly CampoComparado[];
  lado: 'antes' | 'despues';
}) {
  return (
    <dl className={styles.contenido}>
      {campos.map((campo) => (
        <div key={campo.key}>
          <dt>{campo.etiqueta}</dt>
          <dd>
            {!campo.elementos ? (
              lado === 'antes' ? (
                campo.antes
              ) : (
                campo.despues
              )
            ) : campo.elementos.length > 0 ? (
              <ol className={styles.subelementos}>
                {campo.elementos.map((item) => (
                  <li key={item.itemId}>
                    <ContenidoElemento campos={item.campos} lado={lado} />
                  </li>
                ))}
              </ol>
            ) : (
              '—'
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function Elemento({
  campo,
  elemento,
  etiquetas,
  mostrarTodo,
  anidado,
}: {
  campo: CampoComparado;
  elemento: ElementoComparado;
  etiquetas: Etiquetas;
  mostrarTodo: boolean;
  /** Elemento de un subgrupo: su título no es otro h6 al nivel del elemento que lo contiene. */
  anidado: boolean;
}) {
  const numero =
    elemento.posicionDespues === null
      ? `${campo.etiqueta} ${String(elemento.posicionAntes ?? '')} de ${etiquetas.base}`
      : `${campo.etiqueta} ${String(elemento.posicionDespues)}`;
  const unilateral = elemento.tipo === 'agregado' || elemento.tipo === 'eliminado';
  const soloMovido = elemento.tipo === 'igual' && elemento.movido;
  const campos = elemento.campos.filter((item) => mostrarTodo || item.tipo !== 'igual');
  return (
    <li className={styles.elemento} data-tipo={elemento.tipo}>
      <div className={styles.cabecera}>
        <div className={styles.nombreElemento}>
          {anidado ? <p>{numero}</p> : <h6>{numero}</h6>}
          {elemento.resumen && <small>{elemento.resumen}</small>}
        </div>
        <Badge tone={soloMovido ? 'info' : TONO_CAMBIO[elemento.tipo]}>
          {soloMovido ? 'Movido' : CAMBIO_ELEMENTO[elemento.tipo]}
        </Badge>
      </div>
      {elemento.movido && (
        <small className={styles.nota}>
          En {etiquetas.base} estaba en la posición {elemento.posicionAntes}.
        </small>
      )}
      {unilateral ? (
        <ContenidoElemento
          campos={elemento.campos}
          lado={elemento.tipo === 'agregado' ? 'despues' : 'antes'}
        />
      ) : (
        campos.map((item) => (
          <Campo
            key={item.key}
            campo={item}
            etiquetas={etiquetas}
            mostrarTodo={mostrarTodo}
            anidado
          />
        ))
      )}
    </li>
  );
}

function Campo({
  campo,
  etiquetas,
  mostrarTodo,
  anidado = false,
}: {
  campo: CampoComparado;
  etiquetas: Etiquetas;
  mostrarTodo: boolean;
  anidado?: boolean;
}) {
  const titulo = (
    <>
      {campo.etiqueta}
      <Badge tone={TONO_CAMBIO[campo.tipo]}>{CAMBIO_CAMPO[campo.tipo]}</Badge>
    </>
  );
  const elementos = campo.elementos?.filter(
    (item) => mostrarTodo || item.tipo !== 'igual' || item.movido,
  );
  return (
    <div className={styles.campo} data-tipo={campo.tipo}>
      {anidado ? (
        <p className={styles.etiqueta}>{titulo}</p>
      ) : (
        <h5 className={styles.etiqueta}>{titulo}</h5>
      )}
      {elementos ? (
        <>
          <p className={styles.nota}>
            {etiquetas.base}: {campo.antes} · {etiquetas.comparada}: {campo.despues}
            {campo.reordenado ? ' · Se cambió el orden de los elementos.' : ''}
          </p>
          {elementos.length > 0 && (
            <ol className={styles.elementos} aria-label={campo.etiqueta}>
              {elementos.map((elemento) => (
                <Elemento
                  key={elemento.itemId}
                  campo={campo}
                  elemento={elemento}
                  etiquetas={etiquetas}
                  mostrarTodo={mostrarTodo}
                  anidado={anidado}
                />
              ))}
            </ol>
          )}
        </>
      ) : (
        <Lados campo={campo} etiquetas={etiquetas} />
      )}
      {campo.opciones && (
        <p className={styles.nota}>
          {campo.opciones.agregadas.length > 0 && (
            <span>
              {campo.opciones.agregadas.length === 1 ? 'Se agregó' : 'Se agregaron'}:{' '}
              {campo.opciones.agregadas.join(', ')}.{' '}
            </span>
          )}
          {campo.opciones.quitadas.length > 0 && (
            <span>
              {campo.opciones.quitadas.length === 1 ? 'Se quitó' : 'Se quitaron'}:{' '}
              {campo.opciones.quitadas.join(', ')}.
            </span>
          )}
        </p>
      )}
    </div>
  );
}

function Seccion({
  seccion,
  etiquetas,
  mostrarTodo,
}: {
  seccion: SeccionComparada;
  etiquetas: Etiquetas;
  mostrarTodo: boolean;
}) {
  const id = useId();
  const campos = seccion.campos.filter((campo) => mostrarTodo || campo.tipo !== 'igual');
  return (
    <section className={styles.seccion} aria-labelledby={id}>
      <div className={styles.cabeceraSeccion}>
        <h4 id={id}>{seccion.titulo}</h4>
        <Badge tone={seccion.cambios ? 'warning' : 'neutral'}>
          {seccion.cambios
            ? `${cantidad(seccion.cambios, 'campo', 'campos')} con cambios`
            : 'Sin cambios'}
        </Badge>
      </div>
      {campos.map((campo) => (
        <Campo key={campo.key} campo={campo} etiquetas={etiquetas} mostrarTodo={mostrarTodo} />
      ))}
    </section>
  );
}

function Resultado({ datos, mostrarTodo }: { datos: DatosComparacion; mostrarTodo: boolean }) {
  const { comparacion, base, comparada } = datos;
  const etiquetas = { base: base.label, comparada: comparada.label };
  const visibles = comparacion.secciones.filter((seccion) => mostrarTodo || seccion.cambios > 0);
  const sinCambios = comparacion.secciones.filter((seccion) => seccion.cambios === 0);
  return (
    <>
      {datos.plantillaDistinta && (
        <Alert kind="warning">
          Las dos versiones usan versiones distintas de la plantilla: se muestran las secciones y
          los campos de ambas.
        </Alert>
      )}
      {comparacion.cambios === 0 && (
        <p className={styles.nota}>
          Al devolver el programa, la nueva versión empieza como copia de la versión revisada; los
          cambios aparecen aquí a medida que se edita.
        </p>
      )}
      {comparacion.cambios > 0 && (
        <p className={styles.leyenda}>
          <del>Texto tachado</del>: quitado en {comparada.label}. <ins>Texto subrayado</ins>:
          agregado en {comparada.label}.
        </p>
      )}
      {visibles.map((seccion) => (
        <Seccion
          key={seccion.key}
          seccion={seccion}
          etiquetas={etiquetas}
          mostrarTodo={mostrarTodo}
        />
      ))}
      {!mostrarTodo && comparacion.cambios > 0 && sinCambios.length > 0 && (
        <p className={styles.nota}>
          Sin cambios: {sinCambios.map((seccion) => seccion.titulo).join(', ')}.
        </p>
      )}
    </>
  );
}

function nombreOpcion(version: DossierVersion, vigente: string) {
  return [version.label, version.state.name, version.versionId === vigente ? 'vigente' : '']
    .filter(Boolean)
    .join(' · ');
}

/**
 * RF-19: compara dos versiones del expediente, sección por sección y campo por campo. Por
 * defecto, la versión vigente contra la anterior: lo que cambió desde la última revisión.
 */
export function ComparadorVersiones({
  dossier,
  versiones,
}: {
  dossier: Dossier;
  versiones: readonly DossierVersion[];
}) {
  const tituloId = useId();
  const vigente = dossier.currentVersion.versionId;
  const ordenadas = useMemo(() => ordenarVersiones(versiones), [versiones]);
  const inicial = parInicial(ordenadas, vigente);
  const [elegido, setElegido] = useState(inicial);
  const [mostrarTodo, setMostrarTodo] = useState(false);
  const existe = (versionId: string) => ordenadas.some((item) => item.versionId === versionId);
  const par = elegido && existe(elegido.base) && existe(elegido.comparada) ? elegido : inicial;
  const distintas = par !== null && par.base !== par.comparada;

  const datos = useRecurso(
    par && distintas ? () => cargarComparacion(dossier, par.base, par.comparada) : null,
    [dossier.dossierId, par?.base, par?.comparada],
  );

  if (!par) {
    return (
      <section className={styles.comparador} aria-labelledby={tituloId}>
        <h3 id={tituloId} className={styles.titulo}>
          <GitCompareArrows size={16} /> Comparar versiones
        </h3>
        <p className={styles.pendiente}>
          <Info size={15} /> El expediente tiene una sola versión. Cuando el programa se devuelva
          para ajustes se creará una versión nueva y podrá compararlas aquí.
        </p>
      </section>
    );
  }

  return (
    <section className={styles.comparador} aria-labelledby={tituloId}>
      <h3 id={tituloId} className={styles.titulo}>
        <GitCompareArrows size={16} /> Comparar versiones
      </h3>
      <div className={styles.selectores}>
        <Field label="Versión base">
          {(control) => (
            <select
              {...control}
              value={par.base}
              onChange={(event) => {
                setElegido({ ...par, base: event.target.value });
              }}
            >
              {ordenadas.map((version) => (
                <option key={version.versionId} value={version.versionId}>
                  {nombreOpcion(version, vigente)}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field label="Versión comparada">
          {(control) => (
            <select
              {...control}
              value={par.comparada}
              onChange={(event) => {
                setElegido({ ...par, comparada: event.target.value });
              }}
            >
              {ordenadas.map((version) => (
                <option key={version.versionId} value={version.versionId}>
                  {nombreOpcion(version, vigente)}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Button
          variant="secondary"
          onClick={() => {
            setElegido({ base: par.comparada, comparada: par.base });
          }}
        >
          <ArrowLeftRight size={16} /> Intercambiar
        </Button>
      </div>
      <label className={styles.interruptor}>
        <input
          type="checkbox"
          checked={mostrarTodo}
          onChange={(event) => {
            setMostrarTodo(event.target.checked);
          }}
        />
        Mostrar también lo que no cambió
      </label>

      {/* Región viva fija: anuncia la carga y el resumen cada vez que cambia el par elegido. */}
      <p className={styles.resumen} role="status">
        {!distintas
          ? ''
          : datos.loading
            ? 'Comparando versiones…'
            : datos.data
              ? resumenComparacion(
                  datos.data.comparacion,
                  datos.data.base.label,
                  datos.data.comparada.label,
                )
              : ''}
      </p>

      {!distintas ? (
        <Alert kind="info">Elija dos versiones distintas para compararlas.</Alert>
      ) : datos.loading ? null : datos.pendiente ? (
        <p className={styles.pendiente}>
          <Info size={15} /> La consulta de versiones está en preparación y la comparación aparecerá
          aquí en cuanto esté disponible.
        </p>
      ) : datos.error ? (
        <Alert kind="error">{datos.error}</Alert>
      ) : datos.data ? (
        <Resultado datos={datos.data} mostrarTodo={mostrarTodo} />
      ) : null}
    </section>
  );
}
