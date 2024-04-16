// example configuration settings

var d = new Date()
var dd = new Date(Math.floor(d.getTime()/10800000)*10800000)
var now = dd.toISOString()


var mapconfigurations = {
  debug: true, // debug mode for development, messages are printed to console
  wmsserver: 'http://smartmet.fmi.fi/wms', 
  attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Finnish Meteorological Institute',
  mapCenter: [60, 25], // lat, lon
  bounds: {north: 72.0, east: 35.0, south: 55.0, west: 20.0},
  // wms layers
  layers: {
    'ECMWF Total Cloud Cover': 'fmi:ecmwf:totalcloudcover',
    'ECMWF Precipitation': 'fmi:ecmwf:precipitation',
    'ECMWF 2m Temperature': 'fmi:harmonie:temperature', // fmi:gfs:sfc:temperature || fmi:ecmwf:rawtemperature
  },
  wmsOpacity: '0.8',
  wmsTileSize: 2048,
  layerOptions: {
    attribution: 'Finnish Meteorological institute',
    opacity: '0.5',
    tileSize: 512
  },
  // https://github.com/socib/Leaflet.TimeDimension
  timeDimensionOptions: {
    zoom: 6,
    fullscreenControl: true,
    timeDimension: true,
    timeDimensionControl: true,
    scrollWheelZoom: false,
    autoPlay: false,
    speedSlider: false,
    timeZones: ['local'], // or ['utc']
    playerOptions: {
        buffer: 0,
        transitionTime: 1500, // 1000/1500 ~ 0.7 fps
        loop: true
    },
    timeInterval: now + "/PT72H",
    period: "PT3H",
  }
};