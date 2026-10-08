import { dossiersApi, templatesApi } from '../../common/api/dossiers.ts';
import type { Dossier } from '../../common/api/dossierContract.ts';
import { ApiError } from '../../common/api/errors.ts';
import { contenidoInicial } from './contenido.ts';
import { validarLimitesOficiales } from './reglasOficiales.ts';

/** Revisión inicial: comprueba el contenido persistido, sin guardar ni modificar el formulario. */
export async function comprobarEnvio(dossier: Dossier): Promise<void> {
  const { data: version } = await dossiersApi.version(
    dossier.dossierId,
    dossier.currentVersion.versionId,
  );
  const [{ data: metadatos }, { data: plantilla }] = await Promise.all([
    templatesApi.get(dossier.template.templateId),
    templatesApi.version(dossier.template.templateId, version.templateVersionId),
  ]);
  const errores = validarLimitesOficiales(
    plantilla,
    contenidoInicial(plantilla, version.content),
    metadatos.code,
  );
  if (errores.length)
    throw new ApiError('El programa no cumple las reglas de la plantilla.', {
      status: 422,
      code: 'VALIDATION_FAILED',
      fieldErrors: errores.map((item) => ({
        field: item.ruta,
        code: 'OFFICIAL_TEMPLATE_RULE',
        message: item.mensaje,
      })),
    });
}
