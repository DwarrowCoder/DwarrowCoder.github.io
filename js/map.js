// Data
let hyperlanesData, planetsData, map, mapConfig;
let laneLayer, planetLayer;

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
        const hRes = await fetch("./data/hyperlanes.geojson");
        if (!hRes.ok) throw new Error(`Hyperlanes fetch failed: ${hRes.status}`);
        const hyperlanes = await hRes.json();
        hyperlanesData = hyperlanes.features;

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
          grid: props.grid
        };
        marker.bindTooltip(`<b>${marker.planetData.name}</b> (${marker.planetData?.grid})<br>
                            <i>${marker.planetData?.sector || 'Unknown'}</i><br>
                            ${marker.planetData?.region || 'Unknown'}`);
        planetLayer.addLayer(marker);
    });

    // ====================== CONTEXT MENU (Right Click) ======================
    map.on('contextmenu', function(e) {
        const latlng = e.latlng;           // this is [y, x] in Simple CRS
        const x = latlng.lng;              // because Leaflet swaps them internally
        const y = latlng.lat;

        const menuHtml = `
            <b>Galaxy Coordinates</b><br>
            X: ${x.toFixed(2)}<br>
            Y: ${y.toFixed(2)}<br><br>
            <input id="context-entry" name="context-entry"><button onclick="find(context-entry.value)">Find</button><br>
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