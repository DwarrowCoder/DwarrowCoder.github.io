// Map Init
const map = L.map('map', {
    minZoom: -8,
    maxZoom: 6,
    zoomSnap: 0.5,                  // Smoother zoom steps
    zoomDelta: 0.5,
    center: [0, 0],
    zoom: -4,
    crs: L.CRS.Simple
});

L.tileLayer('', {
    attribution: 'Star Wars Galaxy – Data: Wladymir Brborich (Wason1797), Brian Kennedy (bpkennedy), Colby Newman (parzivail)',
}).addTo(map);