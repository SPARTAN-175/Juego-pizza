// Pizza Delivery Simulator 0.3
// Reutiliza el enfoque de navegación de MOTI GO: Leaflet Routing Machine + waypoints.
const DEFAULT_CENTER=[17.4056,-93.3371]; // Ostuacán, Chiapas (respaldo)
const $=id=>document.getElementById(id);
const map=L.map('map',{
  zoomControl:false, attributionControl:true, dragging:true, touchZoom:true,
  doubleClickZoom:true, scrollWheelZoom:false, boxZoom:false, keyboard:false
}).setView(DEFAULT_CENTER,17);

// Mismo proveedor de mosaicos que MOTI GO: OpenStreetMap, sin API key.
const mapStyles=[
 {name:'Color',url:'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',attr:'© OpenStreetMap contributors © CARTO'},
 {name:'Calles',url:'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',attr:'© OpenStreetMap contributors'},
 {name:'Satélite',url:'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',attr:'Tiles © Esri'}
];
let mapStyleIndex=0;
let mapTiles=L.tileLayer(mapStyles[0].url,{maxZoom:19,attribution:mapStyles[0].attr,crossOrigin:true}).addTo(map);
mapTiles.on('tileerror',()=>showToast('No se pudieron cargar algunos mosaicos. Comprueba tu conexión.'));
function cycleMapStyle(){
 map.removeLayer(mapTiles);mapStyleIndex=(mapStyleIndex+1)%mapStyles.length;
 const style=mapStyles[mapStyleIndex];mapTiles=L.tileLayer(style.url,{maxZoom:19,attribution:style.attr,crossOrigin:true}).addTo(map);
 mapTiles.on('tileerror',()=>showToast('No se pudo cargar esta vista. Prueba otra.'));
 $('mapStyle').innerHTML='◫ <span>'+style.name+'</span>';
}

L.control.zoom({position:'bottomright'}).addTo(map);

let origin=L.latLng(DEFAULT_CENTER[0],DEFAULT_CENTER[1]);
let playerPos=origin;
let playerMarker=null, customerMarkers=[], routeControl=null, routeCoords=[], routeCumulative=[], detourMarker=null;
let routeLength=0, progress=0, speed=0, heading=0, laneOffset=0;
let targetIndex=0, deliveries=0, routeReady=false, routePending=false;
let routeProgressLine=null, routeOutlineLine=null, streetLampMarkers=[], lastNightLighting=null;
let pizzeriaOwned=false, hiredDrivers=0, businessIncomeTimer=0, fleetMarkers=[];
let businessStats={revenue:0,deliveries:0};

let level=1, elapsedSeconds=0;
let followPlayer=true, mode='game';
let freeDriveMode=false, freeDestination=null, freeDestinationMarker=null, lastTrafficRefreshPos=null, trafficRefreshBusy=false;
let accelerate=false, brake=false, autoDrive=false;
let lastFrame=performance.now(), toastTimer=null, offRouteFrames=0, lastRerouteAt=0, trafficAccumulator=0;
const BASE_MAX_SPEED=12.5; // 45 km/h al inicio
const FREE_NORMAL_SPEED=60/3.6; // Velocidad media de referencia en conducción libre
const FREE_TURBO_SPEED=80/3.6; // Velocidad media de referencia con turbo
const FREE_TIME_SCALE=12; // Compresión arcade: un viaje de ~166 km dura ~13 min 50 s a 60 km/h
let MAX_SPEED=BASE_MAX_SPEED;
const ACCEL=5.0, BRAKE=8.0;
const CLIENTS=[
  {name:'Cliente 1',offset:[0.0010,0.0011]},
  {name:'Cliente 2',offset:[-0.0010,0.0017]},
  {name:'Cliente 3',offset:[0.0017,-0.0010]}
];
// Tráfico independiente: cada automóvil recibe una ruta propia de OSRM.
const traffic=[];
const TRAFFIC_TARGET=160;
const TRAFFIC_ROUTE_COUNT=6;
let trafficQueueTimer=null;
let trafficGeneration=0;
let sharedTrafficRoutes=[];
const TRAFFIC_COLORS=['#e34d3d','#4387c5','#e4ae32','#e67838','#54a868','#e9e9e9','#626b78','#b86bc4','#e66e9c','#48b9b0'];


const riderSvg=`<svg class="rider-art" viewBox="0 0 40 64" xmlns="http://www.w3.org/2000/svg">
 <ellipse cx="20" cy="32" rx="15" ry="28" fill="#10251c" opacity=".18"/>
 <rect x="14" y="3" width="12" height="15" rx="5" fill="#202a2b" stroke="#fff" stroke-width="1.4"/>
 <rect x="11" y="17" width="18" height="30" rx="8" fill="#20a66b" stroke="#fff" stroke-width="1.5"/>
 <path d="M14 22 L26 22 L29 40 L11 40Z" fill="#f4a62a"/>
 <circle cx="20" cy="27" r="6.5" fill="#f1c59d" stroke="#fff" stroke-width="1"/>
 <path d="M13 25 Q20 14 27 25 L25 28 L15 28Z" fill="#f3c83f" stroke="#fff" stroke-width="1"/>
 <rect x="15" y="45" width="10" height="14" rx="4" fill="#202a2b" stroke="#fff" stroke-width="1.2"/>
 <circle cx="20" cy="7" r="2.3" fill="#fff5b4"/>
 </svg>`;
const carSvg=`<svg class="traffic-art" viewBox="0 0 28 46" xmlns="http://www.w3.org/2000/svg">
 <rect x="3" y="1" width="22" height="44" rx="7" fill="#26343b" stroke="#fff" stroke-width="1.4"/>
 <rect x="5" y="8" width="18" height="11" rx="3" fill="#9ed1dc"/>
 <rect x="5" y="27" width="18" height="10" rx="3" fill="#9ed1dc"/>
 <rect x="2" y="5" width="3" height="7" rx="1" fill="#ffe7a2"/><rect x="23" y="5" width="3" height="7" rx="1" fill="#ffe7a2"/>
 <path class="headlight-beam" d="M4 7 L-1 -2 L7 -2 L7 7Z" fill="#ffe9a1" opacity=".45"/><path class="headlight-beam" d="M24 7 L21 -2 L29 -2 L29 7Z" fill="#ffe9a1" opacity=".45"/>
 <rect x="2" y="34" width="3" height="7" rx="1" fill="#fa6558"/><rect x="23" y="34" width="3" height="7" rx="1" fill="#fa6558"/>
 <path d="M7 21 H21 V25 H7Z" fill="#52636a"/>
 </svg>`;

function icon(html,cls,size,anchor){
 return L.divIcon({className:cls,html,iconSize:size,iconAnchor:anchor});
}
function riderIcon(){return icon(`<div id="riderArt">${riderSvg}</div>`,'rider-marker',[34,48],[17,24])}
function customerIcon(){return icon('<div class="customer-pin">🍕</div>','customer-marker',[31,31],[15,28])}
function trafficIcon(){return icon(`<div class="car-wrap">${carSvg}</div>`,'traffic-marker',[22,34],[11,17])}
function showToast(msg){
 const el=$('toast');el.textContent=msg;el.classList.add('show');
 clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),1900);
}
function setFollow(on){
 followPlayer=on;
 $('follow').classList.toggle('active',on);
 $('follow').innerHTML=on?'◎ <span>SEGUIR</span>':'◎ <span>MAPA LIBRE</span>';
 if(on)map.panTo(playerPos,{animate:true,duration:.25});
}
map.on('dragstart',()=>setFollow(false));
$('follow').addEventListener('click',()=>setFollow(true));
$('zoomIn').addEventListener('click',()=>map.zoomIn());
$('zoomOut').addEventListener('click',()=>map.zoomOut());
$('mapStyle').addEventListener('click',cycleMapStyle);

