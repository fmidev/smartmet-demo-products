/* open street map WMS example */
/* Ville Ilkka, FMI 2018 - */

var fmi = fmi || {};                                                                                                                  
fmi.weather = fmi.weather || {}; 

(function(weatherMap, undefined) {

    weatherMap.debug = function(str) {
        if(mapconfigurations.debug === true)
        console.log(str)
    }

    var map = L.map('map', {
        zoom: mapconfigurations.timeDimensionOptions.zoom,
        fullscreenControl: mapconfigurations.timeDimensionOptions.fullscreenControl,
        timeDimension: mapconfigurations.timeDimensionOptions.timeDimension,
        timeDimensionControl: mapconfigurations.timeDimensionOptions.timeDimensionControl,
        scrollWheelZoom: mapconfigurations.timeDimensionOptions.scrollWheelZoom,

        timeDimensionOptions:{
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

    var southWest = new L.LatLng( mapconfigurations.bounds.south, mapconfigurations.bounds.east )
    var northEast = new L.LatLng( mapconfigurations.bounds.north, mapconfigurations.bounds.west )
    var bounds = new L.LatLngBounds(southWest,northEast)
    map.fitBounds(bounds, { padding: [5, 5] })

    L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}', {
                attribution: `${mapconfigurations.attribution}`,
                maxZoom: 18,
                id: 'mapbox.outdoors',
                accessToken: 'pk.eyJ1IjoibmFra2ltIiwiYSI6ImNqNWYzNzVvaDB3YmUyeHBuOWdwZnM0bHMifQ.QZCKhwf3ET5ujEeZ6_8X_Q'
            }).addTo(map)

    var WMSserver = mapconfigurations.wmsserver

    var layers = Object.keys(mapconfigurations.layers)
    var layernames = Object.values(mapconfigurations.layers)
    weatherMap.debug(layernames)

    // wms-layers
    var wmsLayers = []
    layernames.forEach(function(wms) {
        wmsLayers.push(
            L.tileLayer.wms(WMSserver, {
                layers: wms,
                format: 'image/png',
                transparent: true,
                version: '1.3.0',
                crs: L.CRS.EPSG4326,
                // attribution: 'Meteorology Department',
                opacity: mapconfigurations.wmsOpacity,
                tileSize: mapconfigurations.wmsTileSize
            })
        )
    })

    var wmsTimeLayers = []
    wmsLayers.forEach(function(wms) {
        wmsTimeLayers.push(
            L.timeDimension.layer.wms(wms, {
                updateTimeDimension: true,
                wmsVersion: '1.3.0'
            })
        )
    })

    if (wmsLayers.length > 1) {
        var overlayMaps = {}
        for(var i = 0; i < Object.keys(layernames).length; i++) {
            overlayMaps[layers[i]] = wmsTimeLayers[i]
        }
        L.control.layers(overlayMaps,null,{collapsed:true}).addTo(map)
    } else {
        wmsTimeLayers[0].addTo(map)
    }

    map.on('baselayerchange', function(e) {
        layer = e['layer']
        weatherMap.debug(e.layer._baseLayer.options.layers)
        getLegend(e.layer._baseLayer.options.layers)
    })

    getLegend = function (name) {
        var div = document.getElementById('legend-container')
        div.innerHTML = ''
        $.getJSON( "../legend.php?server="+mapconfigurations.wmsserver+"&layer="+name, function( data ) {
            weatherMap.debug(data)
            weatherMap.debug('Add legend')
            var img = document.createElement("img")
                img.src = data.link
                div.appendChild(img)
        })
    }

    var testLegend = L.control({
        position: 'topright'
    })
}(fmi.weather.weatherMap = fmi.weather.weatherMap || {}))