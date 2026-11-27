# Propuesta IA — revisión editorial de llamadas y conversación laboral

Fecha: 2026-11-27. Estado: lote preparado para revisión y CI. Seguimiento: Issue #544 y Pull Request asociado.

## Base y coordinación

- Referencia: `main` en `34a9e0f1476df4e5c01839dd0b0a528910f0a074`.
- Rama de trabajo: `malu/learn-german-editorial-20261127`.
- Se leyeron `AGENTS.md`, los estándares de artículos y revisión, y los flujos vigentes de contenido, Living, Events e imágenes.
- Se revisaron los cuatro PR abiertos: #543 (fuente de Sternsinger), #542 (Frankfurt, Múnich y compras en alemán), #505 (Inkasso, Mahnbescheid y BundID) y #495 (Aachen, Múnich y prestaciones). También se consultó el Issue #522 de fuentes oficiales.
- Ninguno de esos PR modifica los dos Markdown elegidos. Los archivos generados compartidos, como el registro de Learn German, el índice de búsqueda, la portada y el sitemap, pueden necesitar regeneración al actualizar la rama antes de abrir el PR.

## Cambios propuestos

| Artículo | Mejora |
| --- | --- |
| G011 — `telephone-phrases` | Traducción japonesa de los dos diálogos, identificación explícita de los ejemplos ficticios, separación de las formas `Frau` y `Herrn`, y ejemplo de deletreo coherente con la tabla de ciudades de DIN. Se explica que su uso es voluntario. |
| G012 — `workplace-conversation-phrases` | Explicación práctica de `Sie` y `du`, preguntas sobre trabajo, plazos y prioridades, diálogo con fecha menos ambigua, traducción japonesa del diálogo y del correo, y traducción más precisa de `Danke für Ihre Geduld`. |
| Ambas portadas | Sustitución de escenas con texto pequeño por ilustraciones claras de una llamada y una conversación laboral. Textos alternativos específicos, aviso visible de generación con IA, variantes WebP de 1200/768/480 píxeles y vista social JPEG. No representan personas ni reuniones reales. |
| Interior de G012 | Diagrama SVG original y accesible de las tres preguntas: contenido del trabajo, plazo y prioridad. El texto equivalente permanece en la tabla del artículo. |
| Archivos generados | Markdown sincronizado con el registro, páginas de artículos y hub, índice de búsqueda y sitemap. Las etiquetas de eventos de la portada avanzan automáticamente al 27 de noviembre por la nueva fecha editorial. |

Se conservaron IDs, slugs, URLs, títulos, fechas de publicación y valores previos de `last_verified`. La fecha `updated_at` cambia por la edición; no representa una nueva verificación integral ni una revisión humana nativa.

No se encontraron artículos en español en los registros ni rutas de contenido en español. La edición editorial activa es japonesa; inglés y alemán tienen páginas de espera. No se creó una nueva edición ni se publicaron traducciones sin un flujo acordado. Se verificó acceso al registro de Search Console para priorizar los lotes siguientes; no se publican sus métricas privadas en el repositorio ni se atribuye a estos cambios una mejora de tráfico medida. Los cambios de CTR del PR #542 se evitan.

## Fuentes y enlaces

Fuentes abiertas y consultadas el 2026-11-27:

