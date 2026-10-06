import type { TemplateVersion } from '../../common/api/templateContract.ts';
import { Alert } from '../../common/components/index.ts';
import type { Contenido } from './contenido.ts';
import { destinosPrograma, irAlError } from './erroresPrograma.ts';
import type { Hallazgo } from './validacion.ts';

export function ResumenErrores({
  plantilla,
  contenido,
  hallazgos,
}: {
  plantilla: TemplateVersion;
  contenido: Contenido;
  hallazgos: readonly Hallazgo[];
}) {
  const errores = hallazgos.filter((item) => item.severidad === 'error');
  if (!errores.length) return null;
  const destinos = destinosPrograma(plantilla, contenido);
  return (
    <Alert kind="error">
      <nav aria-label="Errores del programa">
        <strong>Revise los campos señalados. Seleccione un error para ir a su sección.</strong>
        <ul>
          {errores.map((error) => {
            const destino = destinos.find((item) => item.ruta === error.ruta);
            return (
              <li key={`${error.ruta}:${error.mensaje}`}>
                {destino ? (
                  <a
                    href={`#${destino.id}`}
                    onClick={(event) => {
                      event.preventDefault();
                      irAlError(destino.id);
                    }}
                  >
                    {destino.etiqueta}
                  </a>
                ) : (
                  <span>Programa · {error.ruta}</span>
                )}
                {' — '}
                {error.mensaje}
              </li>
            );
          })}
        </ul>
      </nav>
    </Alert>
  );
}