function distance(a,b){return map.distance(a,b)}
function bearing(a,b){
 const p1=a.lat*Math.PI/180,p2=b.lat*Math.PI/180,dl=(b.lng-a.lng)*Math.PI/180;
 const y=Math.sin(dl)*Math.cos(p2),x=Math.cos(p1)*Math.sin(p2)-Math.sin(p1)*Math.cos(p2)*Math.cos(dl);
 return (Math.atan2(y,x)*180/Math.PI+360)%360;
}
function pointAt(meters){
 if(!routeCoords.length)return playerPos;
 const d=Math.max(0,Math.min(meters,routeLength));
 let lo=0,hi=routeCumulative.length-1;
 while(lo<hi){const mid=(lo+hi)>>1;if(routeCumulative[mid]<d)lo=mid+1;else hi=mid;}
 const i=Math.max(1,lo),a=routeCoords[i-1],b=routeCoords[i];
 const seg=routeCumulative[i]-routeCumulative[i-1];
 const t=seg>0?(d-routeCumulative[i-1])/seg:0;
 return L.latLng(a.lat+(b.lat-a.lat)*t,a.lng+(b.lng-a.lng)*t);
}
function bearingAt(meters){
 const p1=pointAt(Math.max(0,meters-1)),p2=pointAt(Math.min(routeLength,meters+2));
 return bearing(p1,p2);
}
function offsetPoint(p,brg,meters){
 const r=brg*Math.PI/180,lat=p.lat+(meters*Math.cos((r+90)*Math.PI/180))/111320;
 const lng=p.lng+(meters*Math.sin((r+90)*Math.PI/180))/(111320*Math.cos(p.lat*Math.PI/180));
 return L.latLng(lat,lng);
}
function buildCumulative(coords){
 routeCumulative=[0];routeLength=0;
 for(let i=1;i<coords.length;i++){routeLength+=distance(coords[i-1],coords[i]);routeCumulative.push(routeLength);}
}
function createCustomers(){
 customerMarkers.forEach(m=>map.removeLayer(m));customerMarkers=[];
 CLIENTS.forEach((c,i)=>{
  const p=L.latLng(origin.lat+c.offset[0],origin.lng+c.offset[1]);
  const m=L.marker(p,{icon:customerIcon(),zIndexOffset:300}).addTo(map).bindPopup(`<b>${c.name}</b><br>Pedido de pizza`);
  customerMarkers.push(m);
 });
 targetIndex=0;deliveries=0;$('deliveries').textContent='0/3';$('level').textContent=String(level);$('timer').textContent='00:00';
}
function updateMission(){
 $('deliveries').textContent=`${deliveries}/3`;
 if(freeDriveMode){
  $('missionName').textContent='Conducción libre';
  if(freeDestination)$('missionDistance').textContent=`A ${Math.round(distance(playerPos,freeDestination))} m del destino`;
  else $('missionDistance').textContent='Toca el mapa para elegir destino';
  $('deliver').disabled=true;
  return;
 }
 if(targetIndex>=CLIENTS.length){$('deliver').disabled=true;return;}
 $('missionName').textContent=CLIENTS[targetIndex].name;
 const target=customerMarkers[targetIndex]?.getLatLng();
 if(target){
  const d=distance(playerPos,target);
  $('missionDistance').textContent=`A ${Math.round(d)} m del cliente`;
  $('deliver').disabled=!destinationReached(160);
 }
}

function destinationReached(maxRemaining=140){
 if(!routeReady||routePending||!routeCoords.length)return false;
 const remaining=Math.max(0,routeLength-progress);
 return remaining<=maxRemaining || distance(playerPos,routeCoords[routeCoords.length-1])<=maxRemaining;
}

function updateRider(){
 if(!playerMarker)playerMarker=L.marker(playerPos,{icon:riderIcon(),zIndexOffset:1000,interactive:false}).addTo(map);
 else playerMarker.setLatLng(playerPos);
 const art=document.querySelector('#riderArt .rider-art');
 if(art)art.style.transform=`rotate(${heading}deg)`;
}

function randomNearbyPoint(center, radiusMeters=1350){
 const angle=Math.random()*Math.PI*2;
 const radius=250+Math.random()*radiusMeters;
 const lat=center.lat+(Math.cos(angle)*radius)/111320;
 const lng=center.lng+(Math.sin(angle)*radius)/(111320*Math.cos(center.lat*Math.PI/180));
 return L.latLng(lat,lng);
}
function cumulativeFor(coords){
 const cumulative=[0];let total=0;
 for(let i=1;i<coords.length;i++){total+=map.distance(coords[i-1],coords[i]);cumulative.push(total);}
 return {cumulative,total};
}
function trafficPointAt(car,meters){
 const d=Math.max(0,Math.min(meters,car.length));
 let lo=0,hi=car.cumulative.length-1;
 while(lo<hi){const mid=(lo+hi)>>1;if(car.cumulative[mid]<d)lo=mid+1;else hi=mid;}
 const i=Math.max(1,lo),a=car.coords[i-1],b=car.coords[i];
 const seg=car.cumulative[i]-car.cumulative[i-1],t=seg>0?(d-car.cumulative[i-1])/seg:0;
 return L.latLng(a.lat+(b.lat-a.lat)*t,a.lng+(b.lng-a.lng)*t);
}
function trafficBearingAt(car,meters){
 return bearing(trafficPointAt(car,Math.max(0,meters-1)),trafficPointAt(car,Math.min(car.length,meters+2)));
}
function setTrafficRoute(car,coords,progress=0,direction=1){
 if(!coords||coords.length<2)return false;
 const path=direction===1?coords:coords.slice().reverse();
 const built=cumulativeFor(path);if(built.total<100)return false;
 car.coords=path;car.cumulative=built.cumulative;car.length=built.total;
 car.progress=Math.max(0,Math.min(progress,built.total));car.speed=5.5+Math.random()*7.0;car.offset=(Math.random()-.5)*2.0;
 car.marker.setLatLng(offsetPoint(trafficPointAt(car,car.progress),trafficBearingAt(car,car.progress),car.offset));
 const art=car.marker.getElement()?.querySelector('.traffic-art');
 if(art)art.style.transform=`rotate(${trafficBearingAt(car,car.progress)}deg)`;
 return true;
}
async function fetchSharedTrafficRoute(start,destination,generation){
 const url=`https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson&steps=false`;
 try{
  const response=await fetch(url,{headers:{'Accept':'application/json'}});if(!response.ok)throw Error('OSRM HTTP '+response.status);
  const data=await response.json();if(generation!==trafficGeneration||!data.routes?.[0]?.geometry?.coordinates)return null;
  return data.routes[0].geometry.coordinates.map(([lng,lat])=>L.latLng(lat,lng));
 }catch(err){console.warn('No se pudo crear una ruta de tráfico:',err);return null;}
}
function spawnTrafficOnRoutes(generation){
 if(generation!==trafficGeneration||!sharedTrafficRoutes.length)return;
 traffic.forEach((car,i)=>{
  const route=sharedTrafficRoutes[i%sharedTrafficRoutes.length],dir=Math.random()<.5?1:-1;
  const length=cumulativeFor(route).total;setTrafficRoute(car,route,Math.random()*length,dir);
 });
}
async function createTrafficFleet(center=origin){
 trafficGeneration++;const generation=trafficGeneration;sharedTrafficRoutes=[];
 if(trafficQueueTimer)clearTimeout(trafficQueueTimer);
 traffic.forEach(car=>map.removeLayer(car.marker));traffic.length=0;
 // 160 coches comparten 10 rutas reales; no se hacen 160 consultas independientes.
 for(let i=0;i<TRAFFIC_TARGET;i++){
  const marker=L.marker(origin,{icon:trafficIcon(),zIndexOffset:200,interactive:false}).addTo(map);
  traffic.push({marker,coords:[],cumulative:[],length:0,progress:0,speed:0,offset:0});
 }
 const requests=[];
 for(let i=0;i<TRAFFIC_ROUTE_COUNT;i++){
  requests.push((async()=>{const a=randomNearbyPoint(center,2100),b=randomNearbyPoint(center,2900);const route=await fetchSharedTrafficRoute(a,b,generation);if(route&&generation===trafficGeneration)sharedTrafficRoutes.push(route);})());
  await new Promise(resolve=>setTimeout(resolve,450));
 }
 await Promise.all(requests);
 if(generation!==trafficGeneration)return;
 if(!sharedTrafficRoutes.length){showToast('El tráfico no pudo cargar sus rutas. Revisa internet.');return;}
 spawnTrafficOnRoutes(generation);
}
function updateTraffic(dt){
 for(const car of traffic){
  if(!car.coords?.length)continue;
  car.progress+=car.speed*dt;
  if(car.progress>=car.length-2){const route=sharedTrafficRoutes[Math.floor(Math.random()*sharedTrafficRoutes.length)];setTrafficRoute(car,route,0,Math.random()<.5?1:-1);continue;}
  const p=trafficPointAt(car,car.progress),b=trafficBearingAt(car,car.progress);
  car.marker.setLatLng(offsetPoint(p,b,car.offset));
  const art=car.marker.getElement()?.querySelector('.traffic-art');if(art)art.style.transform=`rotate(${b}deg)`;
 }
}
function routeFailed(message){
 routePending=false;routeReady=false;$('routeStatus').textContent='RUTA NO DISPONIBLE';
 $('routeKm').textContent='—';$('driveStatus').textContent='ESPERANDO RUTA';
 $('deliver').disabled=true;
 showToast(message||'No se pudo calcular la ruta. Revisa tu conexión.');
}

