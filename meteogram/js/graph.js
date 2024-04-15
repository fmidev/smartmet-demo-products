


var fmi = fmi || {};
fmi.weather = fmi.weather || {};


(function (weatherGraph, undefined) {
                                                 
    "use strict"
    var debug = true
    var container = 'fmi-weather-graph'
    var locationname = ''
    var latlon = ''

    weatherGraph.debug = function (str) {
        if (debug == true) {
            console.log(str)
        }
    }

    // -------------------------------------
    // constuct weather Graph and its container
    // -------------------------------------

    weatherGraph.construct = function () {

        var locations = Object.keys(graphconf.locations)
        var coordinates = Object.values(graphconf.locations)

        locationname = locations[0]
        latlon = coordinates[0]

        if (locations.length > 1) {
            var input = '<div id="select-wrapper" style="width:100%;display:table;">'
            var input = input + '<div id="select-locations" style="text-align:center;display:table-cell;vertical-align:middle;">'
            var input = input + '<select class="forecast-target">'
            for (var i = 0; i < locations.length; i++) {
                input = input + `<option value="${coordinates[i]}">${locations[i]}</option>`
            }
            var input = input + '</select>'
            var input = input + '</div>'
            var input = input + '</div>'

            $('#fmi-weather-graph-container').append(input)
        }
        $('#fmi-weather-graph-container').append('<div id="fmi-weather-graph" class="fmi-body"></div>')

        var html = '<div id="fmi-weather-container" style="width:100%; height:300px;">'
        $(container).append(html)

        $('.forecast-target').change(function () {
            latlon = $(this).val()
            locationname = $(this).find("option:selected").text()
            weatherGraph.getData()
        })
        weatherGraph.getData()
    }

    // -------------------------------------
    // get data from timeseries
    // -------------------------------------

    var formattedData
    weatherGraph.getData = function () {
        var url = `${graphconf.serviceURL}`
        url = url + `&param=epochtime,smartsymbol,smartsymboltext,precipitation1h,temperature,totalcloudcover,dark,windspeedms,winddirection,time,place`
        url = url + `&latlon=${latlon}`
        url = url + `&producer=${graphconf.producer}`
        url = url + `&format=json`
        url = url + `&timestep=${graphconf.timestep}`
        url = url + `&timesteps=${graphconf.timesteps}`
        url = url + `&lang=${graphconf.lang}`
        $.ajax({
            crossOrigin: true,
            url: url,
            error: function (error) {
                weatherGraph.debug('An error has occurred while loading the data')
            },
            success: function (data) {
                // pass data to functions
                // add callbacks
                formattedData = weatherGraph.formatData(data)
                weatherGraph.constructGraph(formattedData, container)
            }
        })
    }


    // -------------------------------------
    // format json data for highcharts
    // -------------------------------------

    weatherGraph.formatData = function (data) {
        return data.reduce((formattedData, obj) => {
            formattedData[0].push(new Date(obj.epochtime * 1000))
            formattedData[1].push(obj.temperature)
            formattedData[2].push(obj.smartsymbol)
            formattedData[3].push(obj.totalcloudcover)
            formattedData[4].push(obj.precipitation1h)
            formattedData[5].push(obj.dark)
            formattedData[6].push(obj.windspeedms)
            formattedData[7].push(obj.winddirection)
            formattedData[8].push(obj.smartsymboltext)
            return formattedData
        }, [[], [], [], [], [], [], [], [], []])
    }


    // -------------------------------------
    // format time stamps and labels
    // -------------------------------------

    weatherGraph.formatTime = function (epoch) {
        var date = new Date(epoch)
        var options = { weekday: 'long', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }
        return date.toLocaleString('en-US', options)
    }

    weatherGraph.formatTimeLabel = value => `${value < 10 ? '0' : ''}${value}`

    weatherGraph.resolveWeekDay = value =>
        ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][value]



    // -------------------------------------
    // construct weather symbol
    // -------------------------------------

    weatherGraph.weatherSymbol = function (data, timestamp) {
        // Find the index of the timestamp in the array
        var index = data[0].indexOf(timestamp)
        // If index is found, return the corresponding symbol
        if (index !== -1) {
            return data[2][index] + ".svg"
        }
        // Return an empty string if timestamp is not found
        return ""
    }

    // -------------------------------------
    // get the wind direction text
    // -------------------------------------

    weatherGraph.resolveWindDirectionText = function (value) {
        // Define wind direction sectors and corresponding labels
        const sectors = [
            { min: 0, max: 22.5, label: "north wind" },
            { min: 22.5, max: 67.5, label: "north-east wind" },
            { min: 67.5, max: 112.5, label: "east wind" },
            { min: 112.5, max: 157.5, label: "south-east wind" },
            { min: 157.5, max: 202.5, label: "south wind" },
            { min: 202.5, max: 247.5, label: "south-west wind" },
            { min: 247.5, max: 292.5, label: "west wind" },
            { min: 292.5, max: 337.5, label: "north-west wind" },
            { min: 337.5, max: 360, label: "north wind" }
        ]

        // Find the sector that the value falls into
        const sector = sectors.find(sector => value >= sector.min && value < sector.max)

        // Return the corresponding label
        return sector ? sector.label : "unknown wind direction"
    }

    // -------------------------------------
    // get the wind direction and speed
    // -------------------------------------

    weatherGraph.windDirection = function (data, timestamp) {
        // Find the index of the timestamp in the first array
        const index = data[0].indexOf(timestamp)

        // If the timestamp is found, retrieve the corresponding direction and wind speed
        if (index !== -1) {
            const direction = data[7][index]
            const windspeed = data[6][index]
            return { "windspeed": windspeed, "winddirection": direction }
        } else {
            // Handle the case where the timestamp is not found
            return { "windspeed": "unknown", "winddirection": "unknown" }
        }
    }


    // -------------------------------------
    // constuct tooltip in html format
    // -------------------------------------

    weatherGraph.constructTooltip = function () {
        var epoch = this.x
        var temperature = "Temperature: <b>" + this.points[0]?.y + " °C</b></br>"
        var precipitation = "Precipitation: <b>" + this.points[1]?.y + " mm</b></br>"
        var wind = "Wind: <b>" + this.points[3]?.y + " m/s " + weatherGraph.resolveWindDirectionText(this.points[4]?.y) + "</b></br>"
        var weather = "Weather: " + formattedData[8][this.points[1]?.point.index]
        var timeMessage = weatherGraph.formatTime(epoch) + "<br/>"

        return '<div style="height:70px">' + timeMessage + temperature + precipitation + wind + weather + '</div>'
    }

    weatherGraph.addDailyPlotBands = function (chart) {
        var xAxis = chart.xAxis[0]
        var ticks = xAxis.tickPositions

        for (var i = 0; i < ticks.length - 1; i++) {
            var options = {
                from: ticks[i],
                to: ticks[i + 1],
                color: i % 2 === 0 ? '#f2f2f2' : '#E5E5E5',
                zIndex: 0
            }
            xAxis.addPlotBand(options)
        }
    }


    // -------------------------------------    
    // generate chart options 
    // -------------------------------------

    weatherGraph.chartOptions = function (data) {
        return {

            useUTC: false,

            time: {
                timezone: 'Europe/Helsinki'
            },

            chart: {
                renderTo: container,
                marginBottom: 70,
                marginRight: 40,
                marginTop: 50,
                plotBorderWidth: 1,
                width: 800,
                height: 310,
                alignTicks: false
            },

            chart: {
                zoomType: 'x'
            },

            credits: {
                enabled: false
            },

            title: {
                text: 'Example of usage of FMI API data in Highcharts'
            },

            subtitle: {
                text: `Local Weather in ${locationname}`
            },

            // 2 parallel xaxes
            xAxis: [
                {
                    id: 'weather symbol / wind parameter',
                    type: 'datetime',
                    offset: 7,
                    tickWidth: 0,
                    lineWidth: 0,
                    categories: data[0],
                    labels: {
                        x: 5,
                        useHTML: true,
                        autoRotationLimit: 0,
                        formatter: function () {
                            var symbol = weatherGraph.weatherSymbol(data, this.value)
                            var wind = weatherGraph.windDirection(data, this.value)
                            var str = '<img style="width:35px; height:35px;" src="symbols/' + symbol + '">'
                            str = str + '</br>'
                            str = str + '<div>'
                            str = str + '<img style="width:35px; height:35px; transform: rotate(' + wind['winddirection'] + 'deg);" src="symbols/wind.svg">'
                            str = str + '<text class="fmi-weather-graph-text">' + wind['windspeed'] + '</text>'
                            str = str + '</div>'

                            return str
                        },
                        style: {
                            zIndex: 100,
                        }
                    },
                    tickInterval: 1

                },
                {
                    id: 'date stamp',
                    type: 'datetime',
                    linkedTo: 0,
                    offset: 110,
                    categories: data[0],
                    labels: {
                        formatter: function () {
                            var date = new Date(this.value),
                                hours = weatherGraph.formatTimeLabel(date.getHours()),
                                minutes = weatherGraph.formatTimeLabel(date.getMinutes()),
                                day = weatherGraph.resolveWeekDay(date.getDay())

                            if (hours != '00') {
                                return hours + ":" + minutes
                            } else {
                                // if 12 AM return day name as well
                                return day + ", " + hours + ":" + minutes
                            }
                        }
                    },
                    showLastLabel: true,
                    tickInterval: 2
                }],

            yAxis: [
                {
                    // temperature
                    title: {
                        text: '°C',
                        align: 'high',
                        rotation: 0,
                        style: {
                            fontSize: '14px',
                        }
                    },
                    tickInterval: 2,
                    labels: {
                        style: {
                            fontFamily: 'Roboto-Regular',
                            fontWeight: 'bold',
                            fontSize: '13px',
                        }
                    }
                },
                {   // precipitation amount
                    title: {
                        text: 'mm',
                        align: 'high',
                        rotation: 0,
                        color: '#0033cc'
                    },
                    tickInterval: 2,
                    style: {
                        fontFamily: 'Roboto-Regular',
                        fontWeight: 'bold',
                        fontSize: '13px',
                        color: '#0033cc'
                    },
                    opposite: true
                },
                {   // smartsymbol
                    title: {
                        text: 'Current Weather'
                    },
                    tickInterval: 2,
                    style: {
                        color: '#1e6ed6', fontWeight: 'bold', fontSize: 11
                    },
                    opposite: true,
                    visible: false
                },
                {   // wind direction
                    title: {
                        text: 'Wind direction'
                    },
                    tickInterval: 2,
                    style: {
                        color: '#1e6ed6',
                        fontWeight: 'bold',
                        fontSize: 11
                    },
                    opposite: false,
                    visible: false
                },
                {   // wind speed
                    title: {
                        text: 'Wind speed'
                    },
                    tickInterval: 2,
                    style: {
                        color: '#1e6ed6',
                        fontWeight: 'bold',
                        fontSize: 11
                    },
                    opposite: false,
                    visible: false
                }],

            legend: {
                enabled: false
            },

            tooltip: {
                shared: true,
                xDateFormat: '%A, %B %e, %H:%M',
                useHTML: true,
                borderWidth: 0,
                backgroundColor: "rgba(255,255,255,0)",
                shadow: false,
                formatter: weatherGraph.constructTooltip,
                style: {
                    lineHeight: 1,
                    zIndex: 1000
                }
            },

            series: [
                {
                    type: 'line',
                    name: 'Temperature',
                    data: data[1],
                    tooltip: {
                        valueSuffix: ' °C'
                    },
                    zIndex: 10,
                    color: '#ff9999',
                    negativeColor: '#0088FF'
                },
                {
                    name: 'Rainfall',
                    type: 'column',
                    yAxis: 1,
                    data: data[4],
                    color: '#0033cc',
                    tooltip: {
                        valueSuffix: ' mm'
                    },
                    zIndex: 1
                },
                {
                    name: 'Current weather',
                    yAxis: 2,
                    data: data[2],
                    enabledMouseTracking: false,
                    color: 'none'
                },
                {
                    name: 'Wind direction',
                    yAxis: 3,
                    data: data[6],
                    enabledMouseTracking: false,
                    color: 'none'
                },
                {
                    name: 'Wind speed',
                    yAxis: 4,
                    data: data[7],
                    enabledMouseTracking: false,
                    color: 'none'
                }]
        }
    }


    // -------------------------------------
    // constuct graph and populate it with data
    // -------------------------------------

    weatherGraph.constructGraph = function (data) {
        this.chart = new Highcharts.Chart(container, weatherGraph.chartOptions(data), function (chart) { })
        weatherGraph.addDailyPlotBands(this.chart)

    }

}(fmi.weather.weatherGraph = fmi.weather.weatherGraph || {}))