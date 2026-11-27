/* Pizza Delivery Simulator 0.7 - mapa cenital estilizado y conducción manual */
const DEFAULT_CENTER=[17.4056,-93.3371],$=id=>document.getElementById(id);
const map=L.map('map',{zoomControl:false,attributionControl:true,dragging:true,touchZoom:true,scrollWheelZoom:false,keyboard:false}).setView(DEFAULT_CENTER,17);
const styles=[{name:'Color',url:'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',attr:'© OpenStreetMap contributors © CARTO'},{name:'Calles',url:'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',attr:'© OpenStreetMap contributors'},{name:'Satélite',url:'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',attr:'Tiles © Esri'}];
let styleIndex=0,tiles=L.tileLayer(styles[0].url,{maxZoom:19,attribution:styles[0].attr}).addTo(map);
let origin=L.latLng(...DEFAULT_CENTER),playerPos=origin,playerMarker=null,customerMarker=null,customerNode=null,routeLine=null,routePath=[];
let graph=new Map(),nodes=new Map(),loadedWayIds=new Set(),roadLayers=[],buildingLayers=[],buildingCount=0,networkReady=false,networkLoading=false,lastNetworkBounds='',lastNetworkCenter=null,lastExtendAt=0,showBuildings=true;
let currentNode=null,nextNode=null,edgeProgress=0,edgeLength=0,speed=0,heading=0,level=1,deliveries=0,elapsed=0,lastFrame=performance.now(),follow=true;
let gas=false,brake=false,left=false,right=false,traffic=[],trafficCount=110,toastTimer=null,routeDistance=0;
const riderSvg='<svg class="rider-art" viewBox="0 0 40 64"><ellipse cx="20" cy="32" rx="15" ry="28" fill="#10251c" opacity=".18"/><rect x="14" y="3" width="12" height="15" rx="5" fill="#202a2b" stroke="#fff" stroke-width="1.4"/><rect x="11" y="17" width="18" height="30" rx="8" fill="#20a66b" stroke="#fff" stroke-width="1.5"/><path d="M14 22 L26 22 L29 40 L11 40Z" fill="#f4a62a"/><circle cx="20" cy="27" r="6.5" fill="#f1c59d"/><path d="M13 25 Q20 14 27 25 L25 28 L15 28Z" fill="#f3c83f"/><rect x="15" y="45" width="10" height="14" rx="4" fill="#202a2b"/><circle cx="20" cy="7" r="2.3" fill="#fff5b4"/></svg>';
const carSvg='<svg class="traffic-art" viewBox="0 0 28 46"><rect x="3" y="1" width="22" height="44" rx="7" fill="#26343b" stroke="#fff" stroke-width="1.4"/><rect x="5" y="8" width="18" height="11" rx="3" fill="#9ed1dc"/><rect x="5" y="27" width="18" height="10" rx="3" fill="#9ed1dc"/><rect x="2" y="5" width="3" height="7" rx="1" fill="#ffe7a2"/><rect x="23" y="5" width="3" height="7" rx="1" fill="#ffe7a2"/><rect x="2" y="34" width="3" height="7" rx="1" fill="#fa6558"/><rect x="23" y="34" width="3" height="7" rx="1" fill="#fa6558"/></svg>';
function toast(s){const e=$('toast');e.textContent=s;e.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>e.classList.remove('show'),2200)}
function dist(a,b){return map.distance(a,b)}
function bearing(a,b){const p=a.lat*Math.PI/180,q=b.lat*Math.PI/180,d=(b.lng-a.lng)*Math.PI/180;return(Math.atan2(Math.sin(d)*Math.cos(q),Math.cos(p)*Math.sin(q)-Math.sin(p)*Math.cos(q)*Math.cos(d))*180/Math.PI+360)%360}
function divIcon(html,cls,size,anchor){return L.divIcon({className:cls,html,iconSize:size,iconAnchor:anchor})}
const riderIcon=()=>divIcon(`<div id="riderArt">${riderSvg}</div>`,'rider-marker',[34,48],[17,24]);
const carIcon=()=>divIcon(`<div class="car-wrap">${carSvg}</div>`,'traffic-marker',[18,28],[9,14]);
const pizzaIcon=()=>divIcon('<div class="customer-pin">🍕</div>','customer-marker',[31,31],[15,28]);
function updateRider(){if(!playerMarker)playerMarker=L.marker(playerPos,{icon:riderIcon(),zIndexOffset:1000,interactive:false}).addTo(map);else playerMarker.setLatLng(playerPos);const a=document.querySelector('#riderArt .rider-art');if(a)a.style.transform=`rotate(${heading}deg)`}
function setFollow(v){follow=v;$('follow').classList.toggle('active',v);$('follow').innerHTML=v?'◎<span>SEGUIR</span>':'◎<span>MAPA LIBRE</span>';if(v)map.panTo(playerPos)}
map.on('dragstart',()=>setFollow(false));$('follow').onclick=()=>setFollow(true);$('zoomIn').onclick=()=>map.zoomIn();$('zoomOut').onclick=()=>map.zoomOut();
$('mapStyle').onclick=()=>{map.removeLayer(tiles);styleIndex=(styleIndex+1)%styles.length;const s=styles[styleIndex];tiles=L.tileLayer(s.url,{maxZoom:19,attribution:s.attr}).addTo(map);$('mapStyle').innerHTML=`◫<span>${s.name}</span>`};
$('buildings').onclick=()=>{showBuildings=!showBuildings;$('buildings').classList.toggle('active',showBuildings);buildingLayers.forEach(l=>showBuildings?l.addTo(map):map.removeLayer(l))};
function clearNetworkLayers(){roadLayers.forEach(l=>map.removeLayer(l));buildingLayers.forEach(l=>map.removeLayer(l));roadLayers=[];buildingLayers=[];buildingCount=0}
function addEdge(a,b,oneway=false,wayId=''){if(!nodes.has(a)||!nodes.has(b))return;const A=nodes.get(a),B=nodes.get(b),len=dist(A,B);if(len<1)return;const e={from:a,to:b,len,wayId};if(!graph.has(a))graph.set(a,[]);graph.get(a).push(e);if(!oneway){const r={from:b,to:a,len,wayId};if(!graph.has(b))graph.set(b,[]);graph.get(b).push(r)}}
function roadWeight(tags){const hw=tags.highway;return !['footway','path','steps','cycleway','pedestrian','bridleway','construction','proposed'].includes(hw)}
const OVERPASS_ENDPOINTS=[
 'https://overpass.kumi.systems/api/interpreter',
 'https://overpass-api.de/api/interpreter',
 'https://overpass.nchc.org.tw/api/interpreter'
];
async function requestOverpass(query){
 let lastError=null;
 for(let i=0;i<OVERPASS_ENDPOINTS.length;i++){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),11000);
  try{
   $('driveStatus').textContent=`BUSCANDO CALLES · SERVIDOR ${i+1}/${OVERPASS_ENDPOINTS.length}`;
   const response=await fetch(OVERPASS_ENDPOINTS[i],{
    method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'},
    body:'data='+encodeURIComponent(query),signal:controller.signal
   });
   if(!response.ok)throw Error(`Servidor ${response.status}`);
   const data=await response.json();
   if(!Array.isArray(data.elements))throw Error('Respuesta cartográfica inválida');
   return data;
  }catch(err){lastError=err;console.warn('Overpass endpoint falló:',OVERPASS_ENDPOINTS[i],err)}
  finally{clearTimeout(timer)}
 }
 throw lastError||Error('No hay servidores cartográficos disponibles');
}
function roofColor(way){
 const palette=['#9d7768','#b28c70','#c1aa88','#8d8b7b','#b7a58c','#a87870','#c2b99d','#8e806f'];
 let h=0;for(const c of String(way.id))h=(h*31+c.charCodeAt(0))>>>0;
 if(way.tags?.building==='industrial')return '#777b78';
 if(way.tags?.building==='commercial')return '#a99b7b';
 return palette[h%palette.length];
}
async function loadNetwork(center=map.getCenter(),force=false){
 if(networkLoading)return;
 const z=map.getZoom();
 if(z<15){toast('Acércate un poco más para cargar calles y edificios.');return}
 networkLoading=true;$('retryLoad').hidden=true;
 $('driveStatus').textContent='CONECTANDO CON EL MAPA…';$('routeStatus').textContent='DESCARGANDO CALLES';
 const radius=Math.min(.018,Math.max(.006,0.00055*Math.pow(2,18-z)));
 const s=center.lat-radius,w=center.lng-radius*1.25,n=center.lat+radius,e=center.lng+radius*1.25;
 const key=[s,w,n,e].map(v=>v.toFixed(3)).join(',');
 try{
  const query=`[out:json][timeout:20];(way["highway"~"^(motorway|trunk|primary|secondary|tertiary|residential|unclassified|service|living_street|road)$"](${s},${w},${n},${e});way["building"](${s},${w},${n},${e}););out body geom;`;
  const data=await requestOverpass(query),ways=data.elements||[];
  const roadWays=ways.filter(w=>w.tags?.highway&&roadWeight(w.tags)&&w.geometry?.length>1);
  const buildingWays=ways.filter(w=>w.tags?.building&&w.geometry?.length>2);
  if(!roadWays.length)throw Error('La zona no devolvió calles. Prueba acercarte o buscar otra localidad.');
  for(const way of roadWays){
   if(loadedWayIds.has(String(way.id)))continue;
   loadedWayIds.add(String(way.id));
   const ids=way.geometry.map((p,i)=>String(way.nodes?.[i]??`${way.id}_${i}`));
   const coords=way.geometry.map(p=>L.latLng(p.lat,p.lon));
   for(let i=0;i<way.geometry.length;i++){const p=way.geometry[i];nodes.set(ids[i],L.latLng(p.lat,p.lon))}
   const one=way.tags.oneway==='yes'||way.tags.junction==='roundabout';
   for(let i=1;i<ids.length;i++)addEdge(ids[i-1],ids[i],one,String(way.id));
   const hw=way.tags.highway,major=['motorway','trunk','primary'].includes(hw),secondary=hw==='secondary';
   const casing=L.polyline(coords,{color:'#373b3b',weight:major?13:secondary?10:7,opacity:.94,interactive:false,lineCap:'square',lineJoin:'round'}).addTo(map);
   const asphalt=L.polyline(coords,{color:major?'#55595a':secondary?'#626566':'#707273',weight:major?10:secondary?7:4.5,opacity:.98,interactive:false,lineCap:'square',lineJoin:'round'}).addTo(map);
   roadLayers.push(casing,asphalt);
   if(major||secondary){
    const centerline=L.polyline(coords,{color:'#d6c9a6',weight:1,opacity:.62,dashArray:'7 9',interactive:false}).addTo(map);
    roadLayers.push(centerline);
   }
  }
  for(const way of buildingWays){
   if(loadedWayIds.has('b'+way.id))continue;
   loadedWayIds.add('b'+way.id);
   const pts=way.geometry.map(p=>L.latLng(p.lat,p.lon));
   const color=roofColor(way);
   const shadow=L.polygon(pts.map(p=>L.latLng(p.lat-0.000025,p.lng+0.000025)),{stroke:false,fillColor:'#171a18',fillOpacity:.48,interactive:false});
   const wall=L.polygon(pts,{color:'#514d47',weight:2,opacity:.95,fillColor:'#716b61',fillOpacity:1,interactive:false});
   const roof=L.polygon(pts,{color:'#d1c4a8',weight:1,opacity:.75,fillColor:color,fillOpacity:.98,interactive:false});
   if(showBuildings){shadow.addTo(map);wall.addTo(map);roof.addTo(map)}
   buildingLayers.push(shadow,wall,roof);buildingCount++;
  }
  roadLayers.forEach(l=>l.bringToFront());
  networkReady=graph.size>10;
  if(!networkReady)throw Error('Se encontraron muy pocas intersecciones para conducir.');
  lastNetworkBounds=key;lastNetworkCenter=L.latLng(center.lat,center.lng);
  if(!currentNode||!nodes.has(currentNode)){
   currentNode=nearestNode(playerPos);nextNode=null;edgeProgress=0;
   if(currentNode)playerPos=nodes.get(currentNode);
   updateRider();
  }
  spawnTraffic();
  if(!customerNode||!nodes.has(customerNode))newCustomer();
  refreshRoute();
  $('driveStatus').textContent=`MAPA LISTO · ${graph.size} NODOS`;
  $('missionName').textContent='¡Pedido preparado!';
  toast(`Calles listas · ${buildingCount} edificios registrados`);
 }catch(err){
  console.warn(err);
  $('driveStatus').textContent='NO SE PUDO CARGAR EL MAPA';
  $('routeStatus').textContent='TOCA REINTENTAR';
  $('missionName').textContent='No se pudo descargar la zona';
  $('missionDistance').textContent=String(err?.message||'Comprueba tu conexión');
  $('retryLoad').hidden=false;
  toast('Falló la descarga del mapa. Puedes reintentar.');
 }finally{networkLoading=false}
}
$('retryLoad').onclick=()=>loadNetwork(playerPos,true);
function nearestNode(p){let best=null,d=Infinity;for(const[id,q]of nodes){const x=dist(p,q);if(x<d){d=x;best=id}}return best}
function dijkstra(start,goal){if(!start||!goal)return[];const ds=new Map([[start,0]]),prev=new Map(),open=new Set([start]);while(open.size){let u=null,du=Infinity;for(const x of open){const v=ds.get(x)??Infinity;if(v<du){du=v;u=x}}if(u===null||u===goal)break;open.delete(u);for(const e of graph.get(u)||[]){const nd=du+e.len;if(nd<(ds.get(e.to)??Infinity)){ds.set(e.to,nd);prev.set(e.to,u);open.add(e.to)}}}if(!ds.has(goal))return[];const path=[goal];while(path[0]!==start){const p=prev.get(path[0]);if(p===undefined)return[];path.unshift(p)}return path}
function refreshRoute(){if(!networkReady||!customerNode)return;const p=dijkstra(currentNode||nearestNode(playerPos),customerNode);routePath=p;routeDistance=0;for(let i=1;i<p.length;i++)routeDistance+=dist(nodes.get(p[i-1]),nodes.get(p[i]));if(routeLine)map.removeLayer(routeLine);if(p.length>1)routeLine=L.polyline(p.map(id=>nodes.get(id)),{color:'#fff',weight:9,opacity:.85,interactive:false}).addTo(map).bringToFront();$('routeKm').textContent=(routeDistance/1000).toFixed(2)+' km';$('routeStatus').textContent=p.length?'GPS · RUTA RECOMENDADA':'SIN CONEXIÓN VIAL';updateMission()}
function newCustomer(){if(customerMarker)map.removeLayer(customerMarker);const ids=[...nodes.keys()];if(ids.length<2)return;let pick=null;for(let i=0;i<180;i++){const id=ids[Math.floor(Math.random()*ids.length)],d=dist(playerPos,nodes.get(id));if(d>350&&d<2200){pick=id;break}}customerNode=pick||ids[Math.floor(Math.random()*ids.length)];const p=nodes.get(customerNode);customerMarker=L.marker(p,{icon:pizzaIcon(),zIndexOffset:500}).addTo(map).bindPopup('Domicilio del cliente');$('missionName').textContent=`Cliente · Nivel ${level}`;refreshRoute()}
function updateMission(){if(!customerNode||!nodes.has(customerNode))return;const d=dist(playerPos,nodes.get(customerNode));$('missionDistance').textContent=`A ${Math.round(d)} m del cliente`;const ok=d<24&&speed<1.5;$('deliver').disabled=!ok}
function chooseNext(from,prev,turn='auto',goal=customerNode){const opts=(graph.get(from)||[]).filter(e=>e.to!==prev);if(!opts.length)return null;if(opts.length===1)return opts[0];const originP=nodes.get(from),prevP=nodes.get(prev)||playerPos;const inAngle=bearing(prevP,originP);let ranked=opts.map(e=>{const out=bearing(originP,nodes.get(e.to));let delta=((out-inAngle+540)%360)-180;return{e,delta,score:Math.abs(delta)}});if(turn==='left'){const cand=ranked.filter(x=>x.delta< -18).sort((a,b)=>Math.abs(a.delta)-Math.abs(b.delta));if(cand.length)return cand[0].e}if(turn==='right'){const cand=ranked.filter(x=>x.delta>18).sort((a,b)=>Math.abs(a.delta)-Math.abs(b.delta));if(cand.length)return cand[0].e}if(turn==='straight'){ranked.sort((a,b)=>a.score-b.score);return ranked[0].e}const path=dijkstra(from,goal);if(path.length>1){const found=opts.find(e=>e.to===path[1]);if(found)return found}ranked.sort((a,b)=>a.score-b.score);return ranked[0].e}
function beginEdge(edge,from){if(!edge)return false;currentNode=from;nextNode=edge.to;edgeLength=edge.len;edgeProgress=0;heading=bearing(nodes.get(from),nodes.get(nextNode));return true}
function arriveAtNode(){const prev=currentNode;currentNode=nextNode;playerPos=nodes.get(currentNode);nextNode=null;edgeProgress=0;const turn=left?'left':right?'right':'straight';const edge=chooseNext(currentNode,prev,turn,customerNode);left=false;right=false;if(!edge){speed=0;toast('Calle sin salida. Da vuelta en la intersección.');return}beginEdge(edge,currentNode);refreshRoute()}
function movePlayer(dt){if(!nextNode){const opts=graph.get(currentNode)||[];if(!opts.length)return;const edge=chooseNext(currentNode,null,'straight',customerNode);if(!beginEdge(edge,currentNode))return}if(gas)speed=Math.min(13+(level-1)*1.2,speed+5.8*dt);else if(brake)speed=Math.max(0,speed-10*dt);else speed=Math.max(0,speed-1.8*dt);const meters=speed*dt;edgeProgress+=meters;if(edgeProgress>=edgeLength){const overflow=edgeProgress-edgeLength;arriveAtNode();if(nextNode&&overflow>0)edgeProgress=Math.min(edgeLength,overflow)}if(nextNode){const a=nodes.get(currentNode),b=nodes.get(nextNode),t=Math.min(1,edgeProgress/edgeLength);playerPos=L.latLng(a.lat+(b.lat-a.lat)*t,a.lng+(b.lng-a.lng)*t);heading=bearing(a,b)}updateRider();$('speed').textContent=Math.round(speed*3.6);$('driveStatus').textContent=speed>.4?'CONDUCCIÓN MANUAL':'DETENIDO';if(follow)map.panTo(playerPos,{animate:false});updateMission()}
function spawnTraffic(){traffic.forEach(c=>map.removeLayer(c.marker));traffic=[];const ids=[...graph.keys()];if(!ids.length)return;for(let i=0;i<trafficCount;i++){const node=ids[Math.floor(Math.random()*ids.length)],opts=graph.get(node)||[];if(!opts.length)continue;const marker=L.marker(nodes.get(node),{icon:carIcon(),interactive:false,zIndexOffset:150}).addTo(map);const car={marker,node,prev:null,next:null,progress:0,length:1,speed:2.2+Math.random()*5.5};const edge=chooseNext(node,null,'auto',null);if(edge){car.next=edge.to;car.length=edge.len;car.heading=bearing(nodes.get(node),nodes.get(edge.to));}traffic.push(car)}}
function updateTraffic(dt){for(const c of traffic){if(!c.next)continue;c.progress+=c.speed*dt;if(c.progress>=c.length){const old=c.node;c.node=c.next;c.prev=old;c.progress=0;const edge=chooseNext(c.node,c.prev,'auto',null);if(!edge){c.next=null;continue}c.next=edge.to;c.length=edge.len;c.heading=bearing(nodes.get(c.node),nodes.get(c.next))}const a=nodes.get(c.node),b=nodes.get(c.next);if(!a||!b)continue;const t=Math.min(1,c.progress/c.length);c.marker.setLatLng([a.lat+(b.lat-a.lat)*t,a.lng+(b.lng-a.lng)*t]);const art=c.marker.getElement()?.querySelector('.traffic-art');if(art)art.style.transform=`rotate(${c.heading}deg)`}}
function finishDelivery(){if(!customerNode||dist(playerPos,nodes.get(customerNode))>24||speed>1.5){toast('Acércate al domicilio y detente para entregar.');return}deliveries++;$('deliveries').textContent=deliveries;toast('🍕 ¡Pedido entregado!');if(deliveries%3===0){level++;$('level').textContent=level;toast(`⭐ Nivel ${level}: aumenta la dificultad`)}newCustomer()}
$('deliver').onclick=finishDelivery;
function hold(id,fn){const el=$(id),down=e=>{e.preventDefault();fn(true);el.classList.add('pressed')},up=e=>{e.preventDefault();fn(false);el.classList.remove('pressed')};el.addEventListener('pointerdown',down);['pointerup','pointercancel','pointerleave','lostpointercapture'].forEach(x=>el.addEventListener(x,up))}hold('accelerate',v=>gas=v);hold('brake',v=>brake=v);hold('left',v=>left=v);hold('right',v=>right=v);
function frame(now){const dt=Math.min(.05,(now-lastFrame)/1000);lastFrame=now;if(networkReady){if(lastNetworkCenter&&dist(playerPos,lastNetworkCenter)>1050&&now-lastExtendAt>14000&&!networkLoading){lastExtendAt=now;loadNetwork(playerPos)}elapsed+=dt;$('timer').textContent=String(Math.floor(elapsed/60)).padStart(2,'0')+':'+String(Math.floor(elapsed%60)).padStart(2,'0');movePlayer(dt);updateTraffic(dt)}requestAnimationFrame(frame)}
async function locate(){if(!navigator.geolocation){map.setView(DEFAULT_CENTER,17);await loadNetwork();return}navigator.geolocation.getCurrentPosition(async p=>{origin=L.latLng(p.coords.latitude,p.coords.longitude);playerPos=origin;map.setView(origin,17);await loadNetwork(origin)},async()=>{map.setView(DEFAULT_CENTER,17);await loadNetwork(L.latLng(...DEFAULT_CENTER))},{enableHighAccuracy:true,timeout:15000,maximumAge:30000})}
$('searchArea').onclick=()=>{const q=prompt('Escribe ciudad, municipio y estado:');if(!q)return;fetch('https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q='+encodeURIComponent(q)).then(r=>r.json()).then(async d=>{if(!d.length)throw Error();speed=0;playerPos=L.latLng(+d[0].lat,+d[0].lon);currentNode=null;nextNode=null;customerNode=null;traffic.forEach(c=>map.removeLayer(c.marker));traffic=[];graph=new Map();nodes=new Map();loadedWayIds=new Set();clearNetworkLayers();networkReady=false;lastNetworkCenter=null;map.setView(playerPos,17);await loadNetwork(playerPos,true)}).catch(()=>toast('No se encontró la zona.'))};
let loadDebounce=null;map.on('moveend',()=>{if(!networkReady||!map.getBounds().contains(playerPos))return;clearTimeout(loadDebounce);loadDebounce=setTimeout(()=>{const c=map.getCenter();if(dist(c,playerPos)>1200)loadNetwork(c)},900)});
if('serviceWorker'in navigator&&location.protocol.startsWith('http'))window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(console.warn));
locate();requestAnimationFrame(frame);