function updateRouteProgressLine(){
 if(!routeReady||!routeCoords.length)return;
 let idx=0;while(idx<routeCumulative.length-1&&routeCumulative[idx]<progress)idx++;
 const remaining=[pointAt(progress),...routeCoords.slice(idx+1)];
 if(!routeProgressLine){
  routeOutlineLine=L.polyline(remaining,{color:'#ffffff',weight:10,opacity:.88,lineCap:'round',lineJoin:'round',interactive:false}).addTo(map);
  routeProgressLine=L.polyline(remaining,{color:'#13b981',weight:6,opacity:1,lineCap:'round',lineJoin:'round',interactive:false}).addTo(map);
 }else{routeOutlineLine.setLatLngs(remaining);routeProgressLine.setLatLngs(remaining);}
}
function clearStreetLamps(){
 streetLampMarkers.forEach(m=>map.removeLayer(m));streetLampMarkers=[];
}
function placeStreetLamps(){
 clearStreetLamps();
 if(!routeCoords.length)return;
 const spacing=95;
 for(let at=35;at<routeLength;at+=spacing){
  const p=pointAt(at);
  const b=bearingAt(at);
  const side=(Math.floor(at/spacing)%2===0?1:-1);
  const polePos=offsetPoint(p,b,side*7);
  const marker=L.marker(polePos,{interactive:false,zIndexOffset:80,icon:icon('<div class="streetlamp"><span class="lamp-glow"></span><span class="lamp-post"></span><span class="lamp-head"></span></div>','streetlamp-marker',[34,54],[17,48])}).addTo(map);
  streetLampMarkers.push(marker);
 }
}
function setNightLighting(isNight){
 const container=map.getContainer();
 if(lastNightLighting===isNight)return;lastNightLighting=isNight;
 container.classList.toggle('night-driving',isNight);
 streetLampMarkers.forEach(m=>{
  const el=m.getElement();if(el)el.classList.toggle('lamp-on',isNight);
 });
}

function formatTravelTime(minutes){
 // Redondear hacia arriba evita mostrar 0 min en trayectos cortos.
 const totalSeconds=Math.max(0,Math.ceil(Number(minutes)*60));
 if(totalSeconds<60)return `${totalSeconds} s`;
 const totalMinutes=Math.ceil(totalSeconds/60);
 const h=Math.floor(totalMinutes/60),m=totalMinutes%60;
 return h?`${h} h ${String(m).padStart(2,'0')} min`:`${totalMinutes} min`;
}
function updateFreeTravelEstimate(distanceMeters){
 const el=$('travelEstimate');if(!el)return;
 if(!freeDriveMode||!Number.isFinite(distanceMeters)||distanceMeters<=0){el.textContent='';return;}
 const km=distanceMeters/1000;
 const normalReal=km/60*60, turboReal=km/80*60;
 const normalGame=normalReal/FREE_TIME_SCALE, turboGame=turboReal/FREE_TIME_SCALE;
 el.innerHTML=`<span>Tiempo de juego · normal <b>${formatTravelTime(normalGame)}</b></span><span>Tiempo de juego · turbo <b>${formatTravelTime(turboGame)}</b></span><small>Tiempo real de referencia: ${formatTravelTime(normalReal)} normal · ${formatTravelTime(turboReal)} turbo</small>`;
}
function requestRoute(start,destination,first=false,via=null){
 if(!routeControl){
  routeControl=L.Routing.control({
   waypoints:via?[start,via,destination]:[start,destination],
   router:L.Routing.osrmv1({serviceUrl:'https://router.project-osrm.org/route/v1',profile:'driving',timeout:30000}),
   show:false,collapsible:false,addWaypoints:false,draggableWaypoints:false,
   routeWhileDragging:false,fitSelectedRoutes:false,createMarker:()=>null,
   lineOptions:{styles:[{color:'#ffffff',weight:10,opacity:0},{color:'#13b981',weight:6,opacity:0}]}
  }).addTo(map);
  routeControl.on('routesfound',e=>{
   const r=e.routes?.[0];if(!r?.coordinates?.length){routeFailed('El servicio no devolvió una ruta.');return;}
   routeCoords=r.coordinates.map(p=>L.latLng(p.lat,p.lng));
   // Coloca el marcador del cliente sobre el extremo de calle al que OSRM ajustó el destino.
   if(activeOrder && routeCoords.length){
    activeOrder.destination=routeCoords[routeCoords.length-1];
    if(activeOrder.phase==='store'&&orderStoreMarker)orderStoreMarker.setLatLng(activeOrder.destination);else if(externalOrderMarker)externalOrderMarker.setLatLng(activeOrder.destination);
   }else if(!freeDriveMode && customerMarkers[targetIndex] && routeCoords.length){
    customerMarkers[targetIndex].setLatLng(routeCoords[routeCoords.length-1]);
   }
   buildCumulative(routeCoords);
   if(routeProgressLine){map.removeLayer(routeProgressLine);routeProgressLine=null;}
   if(routeOutlineLine){map.removeLayer(routeOutlineLine);routeOutlineLine=null;}
   routeReady=true;routePending=false;progress=0;speed=0;laneOffset=0;
   // La primera coordenada viene ajustada a la red vial por el motor de rutas.
   playerPos=routeCoords[0];heading=bearingAt(1);
   updateRider();updateRouteProgressLine();placeStreetLamps();refreshFleetMarkers();
   const routeMeters=Number(r.summary.totalDistance)||routeLength;
   const km=(routeMeters/1000).toFixed(2);
   $('routeKm').textContent=`${km} km`;
   updateFreeTravelEstimate(routeMeters);
   $('routeStatus').textContent=freeDriveMode?'RUTA LIBRE · OSRM':'RUTA POR CALLES';
   $('driveStatus').textContent=freeDriveMode?'DESTINO LIBRE · CONDUCE':'RUTA LISTA · ¡A REPARTIR!';
   if(freeDriveMode){
    $('missionName').textContent='Destino libre';
    $('missionDistance').textContent='Conduce hasta el punto elegido';
    $('deliver').disabled=true;
   }else{$('deliver').disabled=true;updateMission();}
   if(followPlayer)map.panTo(playerPos,{animate:true,duration:.25});
  });
  routeControl.on('routingerror',()=>routeFailed('No se pudo calcular por calles. Comprueba internet.'));
 }else{
  routePending=true;routeReady=false;$('routeStatus').textContent='RECALCULANDO…';
  routeControl.setWaypoints(via?[start,via,destination]:[start,destination]);
 }
 routePending=true;routeReady=false;$('routeStatus').textContent='CALCULANDO CALLES…';
 $('driveStatus').textContent='CALCULANDO RUTA';
 $('deliver').disabled=true;
}
function routeToCurrentCustomer(via=null){
 if(targetIndex>=CLIENTS.length)return;
 const target=customerMarkers[targetIndex].getLatLng();
 requestRoute(playerPos,target,false,via);
}
function finishDelivery(){
 if(activeOrder){completeActiveOrder();return;}
 if(targetIndex>=CLIENTS.length||!routeReady||routePending)return;
 if(!destinationReached(160)){showToast('Aún falta llegar al punto accesible de entrega. Sigue la ruta hasta el marcador.');return;}
 const salePrice=275; // precio de venta de la pizza completa
 wallet+=salePrice;cashReserve+=salePrice;
 map.removeLayer(customerMarkers[targetIndex]);targetIndex++;deliveries++;
 speed=0;updateEconomyHUD();showToast(`🍕 ¡Pizza entregada! Venta registrada: ${money(salePrice)} para la pizzería.`);
 if(targetIndex>=CLIENTS.length){
  level++;targetIndex=0;deliveries=0;MAX_SPEED=Math.min(19,BASE_MAX_SPEED+(level-1)*0.8);
  CLIENTS.forEach(c=>{const spread=.0015+Math.random()*.0025;c.offset=[(Math.random()-.5)*spread*2,(Math.random()-.5)*spread*2];});
  createCustomers();$('level').textContent=String(level);showToast('⭐ ¡Nivel '+level+'! Más velocidad y nuevos domicilios.');
  updateMission();routeToCurrentCustomer();return;
 }
 updateMission();routeToCurrentCustomer();
}
$('deliver').addEventListener('click',finishDelivery);

