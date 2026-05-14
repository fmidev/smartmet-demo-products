var fmi = fmi || {};
fmi.weather = fmi.weather || {};

(function (weatherGraph) {
    "use strict";

    var debug = true;
    var containerId = 'fmi-weather-graph';
    var rootId = 'fmi-weather-graph-container';
    var messageId = 'forecast-message';

    var locationname = '';
    var latlon = '';
    var formattedData;

    weatherGraph.debug = function (str) {
        if (debug) console.log(str);
    };

    // -------------------------------------
    // Construct graph container and picker
    // -------------------------------------

    weatherGraph.construct = function () {
        var locations = Object.keys(graphconf.locations);
        var coordinates = Object.values(graphconf.locations);

        locationname = locations[0];
        latlon = coordinates[0];

        var $root = $('#' + rootId);
        $root.empty();

        if (locations.length > 1) {
            var $picker = $('<div class="forecast-picker">')
                .append('<label for="forecast-target">Location:</label>');
            var $select = $('<select id="forecast-target" class="forecast-target">');
            for (var i = 0; i < locations.length; i++) {
                $select.append('<option value="' + coordinates[i] + '">' + locations[i] + '</option>');
            }
            $picker.append($select);
            $root.append($picker);
        }

        $root.append('<div id="' + containerId + '" class="forecast-chart"></div>');
        $root.append('<div id="' + messageId + '" class="forecast-message"></div>');

        $('.forecast-target').on('change', function () {
            latlon = $(this).val();
            locationname = $(this).find('option:selected').text();
            weatherGraph.getData();
        });

        weatherGraph.getData();
    };

    weatherGraph.showMessage = function (text, kind) {
        $('#' + messageId).text(text).attr('data-kind', kind || 'info');
    };

    weatherGraph.clearMessage = function () {
        $('#' + messageId).text('').removeAttr('data-kind');
    };

    // -------------------------------------
    // Fetch data
    // -------------------------------------

    weatherGraph.getData = function () {
        var query = $.param({
            param: 'epochtime,smartsymbol,smartsymboltext,precipitation1h,temperature,totalcloudcover,dark,windspeedms,winddirection,time,place',
            latlon: latlon,
            producer: graphconf.producer,
            format: 'json',
            timestep: graphconf.timestep,
            timesteps: graphconf.timesteps,
            lang: graphconf.lang
        });
        var base = graphconf.serviceURL.replace(/[?&]+$/, '');
        var url = base + (base.indexOf('?') === -1 ? '?' : '&') + query;

        weatherGraph.showMessage('Loading forecast…');

        $.ajax({ url: url, dataType: 'json', crossDomain: true })
            .done(function (data) {
                if (!Array.isArray(data) || data.length === 0) {
                    weatherGraph.showMessage('No forecast data available for this location.', 'error');
                    return;
                }
                weatherGraph.clearMessage();
                formattedData = weatherGraph.formatData(data);
                weatherGraph.constructGraph(formattedData);
            })
            .fail(function () {
                weatherGraph.showMessage('Failed to load forecast data.', 'error');
                weatherGraph.debug('An error has occurred while loading the data');
            });
    };

    // -------------------------------------
    // Reshape JSON for Highcharts
    // -------------------------------------

    weatherGraph.formatData = function (data) {
        return data.reduce(function (acc, obj) {
            acc[0].push(new Date(obj.epochtime * 1000).getTime());
            acc[1].push(obj.temperature);
            acc[2].push(obj.smartsymbol);
            acc[3].push(obj.totalcloudcover);
            acc[4].push(obj.precipitation1h);
            acc[5].push(obj.dark);
            acc[6].push(obj.windspeedms);
            acc[7].push(obj.winddirection);
            acc[8].push(obj.smartsymboltext);
            return acc;
        }, [[], [], [], [], [], [], [], [], []]);
    };

    // -------------------------------------
    // Formatting helpers
    // -------------------------------------

    var localeFromLang = function () {
        switch (graphconf.lang) {
            case 'fi': return 'fi-FI';
            case 'sv': return 'sv-SE';
            default:   return 'en-GB';
        }
    };

    weatherGraph.formatTime = function (epoch) {
        var opts = { weekday: 'long', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
        return new Date(epoch).toLocaleString(localeFromLang(), opts);
    };

    weatherGraph.padTwo = function (value) {
        return (value < 10 ? '0' : '') + value;
    };

    weatherGraph.resolveWeekDay = function (value) {
        return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][value];
    };

    weatherGraph.weatherSymbol = function (data, timestamp) {
        var index = data[0].indexOf(timestamp);
        return index !== -1 ? data[2][index] + '.svg' : '';
    };

    weatherGraph.windDirection = function (data, timestamp) {
        var index = data[0].indexOf(timestamp);
        if (index === -1) return { windspeed: '–', winddirection: 0 };
        return { windspeed: data[6][index], winddirection: data[7][index] };
    };

    weatherGraph.resolveWindDirectionText = function (value) {
        var sectors = [
            { min: 0,     max: 22.5,  label: 'N' },
            { min: 22.5,  max: 67.5,  label: 'NE' },
            { min: 67.5,  max: 112.5, label: 'E' },
            { min: 112.5, max: 157.5, label: 'SE' },
            { min: 157.5, max: 202.5, label: 'S' },
            { min: 202.5, max: 247.5, label: 'SW' },
            { min: 247.5, max: 292.5, label: 'W' },
            { min: 292.5, max: 337.5, label: 'NW' },
            { min: 337.5, max: 360.1, label: 'N' }
        ];
        var sector = sectors.find(function (s) { return value >= s.min && value < s.max; });
        return sector ? sector.label : '–';
    };

    // -------------------------------------
    // Tooltip
    // -------------------------------------

    weatherGraph.constructTooltip = function () {
        var epoch = this.x;
        var i = this.points && this.points[0] ? this.points[0].point.index : -1;
        var temp = (i !== -1 && formattedData[1][i] != null) ? formattedData[1][i] : '–';
        var prec = (i !== -1 && formattedData[4][i] != null) ? formattedData[4][i] : 0;
        var ws   = (i !== -1) ? formattedData[6][i] : '–';
        var wd   = (i !== -1) ? formattedData[7][i] : 0;
        var sym  = (i !== -1) ? formattedData[8][i] : '';

        var rows = [
            '<div style="font-weight:600;margin-bottom:4px">' + weatherGraph.formatTime(epoch) + '</div>',
            '<div>Temperature: <b>' + temp + ' °C</b></div>',
            '<div>Precipitation: <b>' + prec + ' mm</b></div>',
            '<div>Wind: <b>' + ws + ' m/s ' + weatherGraph.resolveWindDirectionText(wd) + '</b></div>'
        ];
        if (sym) rows.push('<div style="color:#6b7180;margin-top:4px">' + sym + '</div>');

        return '<div style="min-width:180px">' + rows.join('') + '</div>';
    };

    // -------------------------------------
    // Daily plot bands (alternating shading)
    // -------------------------------------

    weatherGraph.addDailyPlotBands = function (chart) {
        var xAxis = chart.xAxis[0];
        var ticks = xAxis.tickPositions || [];
        for (var i = 0; i < ticks.length - 1; i++) {
            xAxis.addPlotBand({
                from: ticks[i],
                to: ticks[i + 1],
                color: i % 2 === 0 ? '#f7f8fa' : '#eef0f4',
                zIndex: 0
            });
        }
    };

    // -------------------------------------
    // Chart options
    // -------------------------------------

    weatherGraph.chartOptions = function (data) {
        return {
            time: {
                useUTC: false,
                timezone: 'Europe/Helsinki'
            },

            chart: {
                renderTo: containerId,
                marginBottom: 95,
                marginRight: 50,
                marginTop: 60,
                marginLeft: 50,
                plotBorderWidth: 0,
                spacingLeft: 10,
                spacingRight: 10,
                height: 420,
                zoomType: 'x',
                alignTicks: false,
                backgroundColor: 'transparent',
                style: {
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
                }
            },

            credits: { enabled: false },

            title: {
                text: 'Weather forecast — ' + locationname,
                style: { fontSize: '18px', fontWeight: '600' }
            },

            subtitle: {
                text: 'Temperature, precipitation and wind',
                style: { color: '#6b7180', fontSize: '12px' }
            },

            xAxis: [
                {
                    id: 'weather-symbol-and-wind',
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
                            var symbol = weatherGraph.weatherSymbol(data, this.value);
                            var wind = weatherGraph.windDirection(data, this.value);
                            var html = '<img style="width:32px;height:32px" src="symbols/' + symbol + '" alt="">';
                            html += '<br>';
                            html += '<div class="wind-cell">';
                            html += '<img style="width:30px;height:30px;transform:rotate(' + wind.winddirection + 'deg)" src="symbols/wind.svg" alt="">';
                            html += '<span class="fmi-weather-graph-text">' + wind.windspeed + '</span>';
                            html += '</div>';
                            return html;
                        }
                    },
                    tickInterval: 1
                },
                {
                    id: 'date-stamp',
                    type: 'datetime',
                    linkedTo: 0,
                    offset: 115,
                    categories: data[0],
                    labels: {
                        style: { color: '#6b7180', fontSize: '11px' },
                        formatter: function () {
                            var date = new Date(this.value);
                            var hh = weatherGraph.padTwo(date.getHours());
                            var mm = weatherGraph.padTwo(date.getMinutes());
                            if (hh !== '00') return hh + ':' + mm;
                            return weatherGraph.resolveWeekDay(date.getDay()) + ' ' + hh + ':' + mm;
                        }
                    },
                    showLastLabel: true,
                    tickInterval: 2
                }
            ],

            yAxis: [
                {
                    title: {
                        text: '°C',
                        align: 'high',
                        rotation: 0,
                        offset: -10,
                        y: -15,
                        style: { fontSize: '12px', color: '#6b7180' }
                    },
                    gridLineColor: '#eef0f4',
                    tickInterval: 2,
                    labels: { style: { color: '#2a2d33', fontSize: '12px' } }
                },
                {
                    title: {
                        text: 'mm',
                        align: 'high',
                        rotation: 0,
                        offset: -10,
                        y: -15,
                        style: { fontSize: '12px', color: '#1f5fd1' }
                    },
                    min: 0,
                    tickInterval: 2,
                    labels: { style: { color: '#1f5fd1', fontSize: '12px' } },
                    opposite: true,
                    gridLineWidth: 0
                },
                { tickInterval: 2, visible: false },
                { tickInterval: 2, visible: false },
                { tickInterval: 2, visible: false }
            ],

            legend: { enabled: false },

            tooltip: {
                shared: true,
                useHTML: true,
                borderWidth: 0,
                backgroundColor: 'rgba(255,255,255,0)',
                shadow: false,
                formatter: weatherGraph.constructTooltip,
                style: { lineHeight: 1.4, zIndex: 1000 }
            },

            plotOptions: {
                series: { animation: { duration: 250 } },
                column: { borderWidth: 0, pointPadding: 0.05, groupPadding: 0.1 }
            },

            series: [
                {
                    name: 'Temperature',
                    type: 'line',
                    data: data[1],
                    tooltip: { valueSuffix: ' °C' },
                    zIndex: 10,
                    color: '#e85a5a',
                    negativeColor: '#2f80ed',
                    lineWidth: 2.5,
                    marker: { enabled: false, radius: 3, states: { hover: { enabled: true, radius: 4 } } }
                },
                {
                    name: 'Rainfall',
                    type: 'column',
                    yAxis: 1,
                    data: data[4],
                    color: '#1f5fd1',
                    tooltip: { valueSuffix: ' mm' },
                    zIndex: 1
                },
                { name: 'Symbol', yAxis: 2, data: data[2], enableMouseTracking: false, color: 'transparent', showInLegend: false },
                { name: 'Wind dir', yAxis: 3, data: data[6], enableMouseTracking: false, color: 'transparent', showInLegend: false },
                { name: 'Wind speed', yAxis: 4, data: data[7], enableMouseTracking: false, color: 'transparent', showInLegend: false }
            ]
        };
    };

    // -------------------------------------
    // Build/redraw chart
    // -------------------------------------

    weatherGraph.constructGraph = function (data) {
        this.chart = new Highcharts.Chart(weatherGraph.chartOptions(data));
        weatherGraph.addDailyPlotBands(this.chart);
    };

}(fmi.weather.weatherGraph = fmi.weather.weatherGraph || {}));
