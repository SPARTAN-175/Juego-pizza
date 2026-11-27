PIZZA DELIVERY SIMULATOR — STREET EDITION 0.6 (PWA)

Esta versión parte de la Street Edition 0.5 que aparece en la captura del usuario. Conserva el mapa real, el estilo visual, los controles, las rutas OSRM, la flota de tráfico, los niveles y las entregas.

NUEVO: MODO LIBRE
- Activa el botón MODO LIBRE.
- Toca cualquier punto visible del mapa para elegir un destino.
- OSRM calcula una ruta por calles desde la posición actual hasta ese punto.
- Acelera y frena manualmente; los controles izquierda/derecha ajustan la posición lateral en el carril.
- Al llegar al destino, toca otro punto para continuar explorando.
- Usa el botón de búsqueda para centrar el mapa en otra localidad; esto cambia el punto inicial de la sesión, no simula el trayecto entre las localidades.

TRÁFICO
- Conserva 160 vehículos visuales distribuidos sobre 6 rutas OSRM compartidas.
- Al avanzar aproximadamente 7 km, el juego vuelve a generar rutas de tráfico alrededor de la nueva zona para que aparezcan vehículos en localidades posteriores.
- Las solicitudes se escalonan para no generar 160 peticiones individuales.

LO QUE NO DEBE CONFUNDIRSE
- La moto requiere acelerador y freno, pero la geometría OSRM sigue guiando automáticamente las curvas de la ruta seleccionada. Los botones izquierda/derecha son ajustes de carril, no un volante libre para escoger cualquier giro.
- Para tener conducción completamente libre con elección de cada intersección se necesita un motor de red vial navegable o un servicio de navegación que proporcione decisiones de giro; esta edición ofrece exploración manual de destinos y desvíos mediante puntos seleccionados en el mapa.
- La búsqueda de otra localidad cambia el punto de inicio de la sesión; no permite todavía conducir físicamente una ruta intermunicipal continua desde la zona anterior.

REQUISITOS
- Internet para mapas, geocodificación y OSRM.
- Geolocalización requiere HTTPS y permiso del navegador.
- OSRM demo y Nominatim son servicios públicos sin garantía de disponibilidad. Las políticas y límites de los proveedores pueden cambiar.
- No usa Firebase.
- PWA: se instala desde el menú de Chrome cuando se publica en GitHub Pages/HTTPS.