function bindHold(id,setter){
 const el=$(id);
 const down=e=>{e.preventDefault();setter(true);el.classList.add('pressed');};
 const up=e=>{e.preventDefault();setter(false);el.classList.remove('pressed');};
 el.addEventListener('pointerdown',down);
 ['pointerup','pointercancel','pointerleave','lostpointercapture'].forEach(ev=>el.addEventListener(ev,up));
}
bindHold('accelerate',v=>{if(v&&autoDrive)setAutoDrive(false);accelerate=v;});
bindHold('brake',v=>{if(v&&autoDrive)setAutoDrive(false);brake=v;});

const drivingKeys=new Set(['ArrowUp','KeyW','ArrowDown','KeyS']);
function isTypingTarget(el){return !!el&&(['INPUT','TEXTAREA','SELECT'].includes(el.tagName)||el.isContentEditable);}
window.addEventListener('keydown',e=>{
 if(isTypingTarget(e.target))return;
 if(!drivingKeys.has(e.code))return;
 e.preventDefault();
 if(e.code==='ArrowUp'||e.code==='KeyW'){if(autoDrive)setAutoDrive(false);accelerate=true;}
 if(e.code==='ArrowDown'||e.code==='KeyS'){if(autoDrive)setAutoDrive(false);brake=true;}
});
window.addEventListener('keyup',e=>{
 if(e.code==='ArrowUp'||e.code==='KeyW')accelerate=false;
 if(e.code==='ArrowDown'||e.code==='KeyS')brake=false;
});
window.addEventListener('blur',()=>{accelerate=false;brake=false;});



function gameFrame(now){
 const dt=Math.min((now-lastFrame)/1000,.05);lastFrame=now;
 trafficAccumulator+=dt;if(trafficAccumulator>=.08){updateTraffic(trafficAccumulator);trafficAccumulator=0;}
 if(routeReady){elapsedSeconds+=dt;$('timer').textContent=String(Math.floor(elapsedSeconds/60)).padStart(2,'0')+':'+String(Math.floor(elapsedSeconds%60)).padStart(2,'0');}
 if(routeReady&&routeLength>0){
  if(autoDrive)accelerate=true;
  if(accelerate){
   const freeModeCap=freeDriveMode?(Date.now()<turboUntil?FREE_TURBO_SPEED:FREE_NORMAL_SPEED):MAX_SPEED;
   speed=Math.min(freeModeCap,speed+ACCEL*dt);
  }
  else if(brake)speed=Math.max(-2.5,speed-BRAKE*dt);
  else if(speed>0)speed=Math.max(0,speed-1.8*dt);
  else if(speed<0)speed=Math.min(0,speed+2.2*dt);
  // La reversa recorre la misma ruta en sentido contrario; al soltarla,
  // la moto vuelve a detenerse suavemente.
  const movementScale=freeDriveMode?FREE_TIME_SCALE:1;
  progress=Math.max(0,Math.min(routeLength,progress+speed*dt*movementScale));
  const center=pointAt(progress);
  heading=bearingAt(progress)+(speed<-.15?180:0);
  playerPos=center;updateRouteProgressLine();
  if(!routePending&&targetIndex<CLIENTS.length&&now-lastRerouteAt>5000){
   if(distance(playerPos,center)>8)offRouteFrames++;else offRouteFrames=0;
   if(offRouteFrames>=3){offRouteFrames=0;lastRerouteAt=now;routeToCurrentCustomer();showToast('Ruta actualizada hacia el cliente.');}
  }
  updateRider();
  if(!lastTrafficRefreshPos)lastTrafficRefreshPos=playerPos;
  if(!trafficRefreshBusy&&distance(playerPos,lastTrafficRefreshPos)>7000){
   trafficRefreshBusy=true;lastTrafficRefreshPos=playerPos;
   createTrafficFleet(playerPos).finally(()=>{trafficRefreshBusy=false;});
  }
  $('speed').textContent=Math.round(Math.abs(speed)*3.6);
  $('driveStatus').textContent=speed<-.2?'REVERSA · SIGUE LA RUTA':(speed>.5?'EN RUTA · SIGUE LAS CALLES':'DETENIDO');
  if(followPlayer)map.panTo(playerPos,{animate:false});
  updateMission();
  if(progress>=routeLength-1&&speed>0)speed=0;
  if(progress>=routeLength-1&&speed<1.5){
    speed=0;accelerate=false;if(autoDrive){autoDrive=false;const ab=$('autoDrive');if(ab){ab.classList.remove('active');ab.innerHTML='🤖 <span>AUTO</span>';}}$('driveStatus').textContent=freeDriveMode?'LLEGASTE AL DESTINO · ELIGE OTRO':'HAS LLEGADO AL FINAL DE LA RUTA';
  }
 }else{$('speed').textContent='0';}
 requestAnimationFrame(gameFrame);
}


// ===== STREET EDITION 0.9: pedidos, economía ligera y negocios editables =====
let wallet=350, cashReserve=350, fuel=78, hunger=82, energy=90, vehicleHealth=100;
let gameClockMinutes=8*60, turboUntil=0, turboCooldown=0, activeOrder=null, incomingOrder=null, orderCountdown=null;
let placeEditorMode=false, selectedPlaceCategory='fuel', customPlaces=[], placeMarkers=[], externalOrderMarker=null, orderStoreMarker=null;
let randomOrderTimer=null, reserveFuel=8, reserveActive=false;
const placeCategories={
 fuel:{label:'Gasolinera',icon:'⛽',price:25},store:{label:'Tienda',icon:'🏪',price:0},restaurant:{label:'Comedor / restaurante',icon:'🍽️',price:65},cafe:{label:'Cafetería',icon:'☕',price:45},clothes:{label:'Ropa',icon:'👕',price:180},workshop:{label:'Taller',icon:'🔧',price:120},hospital:{label:'Hospital',icon:'🏥',price:0},pizzeria:{label:'Pizzería',icon:'🍕',price:0},other:{label:'Otro negocio',icon:'📍',price:0}
};
const productCatalog=[{name:'Despensa básica',price:150},{name:'Bebidas y botanas',price:75},{name:'Pan y lácteos',price:90},{name:'Comida preparada',price:110}];
function persistPlaces(){try{localStorage.setItem('pds09_custom_places',JSON.stringify(customPlaces));}catch(e){showToast('No se pudo guardar el negocio en este dispositivo.');}}
function loadPlaces(){try{customPlaces=JSON.parse(localStorage.getItem('pds09_custom_places')||'[]');}catch(e){customPlaces=[];}customPlaces.forEach(renderPlace);}
function renderPlace(place){const marker=L.marker([place.lat,place.lng],{icon:icon(`<div class="poi-pin">${placeCategories[place.category]?.icon||'📍'}</div>`,'poi-marker',[30,30],[15,15]),zIndexOffset:350}).addTo(map);marker.bindPopup(`<b>${escapeHTML(place.name)}</b><br>${placeCategories[place.category]?.label||'Negocio'}<br><button onclick="window.openPlacePanel('${place.id}')">Administrar / visitar</button>`);placeMarkers.push({id:place.id,marker});}
function escapeHTML(v){return String(v).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));}
function refreshPlaces(){placeMarkers.forEach(x=>map.removeLayer(x.marker));placeMarkers=[];customPlaces.filter(x=>x.enabled!==false).forEach(renderPlace);}
function featureRoot(){return $('featureRoot');}
function panel(html){const root=featureRoot();root.querySelector('.feature-panel')?.remove();const el=document.createElement('section');el.className='feature-panel';el.innerHTML=html;root.appendChild(el);}
function closePanel(){featureRoot().querySelector('.feature-panel')?.remove();}
function initFeatureUI(){
 const root=featureRoot();root.innerHTML=`<div id="nightTint"></div><div class="economy-hud"><span class="economy-chip" title="Dinero disponible">💵 SALDO <b id="walletVal">350</b></span><span class="economy-chip" title="Combustible restante">⛽ GASOLINA <b id="fuelVal">78</b>%</span><span class="economy-chip" title="Necesidad de comida; disminuye al conducir">🍔 HAMBRE <b id="hungerVal">82</b>%</span><span class="economy-chip" title="Energía del conductor">⚡ ENERGÍA <b id="energyVal">90</b>%</span><span class="economy-chip" title="Estado del vehículo">🛵 MOTO <b id="healthVal">100</b>%</span><span class="economy-chip" title="Hora dentro del mundo del juego">🕒 HORA <b id="clockVal">08:00</b></span></div><div class="feature-dock"><button class="feature-btn" id="ordersBtn">📦 PEDIDOS</button><button class="feature-btn" id="placesBtn">🏪 NEGOCIOS</button><button class="feature-btn" id="pizzeriaBtn">🍕 PIZZERÍA</button><button class="feature-btn" id="turboBtn">⚡ TURBO</button><button class="feature-btn" id="reserveBtn" style="display:none">⛽ RESERVA</button></div>`;
 $('ordersBtn').onclick=showOrdersPanel;$('placesBtn').onclick=showPlacesPanel;$('pizzeriaBtn').onclick=showPizzeriaPanel;$('turboBtn').onclick=activateTurbo;$('reserveBtn').onclick=activateReserve;
}
function updateEconomyHUD(){[['walletVal',Math.floor(wallet)],['fuelVal',Math.floor(fuel)],['hungerVal',Math.floor(hunger)],['energyVal',Math.floor(energy)],['healthVal',Math.floor(vehicleHealth)],['clockVal',String(Math.floor(gameClockMinutes/60)%24).padStart(2,'0')+':'+String(Math.floor(gameClockMinutes%60)).padStart(2,'0')]].forEach(([id,v])=>{const el=$(id);if(el)el.textContent=v;});const rb=$('reserveBtn');if(rb){rb.style.display=fuel<=0?'block':'none';rb.disabled=reserveFuel<=0||reserveActive;rb.textContent=reserveActive?`⛽ RESERVA ACTIVA ${Math.ceil(reserveFuel)}%`:`⛽ RESERVA DISPONIBLE ${Math.ceil(reserveFuel)}%`;}}
function money(n){return '$'+Math.round(n).toLocaleString('es-MX');}

