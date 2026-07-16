const map = L.map('map', {
    minZoom: -3,
    maxZoom: 3,
    center: [0, 0],
    zoom: -1,
    crs: L.CRS.Simple
});

const imgWidth = 2558;
const imgHeight = 5457;
const imageBounds = [[0, 0], [imgHeight, imgWidth]];
L.imageOverlay('./images/waterdeep.jpg', imageBounds).addTo(map);
map.fitBounds(imageBounds);

var yawningPortal = L.marker([2046, 1467]).addTo(map);
yawningPortal.bindTooltip('The Yawning Portal')