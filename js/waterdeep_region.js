const map = L.map('map', {
    minZoom: -3,
    maxZoom: 3,
    center: [0, 0],
    zoom: -1,
    crs: L.CRS.Simple
});

const imgWidth = 900;
const imgHeight = 1045;
const imageBounds = [[0, 0], [imgHeight, imgWidth]];
L.imageOverlay('./images/waterdeep_region.jpg', imageBounds).addTo(map);
map.fitBounds(imageBounds);