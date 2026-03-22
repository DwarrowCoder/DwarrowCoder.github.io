// Data
let hyperlanesData, planetsData, map, mapConfig;
let laneLayer, planetLayer, routeLayer;
let graph = new Map();

initMap();

async function initMap() {
    try {
        // Load Map
        const mRes =  await fetch("./data/mapconfig.json");
        if (!mRes.ok) throw new Error(`Configuration fetch failed: ${mRes.status}`);
        mapConfig = await mRes.json();
        map = L.map('map', {
            minZoom: mapConfig.minZoom,
            maxZoom: mapConfig.maxZoom,
            zoomSnap: mapConfig.zoomSnap,          
            zoomDelta: mapConfig.zoomSnap,
            center: [0, 0],
            zoom: mapConfig.zoom,
            crs: L.CRS.Simple
        });

        // Load hyperlanes
        const hRes = await fetch("./data/hyperlanes.json");
        if (!hRes.ok) throw new Error(`Hyperlanes fetch failed: ${hRes.status}`);
        hyperlanesData = await hRes.json();

        // Load planets
        const pRes = await fetch('./data/planets.geojson');
        if (!pRes.ok) throw new Error(`Planets fetch failed: ${pRes.status}`);
        const planets = await pRes.json();
        planetsData = planets.features;
    } catch(err) {
        console.error(err);
        alert("Failed to load galaxy data: check console & file paths");
    }



    // ====================== LAYERS ======================
    laneLayer = L.layerGroup().addTo(map);
    planetLayer = L.layerGroup().addTo(map);

    // ====================== HYPERLANES ======================
    hyperlanesData.forEach(feature => {
        const props = feature.properties || {};
        if(!props.name) return;
        let coords = feature.geometry.coordinates;
        coords = coords.map(([x, y]) => [y, x]);
        const route = L.polyline(coords, {  
          weight: props.major? 5 : 3,
          color: props.major? '#00ff00' : '#00aa00',
          opacity: 0.8
        });
        route.hyperlanesData = {
          name: props.name
        };
        route.bindTooltip(`<b>${route.hyperlanesData.name}</b>`, {
          sticky: true,
          offset: [10, 0],
          direction: 'auto'
        });
        laneLayer.addLayer(route);
    });

    // ====================== PLANETS ======================
    planetsData.forEach(feature => {
        const props = feature.properties || {};
        if(!props.name) return;
        const [x, y] = feature.geometry.coordinates;  
        const marker = L.circleMarker([y, x], {  
          radius: 6,
          color: '#00ff00',
          weight: 1.5,
          fillOpacity: 0.8,
          fillColor: props.canon ? '#3388ff' : '#ff8800',
          interactive: true
        });
        marker.planetData = {
          name: props.name,
          region: props.region,
          sector: props.sector,
          grid: props.grid,
          id: props.id
        };
        marker.bindTooltip(`<b>${marker.planetData.name}</b> (${marker.planetData?.grid})<br>
                            <i>${marker.planetData?.sector || 'Unknown'}</i><br>
                            ${marker.planetData?.region || 'Unknown'}`);
        planetLayer.addLayer(marker);
    });

    // ====================== HYPERLANES ======================
    hyperlanesData.forEach(route => {
        const major = route.major;
        const nodes = route.nodes;
        const planets = planetLayer.getLayers();
        let coords = [];
        let length = 0.0;
        
        if(!route.name) return;
        for(let i = 0; i < nodes.length - 1; i++){
            const fromName = nodes[i];
            const toName = nodes[i + 1];

            const fromPlanet = planets.find(p => p.planetData.name.toLowerCase() === fromName.toLowerCase());
            const toPlanet   = planets.find(p => p.planetData.name.toLowerCase() === toName.toLowerCase());

            if (!fromPlanet || !toPlanet) {
                console.warn(`Skipping connection ${fromName} → ${toName} (planet not found in data)`);
                continue;
            }

            const fromKey = fromPlanet.planetData.id;
            const toKey   = toPlanet.planetData.id;

            const fromCoord = fromPlanet.getLatLng();
            const toCoord = toPlanet.getLatLng();
            const dist = getDistance([fromCoord.lng, fromCoord.lat], [toCoord.lng, toCoord.lat]);
            length += dist;
            if(coords.length == 0) coords.push(fromCoord);
            coords.push(toCoord);

            const weight = (dist / mapConfig.UPS) * (major ? mapConfig.HPS_MAJOR : mapConfig.HPS_MINOR);

            if (!graph.has(fromKey)) graph.set(fromKey, { neighbors: [] });
            if (!graph.has(toKey))   graph.set(toKey,   { neighbors: [] });

            graph.get(fromKey).neighbors.push({ key: toKey, weight: weight, route: route.name });
            graph.get(toKey).neighbors.push(  { key: toKey, weight: weight, route: route.name });
        }
        const lane = L.polyline(coords, {  
          weight: props.major? 5 : 3,
          color: props.major? '#00ff00' : '#00aa00',
          opacity: 0.8
        });
        lane.hyperlaneData = {
          name: route.name,
          id: route.id,
          length: length
        };
        lane.bindTooltip(`<b>${lane.hyperlaneData.name}</b><br>Length: ${lane.hyperlaneData.length}`, {
          sticky: true,
          offset: [10, 0],
          direction: 'auto'
        });
        laneLayer.addLayer(lane);
    });
    console.log(`Graph built with ${graph.size} planet nodes and ${laneLayer.getLayers().length} routes`);

    // ====================== CONTEXT MENU (Right Click) ======================
    map.on('contextmenu', function(e) {
        const latlng = e.latlng;           // this is [y, x] in Simple CRS
        const x = latlng.lng;              // because Leaflet swaps them internally
        const y = latlng.lat;

        const menuHtml = `
            <b>Galaxy Coordinates</b><br>
            X: ${x.toFixed(2)}<br>
            Y: ${y.toFixed(2)}<br><br>
            <input id="context_entry" name="context-entry"><button onclick="find(context_entry.value)">Find</button><br>
            <small>Right-clicked on the map</small>
        `;

        L.popup({
            className: 'context-menu-popup',
            closeButton: true,
            autoClose: true,
            offset: [0, -10]
        })
        .setLatLng(e.latlng)
        .setContent(menuHtml)
        .openOn(map);
    });
}

// ====================== Helper Functions ======================
window.find = function(name) {
    let layer = Array.from(planetLayer.getLayers()).find(l => 
        l.planetData && l.planetData.name === name);
    if (layer) map.flyTo(layer.getLatLng(), 5);
    else {
      layer = Array.from(laneLayer.getLayers()).find(l =>
          l.hyperlaneData && l.hyperlaneData.name === name);
      if (layer) map.flyToBounds(layer.getBounds(), { padding: [50, 50] });
    }
};

function getDistance(pt1, pt2){
    return Math.hypot((pt1[0] - pt2[0]) + (pt1[1] - pt2[1]));
}