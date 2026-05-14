/* open street map WMS example */
/* Ville Ilkka, FMI 2018 - */

var fmi = fmi || {};
fmi.weather = fmi.weather || {};

(function (weatherMap, undefined) {

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
            period: mapconfigurations.timeDimensionOptions.period
        },

        timeDimensionControlOptions: {
            autoPlay: mapconfigurations.timeDimensionOptions.autoPlay,
            timeZones: mapconfigurations.timeDimensionOptions.timeZones,
            playerOptions: mapconfigurations.timeDimensionOptions.playerOptions,
            speedSlider: mapconfigurations.timeDimensionOptions.speedSlider
        },
        center: mapconfigurations.mapCenter
    })

    // Add a base map layer.
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 18
    }).addTo(map)

    var displayNames = Object.keys(mapconfigurations.layers)
    var wmsLayerNames = Object.values(mapconfigurations.layers)
    weatherMap.debug(wmsLayerNames)

    var opacity = parseFloat(mapconfigurations.wmsOpacity)
    var tileSize = mapconfigurations.wmsTileSize

    // Build a time-aware WMS layer for each configured layer.
    // No `crs` override — the WMS request uses the map's CRS so tiles
    // align with the OSM base map.
    var wmsTimeLayers = wmsLayerNames.map(function (wmsName) {
        var wmsLayer = L.tileLayer.wms(mapconfigurations.wmsserver, {
            layers: wmsName,
            format: 'image/png',
            transparent: true,
            version: '1.3.0',
            opacity: opacity,
            tileSize: tileSize
        })
        return L.timeDimension.layer.wms(wmsLayer, {
            updateTimeDimension: true,
            wmsVersion: '1.3.0'
        })
    })

    // Map each time-dimension layer back to its WMS layer name so legend
    // lookup doesn't have to reach into private `_baseLayer` fields.
    var wmsNameByLayer = new Map()
    wmsTimeLayers.forEach(function (tdLayer, i) {
        wmsNameByLayer.set(tdLayer, wmsLayerNames[i])
    })

    // Show the picker even when there's only one layer, so behaviour
    // is consistent (user always picks). collapsed:false makes it discoverable.
    var baseLayers = {}
    displayNames.forEach(function (name, i) {
        baseLayers[name] = wmsTimeLayers[i]
    })
    L.control.layers(baseLayers, null, { collapsed: false }).addTo(map)

    map.on('baselayerchange', function (e) {
        var name = wmsNameByLayer.get(e.layer)
        weatherMap.debug(name)
        if (name) getLegend(name)
    })

    // Cache GetCapabilities — it's the same response for every layer.
    var capabilitiesPromise = null
    function fetchCapabilities() {
        if (!capabilitiesPromise) {
            var url = mapconfigurations.wmsserver +
                '?service=WMS&version=1.3.0&request=GetCapabilities'
            capabilitiesPromise = fetch(url).then(function (r) { return r.text() })
        }
        return capabilitiesPromise
    }

    // Fetch the legend image URL from the server's GetCapabilities response.
    // A layer can expose several Style elements, each with its own LegendURL —
    // pick the one with the largest area (likely the colour ramp rather than
    // a tiny symbol icon).
    function getLegend(layerName) {
        fetchCapabilities()
            .then(function (data) {
                var xmlDoc = new DOMParser().parseFromString(data, 'text/xml')
                var layerNodes = xmlDoc.querySelectorAll('Layer')
                var match = null
                layerNodes.forEach(function (node) {
                    var nameEl = node.querySelector(':scope > Name')
                    if (nameEl && nameEl.textContent === layerName) match = node
                })
                if (!match) { clearLegend(); return }

                var legends = match.querySelectorAll('LegendURL')
                var best = null
                var bestArea = -1
                legends.forEach(function (node) {
                    var res = node.querySelector('OnlineResource')
                    if (!res) return
                    var w = parseInt(node.getAttribute('width'), 10) || 0
                    var h = parseInt(node.getAttribute('height'), 10) || 0
                    var area = w * h
                    if (area > bestArea) {
                        bestArea = area
                        best = {
                            href: res.getAttribute('xlink:href'),
                            width: w ? w + 'px' : 'auto',
                            height: h ? h + 'px' : 'auto'
                        }
                    }
                })
                if (best) displayLegend(best.href, best.width, best.height)
                else clearLegend()
            })
            .catch(function (err) {
                console.error('Error fetching legend:', err)
                clearLegend()
            })
    }

    function displayLegend(legendURL, width, height) {
        var div = document.getElementById('legend-container')
        div.innerHTML = ''
        var img = document.createElement('img')
        img.src = legendURL
        img.alt = ''
        if (width) img.style.width = width
        if (height) img.style.height = height
        div.appendChild(img)
    }

    function clearLegend() {
        var div = document.getElementById('legend-container')
        if (div) div.innerHTML = ''
    }

}(fmi.weather.weatherMap = fmi.weather.weatherMap || {}))
