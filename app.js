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
let level=1, elapsedSeconds=0;
let followPlayer=true, mode='game';
let freeDriveMode=false, freeDestination=null, freeDestinationMarker=null, lastTrafficRefreshPos=null, trafficRefreshBusy=false;
let accelerate=false, brake=false, steerLeft=false, steerRight=false;
let lastFrame=performance.now(), toastTimer=null, offRouteFrames=0, lastRerouteAt=0, trafficAccumulator=0;
let MAX_SPEED=9.5;
const ACCEL=5.0, BRAKE=8.0, LANE_SPEED=1.6, MAX_LANE=1.15;
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
  $('deliver').disabled=d>32 || !routeReady;
 }
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
function requestRoute(start,destination,first=false,via=null){
 if(!routeControl){
  routeControl=L.Routing.control({
   waypoints:via?[start,via,destination]:[start,destination],
   router:L.Routing.osrmv1({serviceUrl:'https://router.project-osrm.org/route/v1',profile:'driving',timeout:30000}),
   show:false,collapsible:false,addWaypoints:false,draggableWaypoints:false,
   routeWhileDragging:false,fitSelectedRoutes:false,createMarker:()=>null,
   lineOptions:{styles:[{color:'#ffffff',weight:10,opacity:.9},{color:'#13b981',weight:6,opacity:1}]}
  }).addTo(map);
  routeControl.on('routesfound',e=>{
   const r=e.routes?.[0];if(!r?.coordinates?.length){routeFailed('El servicio no devolvió una ruta.');return;}
   routeCoords=r.coordinates.map(p=>L.latLng(p.lat,p.lng));
   // Coloca el marcador del cliente sobre el extremo de calle al que OSRM ajustó el destino.
   if(!freeDriveMode && customerMarkers[targetIndex] && routeCoords.length){
    customerMarkers[targetIndex].setLatLng(routeCoords[routeCoords.length-1]);
   }
   buildCumulative(routeCoords);
   routeReady=true;routePending=false;progress=0;speed=0;laneOffset=0;
   // La primera coordenada viene ajustada a la red vial por el motor de rutas.
   playerPos=routeCoords[0];heading=bearingAt(1);
   updateRider();
   const km=(r.summary.totalDistance/1000).toFixed(2);
   $('routeKm').textContent=`${km} km`;
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
 if(targetIndex>=CLIENTS.length||!routeReady)return;
 const target=customerMarkers[targetIndex].getLatLng();
 if(distance(playerPos,target)>32){showToast('Acércate más al domicilio para entregar.');return;}
 map.removeLayer(customerMarkers[targetIndex]);targetIndex++;deliveries++;
 speed=0;showToast('🍕 ¡Pizza entregada! Pedido completado.');
 if(targetIndex>=CLIENTS.length){
  level++;targetIndex=0;deliveries=0;MAX_SPEED=Math.min(16,9.5+(level-1)*0.8);
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
bindHold('accelerate',v=>accelerate=v);
bindHold('brake',v=>brake=v);
bindHold('left',v=>steerLeft=v);
bindHold('right',v=>steerRight=v);

function gameFrame(now){
 const dt=Math.min((now-lastFrame)/1000,.05);lastFrame=now;
 trafficAccumulator+=dt;if(trafficAccumulator>=.08){updateTraffic(trafficAccumulator);trafficAccumulator=0;}
 if(routeReady){elapsedSeconds+=dt;$('timer').textContent=String(Math.floor(elapsedSeconds/60)).padStart(2,'0')+':'+String(Math.floor(elapsedSeconds%60)).padStart(2,'0');}
 if(routeReady&&routeLength>0){
  if(accelerate)speed=Math.min(MAX_SPEED,speed+ACCEL*dt);
  else if(brake)speed=Math.max(-2.5,speed-BRAKE*dt);
  else if(speed>0)speed=Math.max(0,speed-1.8*dt);
  else if(speed<0)speed=Math.min(0,speed+2.2*dt);
  if(steerLeft)laneOffset=Math.max(-MAX_LANE,laneOffset-LANE_SPEED*dt);
  else if(steerRight)laneOffset=Math.min(MAX_LANE,laneOffset+LANE_SPEED*dt);
  else laneOffset*=Math.pow(.12,dt);
  progress=Math.max(0,Math.min(routeLength,progress+speed*dt));
  const center=pointAt(progress);heading=bearingAt(progress);
  playerPos=offsetPoint(center,heading,laneOffset);
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
    speed=0;$('driveStatus').textContent=freeDriveMode?'LLEGASTE AL DESTINO · ELIGE OTRO':'HAS LLEGADO AL FINAL DE LA RUTA';
  }
 }else{$('speed').textContent='0';}
 requestAnimationFrame(gameFrame);
}

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
 freeDriveMode=enabled;
 $('freeDrive').classList.toggle('active',enabled);
 $('freeDrive').innerHTML=enabled?'🧭 <span>LIBRE ACTIVO</span>':'🧭 <span>MODO LIBRE</span>';
 if(enabled){
  $('missionName').textContent='Conducción libre';
  $('missionDistance').textContent='Toca cualquier punto del mapa para elegir destino';
  $('routeStatus').textContent='ESPERANDO DESTINO';
  $('deliver').disabled=true;
  showToast('Modo libre: toca el mapa para elegir a dónde conducir.');
 }else{
  if(freeDestinationMarker){map.removeLayer(freeDestinationMarker);freeDestinationMarker=null;}
  freeDestination=null;
  updateMission();
  showToast('Modo reparto activado.');
  if(targetIndex<CLIENTS.length)routeToCurrentCustomer();
 }
}
$('freeDrive').addEventListener('click',()=>setFreeDriveMode(!freeDriveMode));
map.on('click',e=>{
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
