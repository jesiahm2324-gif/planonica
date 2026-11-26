# PlanoNica — Plano y Materiales Nicaragua (fase 1)

App web instalable (PWA) para diseñar planos de casa en 2D y 3D y calcular materiales con piedra cantera o bloque. También lleva precios en córdobas, otros gastos y exportación. Funciona sin internet.

## Publicar en GitHub Pages

1. En GitHub, crea un repositorio nuevo, por ejemplo `planonica`, y márcalo como **Public**.
2. Entra al repositorio y elige **Add file → Upload files**. Arrastra **todo el contenido** de esta carpeta, (los 9 archivos), y presiona **Commit changes**.
3. Ve a **Settings → Pages**. En *Source* elige **Deploy from a branch**, rama `main` y carpeta `/ (root)`, y presiona **Save**.
4. En uno o dos minutos la app queda en `https://TU-USUARIO.github.io/planonica/`.

## Instalar en el teléfono

- **Android (Chrome):** abre la dirección y elige el menú ⋮ → **Instalar app** (o **Agregar a la pantalla principal**).
- **iPhone (Safari):** botón Compartir → **Agregar a inicio**.

Después de abrirla una vez con internet, la app funciona sin señal.

## Publicar una actualización

1. Sube los archivos cambiados al repositorio.
2. En `sw.js`, cambia el número de `VERSION`, por ejemplo `planonica-v1.0.1`. **Si no lo cambias, los teléfonos no verán la versión nueva.**
3. Cuando el teléfono tenga internet, la app muestra el aviso "Hay una versión nueva" con el botón **Actualizar**. Los datos no se pierden.

## Dónde se guardan los datos

Los proyectos, precios y gastos se guardan en el navegador del dispositivo. Usa **Exportar → Respaldo de todo** de vez en cuando para guardar una copia o pasarla a otro teléfono. Para restaurarla, ve a **Proyectos → Importar respaldo**. También acepta respaldos del prototipo anterior.

## Archivos

| Archivo | Función |
| --- | --- |
| `index.html` | Pantallas y estilos |
| `app.js` | Lógica: proyectos, plano 2D, 3D (WebGL sin librerías), cálculo, presupuesto, gastos y exportación |
| `sw.js` | Modo sin internet y actualizaciones |
| `manifest.webmanifest` | Nombre, colores e íconos para instalarla |
| `` | Íconos de la app |

Las cantidades son una estimación para presupuesto. Las secciones de columnas, vigas y acero deben revisarse con un ingeniero según el Reglamento Nacional de Construcción.
