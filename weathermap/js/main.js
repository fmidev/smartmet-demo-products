/* open street map WMS example */
/* Ville Ilkka, FMI 2018 - */

var fmi = fmi || {};
fmi.weather = fmi.weather || {};

(function (weatherMap, undefined) {

    // Debugging function
    weatherMap.debug = function (str) {
        if (mapconfigurations.debug === true)
            console.log(str)
    }

    // Create a map object and set the view to a given lat-lon and zoom level.
    var map = L.map('map', {
        zoom: mapconfigurations.timeDimensionOptions.zoom,
        fullscreenControl: mapconfigurations.timeDimensionOptions.fullscreenControl,
        timeDimension: mapconfigurations.timeDimensionOptions.timeDimension,
        timeDimensionControl: mapconfigurations.timeDimensionOptions.timeDimensionControl,
        scrollWheelZoom: mapconfigurations.timeDimensionOptions.scrollWheelZoom,

        timeDimensionOptions: {
            timeInterval: mapconfigurations.timeDimensionOptions.timeInterval,
            period: mapconfigurations.timeDimensionOptions.period,
        },

        timeDimensionControlOptions: {
            autoPlay: mapconfigurations.timeDimensionOptions.autoPlay,
            timeZones: mapconfigurations.timeDimensionOptions.timeZones,
            playerOptions: mapconfigurations.timeDimensionOptions.playerOptions,
            speedSlider: mapconfigurations.timeDimensionOptions.speedSlider
        },
        center: mapconfigurations.mapCenter,
    })

    var southWest = new L.LatLng(mapconfigurations.bounds.south, mapconfigurations.bounds.east)
    var northEast = new L.LatLng(mapconfigurations.bounds.north, mapconfigurations.bounds.west)
    var bounds = new L.LatLngBounds(southWest, northEast)
    map.fitBounds(bounds, { padding: [5, 5] })

    // Add a base map layer. 
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 18
    }).addTo(map);

    // Make a list of layers and their names
    var layers = Object.keys(mapconfigurations.layers)
    var layernames = Object.values(mapconfigurations.layers)
    weatherMap.debug(layernames)

    // Create a list of WMS layers
    var wmsLayers = []

    //Create Leaflet tile layers for each WMS layer using the provided mapconfigurations
    layernames.forEach(wms => {
        const { wmsserver, wmsOpacity, wmsTileSize } = mapconfigurations
        const wmsLayer = L.tileLayer.wms(wmsserver, {
            layers: wms,
            format: 'image/png',
            transparent: true,
            version: '1.3.0',
            crs: L.CRS.EPSG4326,
            // attribution: 'Meteorology Department',
            opacity: wmsOpacity,
            tileSize: wmsTileSize
        });
        wmsLayers.push(wmsLayer)
    })

    // Create an array of time-aware WMS layers by iterating over an array of WMS layers
    const wmsTimeLayers = wmsLayers.map(wms =>
        L.timeDimension.layer.wms(wms, {
            updateTimeDimension: true,
            wmsVersion: '1.3.0'
        })
    )

    // add a layer control widget when multiple layers are available
    if (wmsLayers.length > 1) {
        var overlayMaps = {}
        for (var i = 0; i < Object.keys(layernames).length; i++) {
            overlayMaps[layers[i]] = wmsTimeLayers[i]
        }
        L.control.layers(overlayMaps, null, { collapsed: true }).addTo(map)
    } else {
        wmsTimeLayers[0].addTo(map)
    }

    // call getLegend for selected layer when the base layer changes
    map.on('baselayerchange', (e) => {
        weatherMap.debug(e.layer._baseLayer.options.layers)
        getLegend(e.layer._baseLayer.options.layers)
    })

    // Fetch the legend for the selected layer
    const getLegend = (layer) => {
        var url = `${mapconfigurations.wmsserver}?service=WMS&version=1.3.0&request=GetCapabilities`

        fetch(url)
            .then(response => response.text())
            .then(data => {
                var parser = new DOMParser()
                var xmlDoc = parser.parseFromString(data, 'text/xml')
                var layers = xmlDoc.querySelectorAll('Layer')

                layers.forEach(layerNode => {
                    var name = layerNode.querySelector('Name').textContent
                    if (name === layer) {
                        var legendURL = layerNode.querySelector('LegendURL OnlineResource').getAttribute('xlink:href')
                        var width = layerNode.querySelector('LegendURL').getAttribute('width') + 'px'
                        var height = layerNode.querySelector('LegendURL').getAttribute('height') + 'px'

                        displayLegend(legendURL, width, height)
                    }
                });
            })
            .catch(error => console.error('Error fetching legend:', error))
    }

    // Display the legend in the legend-container div
    const displayLegend = (legendURL, width, height) => {
        var div = document.getElementById('legend-container')
        div.innerHTML = ''

        var img = document.createElement('img')
        img.src = legendURL
        img.style.width = width
        img.style.height = height

        div.appendChild(img)
    }


}(fmi.weather.weatherMap = fmi.weather.weatherMap || {}))
