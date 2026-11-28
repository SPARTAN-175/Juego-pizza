PIZZA DELIVERY SIMULATOR — STREET EDITION 1.7

Instalación: descomprime y sube todos los archivos a la raíz del repositorio de GitHub Pages. En el teléfono, cierra por completo la PWA anterior y vuelve a abrirla para que el nuevo service worker sustituya la caché anterior.

Cambios 1.1:
- Los pedidos externos aparecen automáticamente en intervalos aleatorios (aprox. 45 a 150 segundos), si no hay otro pedido externo pendiente o activo.
- Pedidos de tienda: primero se navega a la tienda; al confirmar la compra, el destino cambia al domicilio del cliente; al llegar se cobra y se recuperan los productos adelantados más tarifa y propina.
- Pedidos de pizza externos siguen un flujo directo al cliente.
- Se amplió a 100 m el radio de llegada/confirmación para tolerar el ajuste de destino a la calle que hace OSRM.
- Las compras/servicios de negocios personalizados requieren estar a menos de 85 m del local.
- Turbo: 12 segundos activo y 60 segundos de recarga después de terminar el impulso; requiere combustible.
- Reserva de combustible: aparece cuando el tanque principal llega a cero; se activa manualmente y es limitada.

Se conserva la navegación por Leaflet/OSRM y la conducción por ruta. Los negocios personalizados continúan guardándose localmente en el dispositivo.

Validación realizada: `node --check app.js` y prueba de integridad del ZIP. No se ejecutó una prueba completa en navegador real; se debe probar la ruta y el flujo de pedidos en el teléfono.

Ajustes 1.1:
- Se eliminaron los botones de cambio de carril que no tenían una función útil.
- El botón inferior ahora es REVERSA: frena la marcha hacia delante y después mueve la moto hacia atrás por la ruta actual.
- Turbo activo durante 60 segundos y recarga automática durante 60 segundos.
- Reserva de combustible conservada en 8%.

AJUSTES 1.2 — ENTREGAS Y PREPARACIÓN DE CIUDAD
- La confirmación de entregas ahora se basa en la distancia restante al extremo de la ruta ajustada por OSRM, con margen de 160 m. Esto evita depender de una coordenada de domicilio que puede quedar fuera de la calle transitable.
- Cada pizza propia entregada registra una venta de $275 MXN para el negocio.
- Los pedidos de tienda solo se generan si existe al menos una tienda personalizada activa.
- Al aceptar una compra, el juego toma la ubicación de una tienda colocada en el mapa; primero se navega a esa tienda y después al domicilio del cliente.
- El panel NEGOCIOS indica cuántas tiendas, gasolineras y otros negocios hay colocados.
- Deben colocarse manualmente en el mapa las ubicaciones que se quieran usar. No se inventan comercios reales ni se crean ubicaciones aleatorias de tiendas.

AJUSTES 1.3 — TECLADO, VELOCIDAD, CONSUMO Y RESPONSIVIDAD
- Teclado: W o flecha arriba para avanzar; S o flecha abajo para frenar y luego retroceder. Las teclas se ignoran al escribir en campos de texto.
- Velocidad inicial ajustada a 12.5 m/s (45 km/h), manteniendo la progresión por nivel.
- Turbo: 60 segundos activo y 15 segundos de recarga después de terminar.
- Consumo de gasolina y hambre/energía ajustado para que sea perceptible mientras el vehículo se mueve.
- La reserva del 8% se activa automáticamente cuando el tanque principal llega a cero y se consume después.
- Controles y paneles más grandes en escritorio; los estilos compactos existentes se conservan en móviles.

AJUSTES 1.4 — NOCHE, RUTA Y CRECIMIENTO DEL NEGOCIO
- Faros de tráfico visibles por la noche y alumbrado de postes distribuidos a lo largo de la ruta activa.
- La ruta verde se dibuja dinámicamente desde la posición del jugador hasta el destino y se acorta conforme avanza.
- Consumo más perceptible de combustible (0.035%/s), hambre (0.035%/s), energía (0.02%/s) y condición del vehículo mientras se conduce.
- Controles superiores, HUD y paneles ampliados en escritorio; reglas compactas conservadas para móvil.
- Módulo de pizzería propia: compra del local por $12,000, contratación de repartidores por $2,500.
- Cada repartidor simula entregas en ciclos de 90 segundos: ventas $220, costo operativo $70, utilidad $150 por repartidor y ciclo. El saldo, ventas y entregas se guardan localmente.
- Los repartidores aparecen como marcadores móviles sobre la ruta activa del juego; la simulación de rutas autónomas independientes y recogida de pedidos reales es una fase posterior.