function persistBusiness(){try{localStorage.setItem('pds13_business',JSON.stringify({pizzeriaOwned,hiredDrivers,businessStats}));}catch(e){}}
function loadBusiness(){try{const b=JSON.parse(localStorage.getItem('pds13_business')||'{}');pizzeriaOwned=!!b.pizzeriaOwned;hiredDrivers=Math.max(0,Number(b.hiredDrivers)||0);businessStats=b.businessStats||businessStats;}catch(e){}}
function courierIcon(){return icon('<div class="fleet-scooter">🛵</div>','fleet-marker',[30,30],[15,15]);}
function refreshFleetMarkers(){
 fleetMarkers.forEach(m=>map.removeLayer(m));fleetMarkers=[];
 if(!pizzeriaOwned||hiredDrivers<=0||!routeCoords.length)return;
 for(let i=0;i<hiredDrivers;i++){
  const marker=L.marker(pointAt((routeLength/(hiredDrivers+1))*(i+1)),{icon:courierIcon(),zIndexOffset:420,interactive:false}).addTo(map);
  fleetMarkers.push(marker);
 }
}
function updateFleet(dt){
 if(!pizzeriaOwned||!hiredDrivers)return;
 if(routeReady&&routeLength>100){
  fleetMarkers.forEach((m,i)=>{const offset=(progress+(i+1)*routeLength/(hiredDrivers+1)+businessIncomeTimer*3)%routeLength;m.setLatLng(pointAt(offset));});
 }
 businessIncomeTimer+=dt;
 if(businessIncomeTimer>=90){
  businessIncomeTimer=0;
  const completed=hiredDrivers;
  const gross=completed*220;
  const wages=completed*70;
  const net=gross-wages;
  wallet+=net;cashReserve+=net;businessStats.revenue+=gross;businessStats.deliveries+=completed;
  persistBusiness();updateEconomyHUD();
  showToast(`🏪 Repartidores: ${completed} entrega(s), ventas ${money(gross)}, gastos ${money(wages)}, ganancia ${money(net)}.`);
 }
}
function showPizzeriaPanel(){
 const cost=12000,driverCost=2500;
 panel(`<h3>🍕 Mi pizzería</h3>
 <div class="feature-card">Estado: <b>${pizzeriaOwned?'Establecimiento propio':'Todavía no tienes local'}</b><br>Saldo: <b>${money(wallet)}</b><br>Repartidores contratados: <b>${hiredDrivers}</b><br>Ventas acumuladas: ${money(businessStats.revenue)}<br>Entregas de empleados: ${businessStats.deliveries}</div>
 ${!pizzeriaOwned?`<p>Compra tu primer establecimiento para empezar a operar como dueño. Costo: <b>${money(cost)}</b>.</p><button class="feature-btn primary" ${wallet<cost?'disabled':''} onclick="window.buyPizzeria()">COMPRAR PIZZERÍA</button>`:`<p>Contrata repartidores. Cada uno realiza entregas simuladas y genera ingresos para el negocio. Cada ciclo se contabilizan ventas y pago operativo.</p><p>Contratar un repartidor cuesta <b>${money(driverCost)}</b>.</p><button class="feature-btn primary" ${wallet<driverCost?'disabled':''} onclick="window.hireCourier()">CONTRATAR REPARTIDOR</button><button class="feature-btn" onclick="window.refreshFleetMarkers()">MOSTRAR REPARTIDORES EN MAPA</button>`}
 <div class="feature-actions"><button class="feature-btn" onclick="window.closeFeaturePanel()">Cerrar</button></div>`);
}
function buyPizzeria(){const cost=12000;if(pizzeriaOwned)return;if(wallet<cost){showToast(`Necesitas ${money(cost-wallet)} más para comprar el local.`);return;}wallet-=cost;pizzeriaOwned=true;persistBusiness();updateEconomyHUD();showToast('¡Ya tienes tu propia pizzería!');showPizzeriaPanel();}
function hireCourier(){const cost=2500;if(!pizzeriaOwned)return;if(wallet<cost){showToast('No tienes suficiente dinero para contratar.');return;}wallet-=cost;hiredDrivers++;persistBusiness();updateEconomyHUD();refreshFleetMarkers();showToast('Nuevo repartidor contratado.');showPizzeriaPanel();}

function showOrdersPanel(){panel(`<h3>📦 Centro de pedidos</h3><p>Los pedidos externos aparecen automáticamente de manera aleatoria. Puedes aceptarlos o rechazarlos; mientras tanto, tus entregas normales continúan.</p><div class="feature-card">Saldo disponible: <b>${money(wallet)}</b><br>${activeOrder?`Pedido activo: ${escapeHTML(activeOrder.title)} · Etapa: ${activeOrder.phase==='store'?'Ir a la tienda':'Entregar al cliente'}`:'No tienes pedido externo activo.'}</div><div class="feature-actions"><button class="feature-btn" onclick="window.closeFeaturePanel()">Cerrar</button></div>`);}
function scheduleRandomOrder(){
 clearTimeout(randomOrderTimer);
 if(freeDriveMode||mode!=='game')return;
 const delay=(45+Math.random()*105)*1000;
 randomOrderTimer=setTimeout(()=>{
  if(!freeDriveMode&&!activeOrder&&!incomingOrder&&mode==='game')generateOrder(true);
  scheduleRandomOrder();
 },delay);
}
function generateOrder(automatic=false){if(freeDriveMode){if(!automatic)showToast('Los pedidos están pausados durante la conducción libre.');return;}if(incomingOrder||activeOrder){if(!automatic)showToast('Termina o rechaza el pedido actual primero.');return;}const availableStores=customPlaces.filter(p=>p.enabled!==false&&p.category==='store');
 const shopping=availableStores.length>0&&Math.random()<.48;
 const distanceM=500+Math.random()*2200;const fee=Math.round(28+distanceM/100);
 const product=shopping?productCatalog[Math.floor(Math.random()*productCatalog.length)]:null;
 const store=shopping?availableStores[Math.floor(Math.random()*availableStores.length)]:null;
 incomingOrder={id:Date.now(),title:shopping?'Compra en tienda':'Entrega de pizza',customer:['María','José','Andrea','Luis','Fernanda'][Math.floor(Math.random()*5)],kind:shopping?'shopping':'pizza',cost:product?.price||0,product:product?.name||'Pizza familiar',fee,tip:Math.round(8+Math.random()*22),distance:distanceM,storeId:store?.id||null,storeName:store?.name||null};showIncomingOrder();let left=15;clearInterval(orderCountdown);orderCountdown=setInterval(()=>{left--;const bar=$('orderBar');if(bar)bar.style.transform=`scaleX(${left/15})`;const t=$('orderSeconds');if(t)t.textContent=left;if(left<=0){clearInterval(orderCountdown);incomingOrder=null;closePanel();showToast('El pedido expiró.');scheduleRandomOrder();}},1000);}
