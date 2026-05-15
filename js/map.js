// Data
let map, mapConfig;
let laneLayer, planetLayer, routeLayer;
let graph = new Map();
let grid = new Map();

// Priority Queue
class PriorityQueue {
    constructor() {
        this.elements = [];
    }
    enqueue(value, priority) {
        this.elements.push({ value, priority });
        this.elements.sort((a, b) => a.priority - b.priority);
    }
    dequeue() {
        return this.elements.shift()?.value;
    }
    isEmpty() {
        return this.elements.length === 0;
    }
}

initMap();

async function initMap() {
    let attributionData, hyperlanesData, planetsData, gridData;

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

        // Load Attributions
        const aRes = await fetch("./data/attribution.json");
        if (!aRes.ok) throw new Error(`Attributions fetch failed: ${aRes.status}`);
        attributionData = await aRes.json();

        // Load hyperlanes
        const hRes = await fetch("./data/hyperlanes.json");
        if (!hRes.ok) throw new Error(`Hyperlanes fetch failed: ${hRes.status}`);
        hyperlanesData = await hRes.json();

        // Load planets
        const pRes = await fetch('./data/planets.geojson');
        if (!pRes.ok) throw new Error(`Planets fetch failed: ${pRes.status}`);
        const planets = await pRes.json();
        planetsData = planets.features;

        const gRes =  await fetch("./data/grid.json");
        if (!gRes.ok) throw new Error(`Configuration fetch failed: ${gRes.status}`);
        gridData = await gRes.json();
    } catch(err) {
        console.error(err);
        alert("Failed to load galaxy data: check console & file paths");
    }



    // ====================== LAYERS ======================
    laneLayer = L.layerGroup().addTo(map);
    planetLayer = L.layerGroup();

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
        if(!grid.has(props.grid)) grid.set(props.grid, []);
        grid.get(props.grid).push(props.name);
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

            if (!graph.has(fromKey)) graph.set(fromKey, { neighbors: new Map() });
            if (!graph.has(toKey))   graph.set(toKey,   { neighbors: new Map() });

            graph.get(fromKey).neighbors.set(toKey, { weight: weight, route: route.name });
            graph.get(toKey).neighbors.set(fromKey, { weight: weight, route: route.name });
        }
        const lane = L.polyline(coords, {  
          weight: major? 5 : 3,
          color: major? '#00ff00' : '#00aa00',
          opacity: 0.8
        });
        lane.hyperlaneData = {
          name: route.name,
          id: route.id,
          length: length
        };
        lane.bindTooltip(`<b>${lane.hyperlaneData.name}</b><br>Length: ${(lane.hyperlaneData.length * 15).toFixed(2)}`, {
          sticky: true,
          offset: [10, 0],
          direction: 'auto'
        });
        laneLayer.addLayer(lane);
    });
    console.log(`Graph built with ${graph.size} planet nodes and ${laneLayer.getLayers().length} routes`);
    routeLayer = L.layerGroup().addTo(map);
    planetLayer.addTo(map);

    let attrText = "Thanks to | ";
    attributionData.forEach(attr => {
        attrText += `<a href="${attr.url}">${attr.name}</a> - ${attr.content} |`;
    });
    map.attributionControl.addAttribution(attrText);

    // ====================== BUILD GRID =====================================
    planetLayer.getLayers().forEach(planet => {
        grid.get(planet.planetData.grid).forEach(target => {
            if(planet.planetData.name != target) {
                const toPlanet = planetLayer.getLayers().find(l => l.planetData && l.planetData.name === target);
                const fromKey = planet.planetData.id;
                const toKey = toPlanet.planetData.id;

                const fromCoord = planet.getLatLng();
                const toCoord = toPlanet.getLatLng();
                const dist = getDistance([fromCoord.lng, fromCoord.lat], [toCoord.lng, toCoord.lat]);

                const weight = (dist / mapConfig.UPS) * (planet.planetData.sector != "Deep Core" || toPlanet.planetData.sector != "Deep Core" ? mapConfig.HPS_OFFROUTE : mapConfig.HPS_DEEPCORE);

                if (!graph.has(fromKey)) graph.set(fromKey, { neighbors: new Map() });

                if (!graph.get(fromKey).neighbors.has(toKey))  graph.get(fromKey).neighbors.set(toKey, { weight: weight, route: "none" });
            }
        });
        gridData[planet.planetData.grid].forEach(toGrid => {
            grid.get(toGrid)?.forEach(target => {
                if(planet.planetData.name != target) {
                    const toPlanet = planetLayer.find(l => l.planetData && l.planetData.name === target);
                    const fromKey = planet.planetData.id;
                    const toKey = toPlanet.planetData.id;

                    const fromCoord = planet.getLatLng();
                    const toCoord = toPlanet.getLatLng();
                    const dist = getDistance([fromCoord.lng, fromCoord.lat], [toCoord.lng, toCoord.lat]);

                    const weight = (dist / mapConfig.UPS) * (planet.planetData.sector != "Deep Core" || toPlanet.planetData.sector != "Deep Core" ? mapConfig.HPS_OFFROUTE : mapConfig.HPS_DEEPCORE);

                    if (!graph.has(fromKey)) graph.set(fromKey, { neighbors: new Map() });

                    if (!graph.get(fromKey).neighbors.has(toKey))  graph.get(fromKey).neighbors.set(toKey, { weight: weight, route: "none" });
                }
            });
        });
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

    document.querySelector('button').addEventListener('click', () => {
        const originName = document.getElementById('origin').value.trim();
        const destName = document.getElementById('destination').value.trim();

        if (!originName || !destName) {
            alert("Enter both origin and destination");
            return;
        }

        const originLayer = Array.from(planetLayer.getLayers())
            .find(l => l.planetData?.name.toLowerCase() === originName.toLowerCase());
        const destLayer = Array.from(planetLayer.getLayers())
            .find(l => l.planetData?.name.toLowerCase() === destName.toLowerCase());

        if (!originLayer || !destLayer) {
            alert("One or both planets not found");
            return;
        }

        const startId = originLayer.planetData.id;
        const goalId = destLayer.planetData.id;

        console.time("Dijkstra");
        const dijkstraPath = dijkstra(startId, goalId);
        console.timeEnd("Dijkstra");

        console.time("A*");
        const aStarPath = aStar(startId, goalId);
        console.timeEnd("A*");

        // Draw the route (example with A*)
        drawRoute(aStarPath || dijkstraPath, originLayer, destLayer);
    });


}

// ====================== Helper Functions ======================
window.find = function(name) {
    let layer = Array.from(planetLayer.getLayers()).find(l => 
        l.planetData && l.planetData.name.toLowerCase() === name.toLowerCase());
    if (layer) map.flyTo(layer.getLatLng(), 5);
    else {
      layer = Array.from(laneLayer.getLayers()).find(l =>
          l.hyperlaneData && l.hyperlaneData.name.toLowerCase() === name.toLowerCase());
      if (layer) map.flyToBounds(layer.getBounds(), { padding: [50, 50] });
    }
};

function getDistance(pt1, pt2){
    return Math.hypot((pt1[0] - pt2[0]), (pt1[1] - pt2[1]));
}

// ====================== PATHFINDING ======================

/**
 * Dijkstra's Algorithm - finds shortest path with non-negative weights
 */
function dijkstra(startId, goalId) {
    const distances = new Map();
    const previous = new Map();
    const pq = new PriorityQueue();

    // Initialize
    for (let id of graph.keys()) {
        distances.set(id, Infinity);
    }
    distances.set(startId, 0);
    pq.enqueue(startId, 0);

    while (!pq.isEmpty()) {
        const current = pq.dequeue();
        if (current === goalId) break;

        const neighbors = graph.get(current)?.neighbors || new Map();
        for (let [neighborId, edge] of neighbors) {
            const newDist = distances.get(current) + edge.weight;
            if (newDist < distances.get(neighborId)) {
                distances.set(neighborId, newDist);
                previous.set(neighborId, current);
                pq.enqueue(neighborId, newDist);
            }
        }
    }

    return reconstructPath(previous, startId, goalId);
}

/**
 * A* Algorithm - uses heuristic for faster search
 */
function aStar(startId, goalId) {
    const gScore = new Map();   // cost from start
    const fScore = new Map();   // g + h
    const previous = new Map();
    const pq = new PriorityQueue();

    const goalPlanet = getPlanetById(goalId);

    // Initialize
    for (let id of graph.keys()) {
        gScore.set(id, Infinity);
        fScore.set(id, Infinity);
    }
    gScore.set(startId, 0);
    fScore.set(startId, heuristic(startId, goalId, goalPlanet));
    pq.enqueue(startId, fScore.get(startId));

    while (!pq.isEmpty()) {
        const current = pq.dequeue();
        if (current === goalId) break;

        const neighbors = graph.get(current)?.neighbors || new Map();
        for (let [neighborId, edge] of neighbors) {
            const tentativeG = gScore.get(current) + edge.weight;

            if (tentativeG < gScore.get(neighborId)) {
                previous.set(neighborId, current);
                gScore.set(neighborId, tentativeG);
                fScore.set(neighborId, tentativeG + heuristic(neighborId, goalId));
                pq.enqueue(neighborId, fScore.get(neighborId));
            }
        }
    }

    return reconstructPath(previous, startId, goalId);
}

// Euclidean distance heuristic (very good for this map)
function heuristic(nodeId, goalId, goalPlanetCache = null) {
    const node = getPlanetById(nodeId);
    const goal = goalPlanetCache || getPlanetById(goalId);
    if (!node || !goal) return 0;

    const dx = node.getLatLng().lng - goal.getLatLng().lng;
    const dy = node.getLatLng().lat - goal.getLatLng().lat;
    return Math.hypot(dx, dy) * 0.8; // slight underestimation = admissible
}

function getPlanetById(id) {
    return planetLayer.getLayers().find(p => p.planetData?.id === id);
}

function reconstructPath(previous, startId, goalId) {
    const path = [];
    let current = goalId;

    while (current !== undefined) {
        path.unshift(current);
        if (current === startId) break;
        current = previous.get(current);
    }

    return path.length > 1 && path[0] === startId ? path : null;
}

// Simple route drawer
function drawRoute(pathIds, startLayer, goalLayer) {
    routeLayer.clearLayers();
    if (!pathIds) {
        alert("No route found");
        return;
    }

    const coords = [];
    pathIds.forEach((id, i) => {
        const planet = getPlanetById(id);
        if (planet) coords.push(planet.getLatLng());
    });

    const polyline = L.polyline(coords, {
        color: '#ffff00',
        weight: 6,
        opacity: 0.9,
        dashArray: '10, 10'
    }).addTo(routeLayer);

    // Optional: highlight start/end
    L.circleMarker(startLayer.getLatLng(), {radius: 10, color: '#00ff00'}).addTo(routeLayer);
    L.circleMarker(goalLayer.getLatLng(), {radius: 10, color: '#ff0000'}).addTo(routeLayer);

    map.flyToBounds(polyline.getBounds(), {padding: [50, 50]});
}