- [DIN — Von Aachen bis Zwickau](https://www.din.de/de/din-und-seine-partner/presse/mitteilungen/von-aachen-bis-zwickau-867074): publicación de la tabla de ciudades, ejemplos Aachen y Salzwedel y carácter voluntario. Respuesta HTTP 200 en comprobación directa.
- [Goethe-Institut — Auf der Arbeit: Du oder Sie?](https://www.goethe.de/de/spr/ueb/daa/all/ds0/ds1.html): recurso didáctico del proveedor para practicar el trato en el trabajo. Respuesta HTTP 200. Las frases añadidas son ejemplos editoriales originales; no se atribuyen al Goethe-Institut.

Las seis rutas internas únicas enlazadas desde los dos Markdown tienen un `index.html` existente. No se identificaron enlaces rotos en este lote. Esto no constituye una auditoría de todos los enlaces externos del sitio.

## Comprobaciones

- `npm ci --ignore-scripts --no-audit --no-fund`: correcto.
- Generación y validación de la base antes de editar: correctas, sin diferencias generadas.
- `npm run build`: correcto tras los cambios.
- `npm run validate`: 38 grupos de comprobaciones estáticas correctos. Incluyen sincronización, contenido, imágenes y créditos, accesibilidad estructural, enlaces/rutas, SEO y artefacto generado.
- Resultado SEO del artefacto: 312 HTML y 243 URLs en el sitemap comprobados.
- `node scripts/check-content-metadata-regression.mjs --base-ref origin/main`: correcto.
- `git diff --check`: correcto.
- `npm run validate:all`: la generación y las 38 comprobaciones estáticas pasan; su configuración de navegador predeterminada no puede arrancar porque la descarga de Chromium devuelve HTTP 403. No se presenta este comando exacto como aprobado.
- Se ejecutó la misma suite de Playwright con una configuración temporal fuera del repositorio que cambia únicamente el ejecutable y sus opciones de lanzamiento, la ruta absoluta de pruebas y el número de trabajadores. Chromium 158.0.8127.0 se obtuvo mediante el paquete de registro `@sparticuz/chromium` 158.0.0. Resultado: **147 pruebas aprobadas y 3 omitidas por la suite, sin fallos, en 4,9 minutos**. Se conservaron los mismos proyectos de escritorio, móvil y tableta y sus tamaños. No se cambió la configuración ni las dependencias del proyecto.
- Revisión adicional de los dos artículos a 1440 y 360 píxeles: sin desbordamiento horizontal, imágenes visibles cargadas y sin infracciones automáticas WCAG A/AA detectadas por axe. Se generaron capturas y se inspeccionó la legibilidad del diagrama móvil. La revisión automática no sustituye una auditoría humana completa.
- `node scripts/image-asset-budget.mjs --check`: correcto después de optimizar las exportaciones. Los dos archivos WebP principales pesan menos de 56 KB cada uno. El presupuesto original del repositorio se conserva.
- SVG: XML válido, `title`, `desc` y texto equivalente en el artículo.

## Flujo de cierre

1. Conexión oficial de GitHub verificada, con lectura y escritura sobre el repositorio. La publicación de la rama usa esta conexión y no requiere credenciales en el chat ni una sesión CLI adicional.
2. Actualizar desde el `main` más reciente y volver a comprobar PR e Issues para evitar duplicados. Resolver las diferencias compartidas mediante regeneración.
3. Confirmar la CI de la rama con el navegador estándar de CI.
4. Abrir un PR en borrador, revisar el diff final y respetar cualquier regla de protección antes de la fusión. La revisión lingüística nativa adicional es recomendable; no se presenta esta revisión asistida como una certificación humana.
5. Tras una fusión autorizada, verificar el despliegue existente, su SHA y las páginas afectadas en producción.

No se modificaron infraestructura, credenciales, permisos ni automatizaciones de despliegue. No se llamaron APIs de IA externas de pago ni se enviaron mensajes externos al seguimiento autorizado del proyecto. Las ilustraciones se produjeron con la generación de imágenes integrada en ChatGPT, usando únicamente las portadas del proyecto como referencias. La CI y el despliegue se tramitan mediante los workflows existentes.

## Procedencia de las imágenes y especificaciones

Los archivos WebP/JPEG sustituyen portadas del propio proyecto. No se descargaron fotografías ajenas. La generación integrada de ChatGPT produjo ilustraciones originales que se exportaron sin cambios semánticos a los tamaños de distribución; el SVG se escribió como gráfico editable, con texto exacto.

Prompt de la portada laboral:

> Use case: style-transfer. Edit target: the supplied J-Connect workplace conversation cover. Create a replacement 16:9 editorial cover illustration about colleagues communicating at work in German. Preserve the subject of three adult colleagues having a calm, collaborative conversation around an office table, but simplify the entire composition for a small mobile article thumbnail: make the three people and their gestures large and central, show a single open notebook and a laptop on the table, and a quiet light office background. Use a polished contemporary editorial illustration style with natural human proportions, refined flat color and subtle paper texture, restrained navy, teal and warm neutral tones. Make it unmistakably an illustration, not a documentary photograph. Remove all writing, labels, charts, glyphs, letters, slogans, logos and decorative diagrams from the original. No on-image text, no watermark. Keep every important person and gesture inside the central 75 percent so responsive cropping preserves the subject. Wide landscape 16:9.

Prompt de la portada de llamadas:

> Use case: style-transfer. Edit target: the supplied telephone-language article cover. Create a replacement 16:9 editorial illustration about making a telephone appointment in German. Keep the subject of preparing for a phone conversation at a desk, but replace the busy written notes and fabricated phone UI with a clean, memorable illustrated scene: an adult seated at a simple light desk holds a smartphone to their ear and makes a brief note with a pen, with one small blank appointment calendar nearby. Make the person, phone and writing hand the large central visual subject so it remains clear at a 240px thumbnail. Polished contemporary editorial illustration with natural human proportions, subtle paper texture, navy, teal and warm neutral tones matching the workplace conversation illustration from this project. Unmistakably illustrated rather than photographic. No letters, numbers, writing, logos, slogans, watermarks, readable screens or documentary claims. No anatomy errors or duplicate objects. Keep critical elements within the central 75 percent of the wide landscape 16:9 composition.