function showIncomingOrder(){const o=incomingOrder;panel(`<h3>🔔 Nuevo pedido</h3><div class="order-timer"><i id="orderBar"></i></div><p>Responde en <b id="orderSeconds">15</b> segundos</p><div class="feature-card"><b>${o.title}</b><br>Cliente: ${o.customer}<br>${o.kind==='shopping'?`Tienda: ${escapeHTML(o.storeName||'Tienda registrada')}<br>Productos: ${o.product}<br>Debes adelantar: <b>${money(o.cost)}</b>`:'Producto: Pizza familiar'}<br>Distancia estimada: ${(o.distance/1000).toFixed(1)} km<br>Tarifa: ${money(o.fee)} · Propina estimada: ${money(o.tip)}<br><b>Ganancia estimada: ${money(o.fee+o.tip)}</b></div><div class="feature-actions"><button class="feature-btn primary" onclick="window.acceptOrder()">ACEPTAR</button><button class="feature-btn warn" onclick="window.rejectOrder()">RECHAZAR</button></div>`);}
function acceptOrder(){if(!incomingOrder)return;const o=incomingOrder;if(o.kind==='shopping'&&wallet<o.cost){showToast('No tienes efectivo suficiente para adelantar la compra.');rejectOrder();return;}if(o.kind==='shopping'&&!customPlaces.some(p=>p.id===o.storeId&&p.enabled!==false)){showToast('La tienda de ese pedido ya no está disponible.');rejectOrder();return;}if(o.kind==='shopping'){wallet-=o.cost;cashReserve-=o.cost;}activeOrder={...o,paid:false,phase:o.kind==='shopping'?'store':'customer',storeDestination:o.kind==='shopping'?(()=>{const st=customPlaces.find(p=>p.id===o.storeId);return st?L.latLng(st.lat,st.lng):null;})():null,destination:o.kind==='shopping'?null:randomNearbyPoint(playerPos,1300)};if(externalOrderMarker)map.removeLayer(externalOrderMarker);if(orderStoreMarker){map.removeLayer(orderStoreMarker);orderStoreMarker=null;}if(o.kind==='shopping'){activeOrder.destination=activeOrder.storeDestination;orderStoreMarker=L.marker(activeOrder.destination,{icon:icon('<div class="poi-pin">🏪</div>','poi-marker',[30,30],[15,15]),zIndexOffset:950}).addTo(map).bindPopup('Tienda para recoger la compra');}else{externalOrderMarker=L.marker(activeOrder.destination,{icon:customerIcon(),zIndexOffset:950}).addTo(map).bindPopup('Entrega al cliente');}incomingOrder=null;clearInterval(orderCountdown);closePanel();freeDriveMode=false;$('freeDrive').classList.remove('active');showToast(o.kind==='shopping'?`Pedido aceptado. Primero ve a la tienda; adelantas ${money(o.cost)}.`:'Pedido aceptado. ¡A repartir!');requestRoute(playerPos,activeOrder.destination,false);updateEconomyHUD();}
function rejectOrder(){incomingOrder=null;clearInterval(orderCountdown);closePanel();showToast('Pedido rechazado.');scheduleRandomOrder();}
function completeActiveOrder(){if(!activeOrder){showToast('No tienes pedido externo activo.');return;}if(!destinationReached(160)){showToast('Sigue la ruta hasta el punto accesible del establecimiento o domicilio.');return;}const o=activeOrder;if(o.phase==='store'){o.phase='customer';o.destination=randomNearbyPoint(o.storeDestination,1200);if(orderStoreMarker){map.removeLayer(orderStoreMarker);orderStoreMarker=null;}externalOrderMarker=L.marker(o.destination,{icon:customerIcon(),zIndexOffset:950}).addTo(map).bindPopup('Domicilio del cliente');showToast(`Compra confirmada en tienda. Ahora lleva ${o.product} al cliente.`);requestRoute(playerPos,o.destination,false);updateMission();return;}wallet+=o.cost+o.fee+o.tip;cashReserve+=o.fee+o.tip;activeOrder=null;if(externalOrderMarker){map.removeLayer(externalOrderMarker);externalOrderMarker=null;}if(orderStoreMarker){map.removeLayer(orderStoreMarker);orderStoreMarker=null;}speed=0;updateEconomyHUD();showToast(`Pedido cobrado. Ganancia neta: ${money(o.fee+o.tip)}.`);if(!freeDriveMode)routeToCurrentCustomer();scheduleRandomOrder();}
function showPlacesPanel(){panel(`<h3>🏪 Negocios del mapa</h3><p><b>Preparación de ciudad:</b> antes de recibir compras, coloca en el mapa tus tiendas, gasolineras, restaurantes y servicios. Los pedidos de tienda solo usarán tiendas que hayas colocado aquí.</p><div class="feature-card">Tiendas: ${customPlaces.filter(p=>p.category==='store'&&p.enabled!==false).length} · Gasolineras: ${customPlaces.filter(p=>p.category==='fuel'&&p.enabled!==false).length} · Otros negocios: ${customPlaces.filter(p=>!['store','fuel'].includes(p.category)&&p.enabled!==false).length}</div><label>Tipo de negocio</label><select id="placeCategory">${Object.entries(placeCategories).map(([k,v])=>`<option value="${k}">${v.icon} ${v.label}</option>`).join('')}</select><div class="feature-actions"><button class="feature-btn primary" onclick="window.startPlacePlacement()">Colocar en el mapa</button><button class="feature-btn" onclick="window.listCustomPlaces()">Mis negocios (${customPlaces.length})</button><button class="feature-btn" onclick="window.closeFeaturePanel()">Cerrar</button></div>`);}
function startPlacePlacement(){selectedPlaceCategory=$('placeCategory').value;placeEditorMode=true;closePanel();showToast('Toca el mapa donde quieres colocar el negocio.');}
function handlePlaceMapClick(latlng){placeEditorMode=false;const cat=selectedPlaceCategory;const def=placeCategories[cat];panel(`<h3>${def.icon} Crear ${def.label.toLowerCase()}</h3><label>Nombre del negocio</label><input id="newPlaceName" maxlength="50" placeholder="Ej. Mi tienda" value="${def.label}"><label>Precio / costo base (MXN)</label><input id="newPlacePrice" type="number" min="0" value="${def.price}"><p>La plantilla de esta categoría quedará configurada automáticamente. Podrás cambiar el nombre, precio o eliminarla después.</p><div class="feature-actions"><button class="feature-btn primary" onclick="window.saveNewPlace(${latlng.lat},${latlng.lng},'${cat}')">Guardar negocio</button><button class="feature-btn" onclick="window.closeFeaturePanel()">Cancelar</button></div>`);}
function saveNewPlace(lat,lng,cat){const name=$('newPlaceName').value.trim();if(!name){showToast('Escribe un nombre.');return;}const price=Math.max(0,Number($('newPlacePrice').value)||0);const place={id:'p'+Date.now(),lat,lng,category:cat,name,price,enabled:true,createdAt:Date.now()};customPlaces.push(place);persistPlaces();renderPlace(place);closePanel();showToast('Negocio agregado y guardado en este dispositivo.');}
function listCustomPlaces(){if(!customPlaces.length){panel('<h3>Mis negocios</h3><p>Aún no has creado negocios personalizados.</p><button class="feature-btn" onclick="window.showPlacesPanel()">Volver</button>');return;}panel(`<h3>Mis negocios</h3>${customPlaces.map(p=>`<div class="feature-card">${placeCategories[p.category]?.icon||'📍'} <b>${escapeHTML(p.name)}</b><br>${placeCategories[p.category]?.label} · ${money(p.price)}<div class="feature-actions"><button class="feature-btn" onclick="window.editPlace('${p.id}')">Editar</button><button class="feature-btn" onclick="window.togglePlace('${p.id}')">${p.enabled===false?'Activar':'Desactivar'}</button><button class="feature-btn warn" onclick="window.deletePlace('${p.id}')">Eliminar</button></div></div>`).join('')}<button class="feature-btn" onclick="window.showPlacesPanel()">Volver</button>`);}
function editPlace(id){const p=customPlaces.find(x=>x.id===id);if(!p)return;panel(`<h3>Editar negocio</h3><label>Nombre</label><input id="editPlaceName" value="${escapeHTML(p.name)}" maxlength="50"><label>Precio / costo base</label><input id="editPlacePrice" type="number" min="0" value="${p.price}"><div class="feature-actions"><button class="feature-btn primary" onclick="window.savePlaceEdit('${p.id}')">Guardar</button><button class="feature-btn" onclick="window.movePlace('${p.id}')">Mover en mapa</button></div>`);}
function savePlaceEdit(id){const p=customPlaces.find(x=>x.id===id);if(!p)return;p.name=$('editPlaceName').value.trim()||p.name;p.price=Math.max(0,Number($('editPlacePrice').value)||0);persistPlaces();refreshPlaces();listCustomPlaces();}
function movePlace(id){const p=customPlaces.find(x=>x.id===id);if(!p)return;placeEditorMode=true;selectedPlaceCategory='move:'+id;closePanel();showToast('Toca la nueva ubicación del negocio.');}
function togglePlace(id){const p=customPlaces.find(x=>x.id===id);if(!p)return;p.enabled=p.enabled===false;persistPlaces();refreshPlaces();listCustomPlaces();}
function deletePlace(id){if(!confirm('¿Eliminar este negocio?'))return;customPlaces=customPlaces.filter(x=>x.id!==id);persistPlaces();refreshPlaces();listCustomPlaces();}
function openPlacePanel(id){const p=customPlaces.find(x=>x.id===id);if(!p)return;const cat=placeCategories[p.category];let action='';if(p.category==='fuel')action=`<button class="feature-btn primary" onclick="window.buyFuel('${p.id}')">Cargar combustible</button>`;else if(p.category==='restaurant'||p.category==='cafe')action=`<button class="feature-btn primary" onclick="window.buyMeal('${p.id}')">Consumir (${money(p.price)})</button>`;else if(p.category==='workshop')action=`<button class="feature-btn primary" onclick="window.repairVehicle('${p.id}')">Reparar (${money(p.price)})</button>`;else if(p.category==='store')action=`<button class="feature-btn primary" onclick="window.buyStoreGoods('${p.id}')">Comprar despensa</button>`;panel(`<h3>${cat.icon} ${escapeHTML(p.name)}</h3><p>${cat.label} · ${money(p.price)}</p><div class="feature-actions">${action}<button class="feature-btn" onclick="window.closeFeaturePanel()">Cerrar</button></div>`);}
function requireAtPlace(p){const d=distance(playerPos,L.latLng(p.lat,p.lng));if(d>85){showToast(`Debes llegar al local. Estás a ${Math.round(d)} m.`);return false;}return true;}
function buyFuel(id){const p=customPlaces.find(x=>x.id===id);if(!p||!requireAtPlace(p))return;const cost=Math.max(20,p.price||25);if(wallet<cost){showToast('Saldo insuficiente.');return;}wallet-=cost;fuel=Math.min(100,fuel+Math.max(10,cost/2));updateEconomyHUD();closePanel();showToast(`Combustible cargado por ${money(cost)}.`);}
function buyMeal(id){const p=customPlaces.find(x=>x.id===id);if(!p||!requireAtPlace(p))return;const cost=Math.max(20,p.price||45);if(wallet<cost){showToast('Saldo insuficiente.');return;}wallet-=cost;hunger=Math.min(100,hunger+35);energy=Math.min(100,energy+18);updateEconomyHUD();closePanel();showToast('Comida comprada. Hambre y energía recuperadas.');}
function buyStoreGoods(id){const p=customPlaces.find(x=>x.id===id);if(!p||!requireAtPlace(p))return;const goods=productCatalog[Math.floor(Math.random()*productCatalog.length)];const cost=goods.price;if(wallet<cost){showToast('Saldo insuficiente.');return;}wallet-=cost;updateEconomyHUD();closePanel();showToast(`${goods.name} comprado por ${money(cost)}. Existencias disponibles.`);}
function repairVehicle(id){const p=customPlaces.find(x=>x.id===id);if(!p||!requireAtPlace(p))return;const cost=Math.max(50,p.price||120);if(wallet<cost){showToast('Saldo insuficiente.');return;}wallet-=cost;vehicleHealth=100;updateEconomyHUD();closePanel();showToast('Vehículo reparado.');}
function activateTurbo(){
 const now=Date.now();
 if(now<turboCooldown){showToast(`Turbo listo en ${Math.ceil((turboCooldown-now)/1000)} s.`);return;}
 if(fuel<8&&!(fuel<=0&&reserveActive&&reserveFuel>0)){showToast('Necesitas combustible para usar el turbo.');return;}
 if(freeDriveMode){
  turboUntil=now+600000;turboCooldown=now+615000;
  showToast('🚀 TURBO LIBRE: 10 minutos a un máximo de 80 km/h. Recarga en 15 segundos al terminar.');
 }else{
  turboUntil=now+60000;turboCooldown=now+75000;MAX_SPEED=Math.max(MAX_SPEED,17.5);
  showToast('¡Turbo activado por 1 minuto! Al terminar, se recarga en 15 segundos.');
 }
}
function activateReserve(){if(fuel>0){showToast('La reserva solo se habilita cuando el tanque principal se agota.');return;}if(reserveActive){showToast('La reserva ya está activa.');return;}if(reserveFuel<=0){showToast('La reserva también se agotó. Necesitas asistencia.');return;}reserveActive=true;showToast('Reserva activada: conduce despacio hasta una gasolinera.');}
function consumeFuel(dt){
 const turboFactor=Date.now()<turboUntil?1.65:1;
 const rate=dt*.035*turboFactor;
 if(fuel>0){
  fuel=Math.max(0,fuel-rate);
  if(fuel===0&&!reserveActive&&reserveFuel>0){reserveActive=true;showToast('⛽ Tanque principal vacío: reserva del 8% activada automáticamente. Busca una gasolinera.');}
 }
 if(fuel<=0&&reserveActive&&reserveFuel>0){
  reserveFuel=Math.max(0,reserveFuel-rate*1.35);
  if(reserveFuel===0){speed=0;showToast('Se agotó también la reserva. Necesitas asistencia.');}
 }else if(fuel<=0&&reserveFuel<=0&&Math.abs(speed)>.2){speed=0;showToast('Sin combustible. Necesitas asistencia.');}
}

