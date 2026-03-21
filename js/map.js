// Data
let hyperlanesData, planetsData, map, mapConfig; 

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

    // Add hyperlanes to map
    laneLayer = L.layerGroup().addTo(map);
    hyperlanesData.forEach(feature => {
        const props = feature.properties;
        if(!props.name) return;
        let len = feature.geometry.coordinates.length;
        for(let xy = 0; xy < len; x++) {
            const x = feature.geometry.coordinates[xy][0];
            const y = feature.geometry.coordinates[xy][1];
            feature.geometry.coordinates[xy][1] = x;
            feature.geometry.coordinates[xy][0] = y;
        }
        const coords = feature.geometry.coordinates;
        const route = L.polyline(coords, {  
          weight: props.major? 5 : 3,
          color: props.major? '#00ff00' : '#00aa00',
          opacity: 0.8,
          interactive: true
        });
        route.hyperlanesData = {
          name: props.name
        };
        route.bindTooltip(`<b>${route.hyperlanesData.name}</b>`);
        laneLayer.addLayer(route);
    });

    // Add planets to map
    planetLayer = L.layerGroup().addTo(map);
    planetsData.forEach(feature => {
        const props = feature.properties;
        if(!props.name) return;
        const coords = feature.geometry.coordinates;  
        const marker = L.circleMarker([coords[1], coords[0]], {  
          radius: 6,
          color: '#00ff00',
          fillColor: '#0066cc',
          fillOpacity: 0.8,
          interactive: true
        });
        marker.planetData = {
          name: props.name,
          region: props.region,
          sector: props.sector
        };
        marker.on('click', (e) => {
            e.originalEvent.stopPropagation();
            addWaypoint(marker);
        });
        marker.bindTooltip(`<b>${marker.planetData.name}</b><br><i>${marker.planetData.sector}</i><br>${marker.planetData.region || 'Unknown'}`);
        planetLayer.addLayer(marker);
    });
}