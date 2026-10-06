# Errores de validación del programa

Los errores de guardado, inicio de revisión y reenvío se muestran junto a su campo,
grupo repetible, elemento o sección. El resumen enlaza al destino, abre la sección
si estaba cerrada y coloca allí el foco. Los campos incluyen `aria-invalid` y una
descripción accesible con todos sus mensajes. Al editar se retiran los errores del
servidor correspondientes al campo/grupo modificado; las reglas locales se recalculan.

Las rutas anidadas utilizan `itemId`, por lo que reordenar elementos no cambia el
campo al que apunta un error. Una ruta desconocida se muestra en el ancestro visible
más próximo o en el resumen general; ningún error se descarta por falta de destino.
Se conserva `errors[].message`, sin mostrar el `detail` interno del problema HTTP.

## Plantilla oficial y backend

Para `COURSE_PROGRAM`, el frontend verifica que el plan de evaluación sume 100 %
y que haya como máximo 10 unidades didácticas, conforme a las claves de la plantilla
oficial. Los comprueba antes de iniciar revisión o reenviar; los borradores pueden
guardarse incompletos. Con 10 unidades desaparece la acción de agregar otra unidad;
si un borrador existente contiene 11, permite quitar la excedente.

El backend `develop` comprobado (`b4207f2`) todavía omite las reglas de primer nivel
y de documento en la respuesta de la plantilla, y no aplica `sum_equals`.
La prueba HTTP confirmó que acepta un borrador con 90 % y 11 unidades. Por eso estas
dos reglas se completan localmente solo para la plantilla oficial cuando faltan.
Las demás plantillas y las reglas recibidas conservan su comportamiento.
El backend debe incorporar esos límites para impedir también envíos que eludan la interfaz.

Referencias del backend: `docs/templates.md`, `docs/template-data-contract.md`,
`database/migrations/009_course_program_template.up.sql` y
`src/modules/template-engine/domain/services/contentValidation.ts`.

## Coordinación del formulario

La rama parte de `develop` después de integrar el PR #12
(`feature/catalogos-envio-revision`). La carga de catálogos y las llamadas de guardado,
consulta de acciones y transición permanecen en el formulario existente. Las nuevas
reglas, resolución de rutas, comprobación previa y componentes de mensajes están en
archivos independientes de `src/features/programa`. Los cambios compartidos conectan
esos componentes y trasladan los errores de Workflow a Contenido.

## Comprobación manual

1. Abra un expediente editable, vaya a **Contenido y archivos** y pulse **Revisar reglas**.
   Compruebe que los obligatorios aparecen debajo de sus campos y en el resumen.
2. Cierre una sección con errores y seleccione su enlace en el resumen:
   debe abrirse y el campo debe recibir el foco.
3. En el plan, introduzca porcentajes que sumen 90 o 110: aparece el total actual
   junto al grupo. Ajuste a 100: desaparece ese error.
4. Con 10 unidades no se ofrece agregar otra. Si existe un borrador con 11,
   se señala el exceso y quitar una elimina ese error.
5. Intente iniciar revisión desde Workflow con una suma incorrecta:
   debe abrirse Contenido con los errores y no debe ejecutarse la transición.
6. Intente reenviar con una suma incorrecta: debe señalar los errores sin guardar
   ni ejecutar la transición. Guardar borrador continúa disponible.
7. Al corregir los límites, los demás errores `422` del servidor deben aparecer
   junto a sus campos/secciones, incluido un formulario en solo lectura.

## Pruebas

`npm test` incluye límites, mensajes múltiples y accesibilidad, navegación a secciones
cerradas, errores anidados después de reordenar y el recorrido de revisión/reenvío.

La prueba opcional **Programa: errores reales por campo y reglas oficiales sobre
contenido persistido**, en `src/test/b3.integration.tsx`, utiliza HTTP y PostgreSQL
reales. Crea un expediente de prueba, provoca un error de tipo en créditos y comprueba
su mensaje en el formulario; después guarda un borrador con 90 % y 11 unidades y
verifica los avisos y el rechazo local previo al envío.

Se ejecuta con `npm run test:integration:b3 -- -t "Programa:"`, usando
`B3_API_BASE_URL`, `B3_EMAIL` y `B3_PASSWORD` de una API/base local aislada.
Esta prueba no se ejecuta en CI porque necesita el backend y sus credenciales locales.
