PIZZA DELIVERY SIMULATOR — STREET EDITION 1.5

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