AJUSTES 1.5 — MODO LIBRE Y HORARIO
- En modo libre: velocidad máxima normal de 70 km/h; turbo libre hasta 100 km/h.
- Turbo en modo libre dura 10 minutos y, al terminar, inicia una recarga de 15 segundos.
- En modo normal se conserva la configuración anterior: velocidad y turbo actuales sin cambios.
- Horario del ciclo: tarde desde 16:30, iluminación de faros y postes desde 18:30, amanecer desde 06:00 y salida de la noche a las 06:00.


AJUSTES 1.6 — TIEMPO Y DISTANCIA EN MODO LIBRE
- La velocidad normal del modo libre queda en 30.225 km/h simulados.
- El turbo del modo libre queda en 40.3 km/h simulados; conserva 10 minutos de activación y 15 segundos de recarga.
- La simulación de desplazamiento en modo libre avanza 60 segundos de recorrido por cada segundo real. Así, 60.45 km representan aproximadamente 2 minutos reales en normal y 1 minuto 30 segundos reales con turbo, si se mantiene la velocidad objetivo.
- El reloj del mundo avanza 1 minuto de juego por segundo real (escala 60x). Un trayecto de 90 segundos representa 90 minutos de mundo; uno de 120 segundos representa 2 horas.
- La conducción del modo de entregas se conserva sin acelerar su desplazamiento.
- La aceleración inicial, frenadas, tráfico, paradas y recalculados pueden modificar ligeramente el tiempo final; las cifras son objetivos teóricos en ruta continua.

Validación 1.6: `node --check app.js` y prueba de integridad del ZIP. No se realizó prueba de juego en navegador real.


AJUSTES 1.7 — COMPRESIÓN MODERADA DEL TIEMPO EN MODO LIBRE
- Se reduce la escala de desplazamiento del modo libre de 60x a 10x para evitar el efecto de velocidad extrema de la versión 1.6.
- Se ajusta el reloj del mundo a 10x: avanza 10 minutos simulados por cada minuto real.
- Con las velocidades simuladas de 30.225 km/h normal y 40.3 km/h turbo, una ruta continua de 60.45 km representa aproximadamente 12 minutos reales en normal (2 horas simuladas) y 9 minutos reales en turbo (1.5 horas simuladas).
- El velocímetro muestra la velocidad simulada configurada; el desplazamiento geográfico está comprimido 10x para que los trayectos largos no requieran el tiempo completo de la vida real.
- Se conserva el mapa completo y no se modifica la conducción del modo de entregas.
- El turbo libre conserva 10 minutos de activación y 15 segundos de recarga.

Validación 1.7: `node --check app.js` y prueba de integridad del ZIP. No se realizó una prueba de juego en navegador real. La duración real puede variar por aceleración, frenadas, tráfico, paradas y recalculados de ruta.


AJUSTES 1.8 — ESTIMACIÓN DE VIAJE Y MODO LIBRE SIN PEDIDOS
- Velocidad de referencia en modo libre: 60 km/h normal y 80 km/h con turbo.
- El cálculo usa la distancia real devuelta por OSRM: tiempo real de referencia = distancia (km) / velocidad (km/h) × 60.
- La experiencia conserva compresión 10x para desplazamiento y reloj del mundo. La duración jugable estimada es el tiempo de referencia dividido entre 10.
- La tarjeta de navegación muestra ETA normal y ETA turbo para cada destino, además del equivalente de tiempo real.
- En modo libre se oculta el botón PEDIDOS, se cancelan solicitudes entrantes y se pausa la generación automática. Si existe un pedido aceptado, se debe terminar antes de entrar al modo libre.
- Al volver al modo reparto se reactiva la generación de pedidos.
- La velocidad de referencia es un promedio configurable, no una promesa de velocidad constante. Curvas, paradas, tráfico y aceleración pueden cambiar la duración observada.

MAPA SIN INTERNET — LIMITACIÓN IMPORTANTE
- La aplicación y sus archivos pueden abrirse como PWA, pero el mapa base, la búsqueda de localidades y el cálculo de rutas usan proveedores externos.
- No se incorporó una descarga masiva de mosaicos: los servidores públicos actuales de OpenStreetMap, CARTO y Esri tienen condiciones de uso y caché distintas; no se debe asumir que permiten descargar zonas completas para uso offline.
- Para un mapa offline real se necesita integrar un proveedor con licencia explícita para paquetes offline o alojar mosaicos propios (por ejemplo, un paquete MBTiles/PMTiles servido localmente), además de datos de rutas y búsqueda offline. No se anuncia compatibilidad offline completa hasta implementar y probar esa solución.

Validación 1.8: `node --check app.js` y prueba de integridad del ZIP. No se realizó una prueba de conducción en navegador real.
