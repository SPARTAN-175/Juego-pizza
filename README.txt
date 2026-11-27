PIZZA DELIVERY SIMULATOR — STREET EDITION 0.9

Instalación:
1. Descomprime el ZIP.
2. Sube TODOS los archivos a la raíz de tu repositorio de GitHub Pages.
3. Espera a que GitHub Pages publique los cambios.
4. Abre la URL desde el teléfono, instala la PWA y úsala en horizontal.

Conservación:
- Se conserva el mapa Leaflet, proveedor de mapas, OSRM, tráfico, rutas y conducción por destino de Street Edition 0.6.
- No se incorporó el sistema experimental de Overpass para conducir por calles manualmente.
- Se reorganizaron los controles para pantallas horizontales pequeñas.

Novedades 0.9:
- Panel de pedidos con aceptación/rechazo y cuenta regresiva de 15 segundos.
- Pedidos de pizza y compras de tienda.
- En compras, el costo de productos se adelanta del saldo y se recupera al cobrar; la ganancia es tarifa + propina.
- Negocios personalizados colocables en el mapa: gasolinera, tienda, comedor/restaurante, cafetería, ropa, taller, hospital, pizzería y otros.
- Los negocios se guardan localmente en este dispositivo y pueden editarse, moverse, activarse/desactivarse o eliminarse.
- Economía básica: saldo, combustible, hambre, energía y estado del vehículo.
- Ciclo horario acelerado con tinte nocturno/amanecer.
- Turbo temporal con enfriamiento y consumo adicional de combustible.

Alcance y pruebas:
- JavaScript validado con node --check y ZIP verificado.
- No se pudo completar una prueba visual automatizada del navegador en este entorno.
- Los negocios de OpenStreetMap no se importan automáticamente todavía. Si una zona no tiene puntos etiquetados, se pueden crear negocios manualmente desde el botón NEGOCIOS.
- La persistencia de negocios usa almacenamiento local del navegador; no se sincroniza entre dispositivos.
- El tráfico y las rutas requieren conexión a internet y los servicios públicos correspondientes.
