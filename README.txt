PIZZA DELIVERY SIMULATOR — STREET EDITION 1.1

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