function economyTick(dt){
 gameClockMinutes=(gameClockMinutes+dt*(freeDriveMode?FREE_TIME_SCALE:10)/60)%1440; // Modo libre x12; reparto conserva su reloj x10
 const tint=$('nightTint');
 if(tint){
  const h=gameClockMinutes/60;
  const night=h>=18.5||h<6;
  const dusk=h>=16.5&&h<18.5;
  const dawn=h>=6&&h<7;
  setNightLighting(night);
  tint.style.background=night?'rgba(8,18,43,.48)':(dusk?'rgba(235,139,65,.20)':(dawn?'rgba(255,191,112,.10)':'transparent'));
 }updateFleet(dt);if(routeReady&&Math.abs(speed)>.5){consumeFuel(dt);hunger=Math.max(0,hunger-dt*.035);energy=Math.max(0,energy-dt*.02);vehicleHealth=Math.max(0,vehicleHealth-dt*.001);}if(fuel<=0&&reserveFuel<=0&&Math.abs(speed)>.2){speed=0;}if(Date.now()>turboUntil&&MAX_SPEED>BASE_MAX_SPEED+(level-1)*.8)MAX_SPEED=Math.min(19,BASE_MAX_SPEED+(level-1)*.8);updateEconomyHUD();}
// La tarjeta de misión existente también sirve para completar pedidos externos.
const baseUpdateMission=updateMission;
updateMission=function(){if(activeOrder){$('missionName').textContent=activeOrder.phase==='store'?'Ir a la tienda':'Entregar al cliente';$('missionDistance').textContent=`${activeOrder.customer} · ${Math.round(distance(playerPos,activeOrder.destination))} m`; $('routeStatus').textContent='PEDIDO EXTERNO';$('routeKm').textContent=activeOrder.kind==='shopping'?(activeOrder.phase==='store'?'COMPRA':'ENTREGA'):'PIZZA';$('deliver').textContent=activeOrder.phase==='store'?'CONFIRMAR COMPRA':'COBRAR PEDIDO';$('deliver').disabled=!destinationReached(160);return;}$('deliver').textContent='ENTREGAR PIZZA';baseUpdateMission();};
const baseFinishDelivery=finishDelivery;
finishDelivery=function(){if(activeOrder){completeActiveOrder();return;}baseFinishDelivery();};
window.buyPizzeria=buyPizzeria;window.hireCourier=hireCourier;window.refreshFleetMarkers=refreshFleetMarkers;window.showPizzeriaPanel=showPizzeriaPanel;window.generateOrder=generateOrder;window.acceptOrder=acceptOrder;window.rejectOrder=rejectOrder;window.closeFeaturePanel=closePanel;window.showPlacesPanel=showPlacesPanel;window.startPlacePlacement=startPlacePlacement;window.saveNewPlace=saveNewPlace;window.listCustomPlaces=listCustomPlaces;window.togglePlace=togglePlace;window.deletePlace=deletePlace;window.editPlace=editPlace;window.savePlaceEdit=savePlaceEdit;window.movePlace=movePlace;window.openPlacePanel=openPlacePanel;window.buyFuel=buyFuel;window.buyMeal=buyMeal;window.buyStoreGoods=buyStoreGoods;window.repairVehicle=repairVehicle;
initFeatureUI();loadPlaces();loadBusiness();updateEconomyHUD();scheduleRandomOrder();
let economyLast=performance.now();function economyLoop(now){const dt=Math.min((now-economyLast)/1000,.1);economyLast=now;economyTick(dt);requestAnimationFrame(economyLoop);}requestAnimationFrame(economyLoop);

