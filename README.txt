PIZZA DELIVERY SIMULATOR 0.6 — FREE DRIVE

CAMBIOS DE ESTA VERSIÓN
- Conducción manual sobre una red de calles descargada desde OpenStreetMap/Overpass.
- La moto ya no recorre automáticamente una ruta completa. El jugador acelera, frena y elige giros en las intersecciones.
- Los botones izquierda/derecha seleccionan el siguiente giro disponible cuando se llega a un cruce.
- El GPS dibuja una ruta recomendada hacia el cliente y vuelve a calcularla después de cada intersección, aunque el jugador elija otra calle.
- Domicilios situados en la red vial; para entregar hay que acercarse y detenerse.
- Tráfico con 110 vehículos simulados sobre la red de calles cargada; los vehículos toman calles y cruces de forma independiente.
- Edificios representados desde arriba usando los contornos reales disponibles en OpenStreetMap, con techo y sombra 2.5D estilizados.
- Selector de mapa: CARTO Voyager a color, OpenStreetMap clásico y satélite Esri.
- Cuando el jugador avanza fuera de la zona inicial, se solicitan datos viales adicionales alrededor de su posición y se incorporan a la red cargada.
- Niveles: cada tres entregas aumenta el nivel y la velocidad máxima.
- PWA instalable con manifest, icono y service worker para conservar los archivos de la aplicación.
- Controles adaptados a teléfono vertical y horizontal.

CONTROLES
- ▲ GAS: acelerar.
- ▼ FRENO: reducir velocidad y detenerse.
- ◀ IZQ.: elegir giro a la izquierda en el siguiente cruce.
- ▶ DER.: elegir giro a la derecha en el siguiente cruce.
- SEGUIR: centrar el mapa en la moto; al arrastrar el mapa se desactiva el seguimiento.
- ZONA: buscar otra ciudad o localidad.
- COLOR: alternar mapa a color, calles y satélite.
- CASAS: mostrar/ocultar los edificios.

REQUISITOS Y LIMITACIONES REALES
- Requiere internet para Leaflet/CDN, mosaicos cartográficos, datos viales de Overpass y geocodificación de Nominatim.
- El service worker guarda el shell de la PWA, pero NO descarga mosaicos, calles ni edificios para uso offline. No es todavía un juego offline.
- La red vial se amplía por zonas mientras conduces. El servicio Overpass puede tardar, limitar peticiones o no responder; el juego no debe consultar repetidamente en intervalos cortos.
- Los 110 vehículos comparten la red vial local descargada; no se generan consultas de ruta individuales por automóvil. El tráfico no es una simulación de física completa y no bloquea físicamente al jugador todavía.
- Los contornos de edificios solo aparecen donde OpenStreetMap tiene geometrías de construcción mapeadas. No todos los edificios de todas las localidades están registrados. El efecto de altura es una estilización 2.5D, no modelos 3D reales.
- La conducción es manual por segmentos de calle conectados. En una intersección, se elige izquierda/derecha; si no se pulsa una dirección, el GPS selecciona el siguiente tramo recomendado. Las calles sin salida pueden detener la marcha hasta elegir un giro disponible.
- No se ha implementado todavía detección de choques, accidentes, semáforos, colisiones, carriles individuales ni bloqueo de calles.
- La vista satelital es un servicio externo de Esri y puede tener condiciones de uso distintas a los mapas OSM.

PUBLICACIÓN EN GITHUB PAGES
1. Crea un repositorio público en GitHub.
2. Sube TODOS los archivos de esta carpeta a la raíz del repositorio: index.html, app.js, styles.css, manifest.webmanifest, icon.svg y sw.js.
3. En Settings > Pages selecciona Deploy from a branch, rama main y carpeta /(root).
4. Abre la URL HTTPS que GitHub Pages genere. La instalación PWA requiere HTTPS.
5. En Android, abre la URL en Chrome y usa el menú > Instalar aplicación o Añadir a pantalla de inicio.

ATRIBUCIONES
- Datos y geometrías: © OpenStreetMap contributors (ODbL).
- Mosaicos: CARTO / OpenStreetMap; OpenStreetMap estándar; Esri World Imagery.
- Librería: Leaflet 1.9.4.