function locateStart(){
 if(!navigator.geolocation){
  setStart(DEFAULT_CENTER,'GPS no disponible. Usando Ostuacán como punto inicial.');return;
 }
 $('driveStatus').textContent='BUSCANDO UBICACIÓN…';
 navigator.geolocation.getCurrentPosition(pos=>{
  setStart([pos.coords.latitude,pos.coords.longitude],`Ubicación GPS detectada · precisión ±${Math.round(pos.coords.accuracy)} m`);
 },err=>{
  const msg=err.code===1?'Permiso GPS denegado.':'No se obtuvo GPS.';
  setStart(DEFAULT_CENTER,`${msg} Usando Ostuacán como respaldo.`);
 },{enableHighAccuracy:true,timeout:16000,maximumAge:0});
}
function setStart(coords,label){
 origin=L.latLng(coords[0],coords[1]);playerPos=origin;lastTrafficRefreshPos=origin;
 createTrafficFleet(origin);
 createCustomers();
 $('driveStatus').textContent=label;
 map.setView(origin,18);
 updateMission();
 if(freeDriveMode){
  $('missionName').textContent='Conducción libre';
  $('missionDistance').textContent='Toca el mapa o busca una localidad como destino';
  $('routeStatus').textContent='ESPERANDO DESTINO';
  $('deliver').disabled=true;
 }else routeToCurrentCustomer();
}
function searchArea(){
 const q=prompt('Escribe la localidad y el estado:');
 if(!q||!q.trim())return;
 $('driveStatus').textContent='BUSCANDO LOCALIDAD…';
 fetch('https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q='+encodeURIComponent(q.trim()),{headers:{'Accept':'application/json'}})
 .then(r=>{if(!r.ok)throw Error();return r.json()})
 .then(data=>{
  if(!data.length)throw Error();
  if(freeDriveMode){
   const destination=L.latLng(Number(data[0].lat),Number(data[0].lon));
   if(freeDestinationMarker)map.removeLayer(freeDestinationMarker);
   freeDestination=destination;
   freeDestinationMarker=L.marker(destination,{icon:customerIcon(),zIndexOffset:900}).addTo(map).bindPopup('Destino: '+data[0].display_name).openPopup();
   showToast('Calculando recorrido hasta '+data[0].name+'…');
   requestRoute(playerPos,destination,false);
   return;
  }
  if(routeControl){map.removeControl(routeControl);routeControl=null;}
  routeCoords=[];routeCumulative=[];routeReady=false;progress=0;speed=0;
  if(playerMarker){map.removeLayer(playerMarker);playerMarker=null;}
  if(freeDestinationMarker){map.removeLayer(freeDestinationMarker);freeDestinationMarker=null;}
  freeDestination=null;
  setStart([Number(data[0].lat),Number(data[0].lon)],'Zona seleccionada: '+data[0].display_name);
 })
 .catch(()=>showToast('No se encontró la localidad o falló la conexión.'));
}

// Botón largo sobre el logotipo permite buscar otra localidad.
$('searchArea').addEventListener('click',searchArea);
function setFreeDriveMode(enabled){
 if(enabled&&activeOrder){showToast('Termina el pedido activo antes de entrar al modo libre.');return;}
 freeDriveMode=enabled;
 if(autoDrive)setAutoDrive(false);
 $('freeDrive').classList.toggle('active',enabled);
 $('freeDrive').innerHTML=enabled?'🧭 <span>LIBRE ACTIVO</span>':'🧭 <span>MODO LIBRE</span>';
 if(enabled){
  clearTimeout(randomOrderTimer);
  if(incomingOrder){incomingOrder=null;clearInterval(orderCountdown);closePanel();}
  const ordersButton=$('ordersBtn');if(ordersButton)ordersButton.style.display='none';
  speed=0;routeReady=false;routePending=false;progress=0;routeCoords=[];routeCumulative=[];routeLength=0;
  if(routeProgressLine){map.removeLayer(routeProgressLine);routeProgressLine=null;}
  if(routeOutlineLine){map.removeLayer(routeOutlineLine);routeOutlineLine=null;}
  customerMarkers.forEach(m=>{if(map.hasLayer(m))map.removeLayer(m);});
  const estimate=$('travelEstimate');if(estimate)estimate.textContent='';
  $('routeKm').textContent='—';
  $('missionName').textContent='Conducción libre';
  $('missionDistance').textContent='Toca cualquier punto del mapa para elegir destino';
  $('routeStatus').textContent='ESPERANDO DESTINO';
  $('deliver').disabled=true;
  showToast('Modo libre: toca el mapa para elegir a dónde conducir.');
 }else{
  const ordersButton=$('ordersBtn');if(ordersButton)ordersButton.style.display='';
  customerMarkers.forEach(m=>{if(!map.hasLayer(m))m.addTo(map);});
  if(freeDestinationMarker){map.removeLayer(freeDestinationMarker);freeDestinationMarker=null;}
  freeDestination=null;
  updateMission();
  showToast('Modo reparto activado.');
  if(targetIndex<CLIENTS.length)routeToCurrentCustomer();
  scheduleRandomOrder();
 }
}
$('freeDrive').addEventListener('click',()=>setFreeDriveMode(!freeDriveMode));
function setAutoDrive(enabled){
 if(enabled&&(!routeReady||routePending)){showToast('Primero elige un destino y espera a que se calcule la ruta.');return;}
 autoDrive=enabled;accelerate=enabled;brake=false;
 const b=$('autoDrive');if(b){b.classList.toggle('active',enabled);b.innerHTML=enabled?'🤖 <span>AUTO ON</span>':'🤖 <span>AUTO</span>';}
 showToast(enabled?'Conducción automática activada: el vehículo seguirá avanzando por la ruta.':'Conducción automática desactivada: controles manuales.');
}
$('autoDrive').addEventListener('click',()=>setAutoDrive(!autoDrive));
$('offlineMap').addEventListener('click',()=>showToast('Mapa offline aún no disponible: la app abre sin conexión, pero calles y rutas necesitan internet.'));
map.on('click',e=>{
 if(typeof placeEditorMode!=='undefined' && placeEditorMode){ if(selectedPlaceCategory.startsWith('move:')){const id=selectedPlaceCategory.slice(5),p=customPlaces.find(x=>x.id===id);if(p){p.lat=e.latlng.lat;p.lng=e.latlng.lng;persistPlaces();refreshPlaces();showToast('Negocio movido.');}placeEditorMode=false;return;} handlePlaceMapClick(e.latlng); return; }
 if(freeDriveMode){
  if(freeDestinationMarker)map.removeLayer(freeDestinationMarker);
  freeDestination=e.latlng;
  freeDestinationMarker=L.marker(freeDestination,{icon:customerIcon(),zIndexOffset:900}).addTo(map).bindPopup('Destino libre').openPopup();
  if(detourMarker){map.removeLayer(detourMarker);detourMarker=null;}
  showToast('Calculando ruta al destino elegido…');
  requestRoute(playerPos,freeDestination,false);
  return;
 }
 if(targetIndex>=CLIENTS.length||!routeReady||routePending)return;
 const via=e.latlng;
 if(detourMarker)map.removeLayer(detourMarker);
 detourMarker=L.circleMarker(via,{radius:7,color:'#fff',weight:2,fillColor:'#f59e0b',fillOpacity:1}).addTo(map).bindTooltip('Desvío elegido',{direction:'top'});
 showToast('Recalculando por el punto que elegiste…');
 routeToCurrentCustomer(via);
});
locateStart();
requestAnimationFrame(gameFrame);
