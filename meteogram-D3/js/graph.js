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
    var resizeBound = false;

    weatherGraph.debug = function (str) {
        if (debug) console.log(str);
    };

    // -------------------------------------
    // Construct
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

        $root.append('<div id="' + containerId + '"></div>');
        $root.append('<div id="' + messageId + '" class="forecast-message"></div>');

        $('.forecast-target').on('change', function () {
            latlon = $(this).val();
            locationname = $(this).find('option:selected').text();
            weatherGraph.getData();
        });

        if (!resizeBound) {
            var rerender = debounce(function () {
                if (weatherGraph._lastData) weatherGraph.constructGraph(weatherGraph._lastData);
            }, 150);
            window.addEventListener('resize', rerender);
            resizeBound = true;
        }

        weatherGraph.getData();
    };

    weatherGraph.showMessage = function (text, kind) {
        $('#' + messageId).text(text).attr('data-kind', kind || 'info');
    };

    weatherGraph.clearMessage = function () {
        $('#' + messageId).text('').removeAttr('data-kind');
    };

    // -------------------------------------
    // Fetch
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
                var formatted = weatherGraph.formatData(data);
                weatherGraph._lastData = formatted;
                weatherGraph.constructGraph(formatted);
            })
            .fail(function () {
                weatherGraph.showMessage('Failed to load forecast data.', 'error');
                weatherGraph.debug('An error has occurred while loading the data');
            });
    };

    // -------------------------------------
    // Reshape JSON
    // -------------------------------------

    weatherGraph.formatData = function (data) {
        return data.map(function (obj) {
            return {
                epochtime: new Date(obj.epochtime * 1000),
                temperature: obj.temperature,
                smartsymbol: obj.smartsymbol,
                totalcloudcover: obj.totalcloudcover,
                precipitation1h: obj.precipitation1h == null ? 0 : obj.precipitation1h,
                dark: obj.dark,
                windspeedms: obj.windspeedms,
                winddirection: obj.winddirection,
                smartsymboltext: obj.smartsymboltext
            };
        });
    };

    // -------------------------------------
    // Build graph
    // -------------------------------------

    weatherGraph.constructGraph = function (data) {
        var container = document.getElementById(containerId);
        if (!container) return;

        // Remove previous SVG + tooltip
        d3.select('#' + containerId).select('svg').remove();
        d3.select('body').selectAll('.tooltip.meteogram-tooltip').remove();

        var margin = { top: 70, right: 55, bottom: 130, left: 55 };
        var outerWidth = Math.max(container.clientWidth || 1100, 600);
        var outerHeight = 480;
        var width = outerWidth - margin.left - margin.right;
        var height = outerHeight - margin.top - margin.bottom;

        var svg = d3.select('#' + containerId)
            .append('svg')
            .attr('viewBox', '0 0 ' + outerWidth + ' ' + outerHeight)
            .attr('preserveAspectRatio', 'xMidYMid meet')
            .attr('width', outerWidth)
            .attr('height', outerHeight);

        var root = svg.append('g')
            .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

        // Title and subtitle
        svg.append('text')
            .attr('class', 'graph-title')
            .attr('x', outerWidth / 2)
            .attr('y', 26)
            .attr('text-anchor', 'middle')
            .text('Weather forecast — ' + locationname);

        svg.append('text')
            .attr('class', 'graph-subtitle')
            .attr('x', outerWidth / 2)
            .attr('y', 46)
            .attr('text-anchor', 'middle')
            .text('Temperature, precipitation and wind');

        // Scales
        var x = d3.scaleTime()
            .domain(d3.extent(data, function (d) { return d.epochtime; }))
            .range([0, width]);

        var tempVals = data.map(function (d) { return d.temperature; }).filter(function (v) { return v != null; });
        var tMin = d3.min(tempVals);
        var tMax = d3.max(tempVals);
        if (tMin === tMax) { tMin -= 1; tMax += 1; }
        var yTemp = d3.scaleLinear()
            .domain([Math.floor(tMin - 2), Math.ceil(tMax + 2)])
            .nice()
            .range([height, 0]);

        var maxPrec = d3.max(data, function (d) { return d.precipitation1h; }) || 0;
        var yPrec = d3.scaleLinear()
            .domain([0, Math.max(2, maxPrec * 1.5)])
            .nice()
            .range([height, 0]);

        // Alternating day bands
        var dayStarts = [];
        var first = d3.timeDay.floor(x.domain()[0]);
        var last = d3.timeDay.ceil(x.domain()[1]);
        for (var t = first; t <= last; t = d3.timeDay.offset(t, 1)) dayStarts.push(new Date(t));
        root.append('g').selectAll('.day-band')
            .data(d3.pairs(dayStarts))
            .enter()
            .append('rect')
            .attr('class', function (_, i) { return 'day-band' + (i % 2 ? ' alt' : ''); })
            .attr('x', function (d) { return Math.max(0, x(d[0])); })
            .attr('y', 0)
            .attr('width', function (d) {
                return Math.min(width, x(d[1])) - Math.max(0, x(d[0]));
            })
            .attr('height', height);

        // Grid
        root.append('g')
            .attr('class', 'grid')
            .attr('transform', 'translate(0,' + height + ')')
            .call(d3.axisBottom(x).ticks(8).tickSize(-height).tickFormat(''));

        root.append('g')
            .attr('class', 'grid')
            .call(d3.axisLeft(yTemp).ticks(6).tickSize(-width).tickFormat(''));

        // Precipitation bars (behind temperature line)
        var barWidth = Math.max(4, (width / data.length) * 0.5);
        root.append('g').selectAll('.prec-bar')
            .data(data)
            .enter()
            .append('rect')
            .attr('class', 'prec-bar')
            .attr('x', function (d) { return x(d.epochtime) - barWidth / 2; })
            .attr('y', function (d) { return yPrec(d.precipitation1h); })
            .attr('width', barWidth)
            .attr('height', function (d) { return height - yPrec(d.precipitation1h); });

        // Temperature line
        var line = d3.line()
            .defined(function (d) { return d.temperature != null; })
            .x(function (d) { return x(d.epochtime); })
            .y(function (d) { return yTemp(d.temperature); })
            .curve(d3.curveMonotoneX);

        root.append('path')
            .datum(data)
            .attr('class', 'temp-line')
            .attr('d', line);

        // X axis (time)
        var xAxis = d3.axisBottom(x)
            .ticks(8)
            .tickFormat(function (d) {
                if (d.getHours() === 0) {
                    return d3.timeFormat('%a')(d) + ' ' + d3.timeFormat('%H:%M')(d);
                }
                return d3.timeFormat('%H:%M')(d);
            });

        root.append('g')
            .attr('class', 'axis')
            .attr('transform', 'translate(0,' + height + ')')
            .call(xAxis);

        // Y axes
        root.append('g')
            .attr('class', 'axis axis-temp')
            .call(d3.axisLeft(yTemp).ticks(6));

        root.append('text')
            .attr('class', 'axis-temp')
            .attr('x', -10)
            .attr('y', -10)
            .attr('text-anchor', 'start')
            .style('font-size', '12px')
            .style('fill', 'var(--color-temp)')
            .text('°C');

        root.append('g')
            .attr('class', 'axis axis-prec')
            .attr('transform', 'translate(' + width + ',0)')
            .call(d3.axisRight(yPrec).ticks(6));

        root.append('text')
            .attr('class', 'axis-prec')
            .attr('x', width + 10)
            .attr('y', -10)
            .attr('text-anchor', 'end')
            .style('font-size', '12px')
            .style('fill', 'var(--color-rain)')
            .text('mm');

        // Legend
        var legend = svg.append('g')
            .attr('class', 'legend')
            .attr('transform', 'translate(' + (outerWidth - margin.right - 220) + ',' + (margin.top - 18) + ')');

        legend.append('line')
            .attr('x1', 0).attr('x2', 18)
            .attr('y1', 0).attr('y2', 0)
            .attr('stroke', '#e85a5a')
            .attr('stroke-width', 2.5);
        legend.append('text')
            .attr('x', 24).attr('y', 4)
            .text('Temperature');

        legend.append('rect')
            .attr('x', 120).attr('y', -6)
            .attr('width', 12).attr('height', 12)
            .attr('fill', '#1f5fd1');
        legend.append('text')
            .attr('x', 138).attr('y', 4)
            .text('Rainfall');

        // Weather icons + wind below the X axis
        var iconSize = Math.min(34, Math.max(20, width / data.length * 0.9));
        var iconRow1Y = height + 32;
        var iconRow2Y = iconRow1Y + iconSize + 18;

        // Pick every Nth point so icons don't overlap on narrow screens
        var stride = Math.max(1, Math.ceil((data.length * (iconSize + 4)) / width));
        var iconData = data.filter(function (_, i) { return i % stride === 0; });

        root.append('g').selectAll('.wx-icon')
            .data(iconData)
            .enter()
            .append('image')
            .attr('class', 'wx-icon')
            .attr('xlink:href', function (d) { return 'symbols/' + d.smartsymbol + '.svg'; })
            .attr('width', iconSize)
            .attr('height', iconSize)
            .attr('x', function (d) { return x(d.epochtime) - iconSize / 2; })
            .attr('y', iconRow1Y);

        var windGroups = root.append('g').selectAll('.wind-group')
            .data(iconData)
            .enter()
            .append('g')
            .attr('class', 'wind-group')
            .attr('transform', function (d) {
                return 'translate(' + x(d.epochtime) + ',' + (iconRow2Y + iconSize / 2) + ')';
            });

        windGroups.append('image')
            .attr('xlink:href', 'symbols/wind.svg')
            .attr('width', iconSize)
            .attr('height', iconSize)
            .attr('x', -iconSize / 2)
            .attr('y', -iconSize / 2)
            .attr('transform', function (d) { return 'rotate(' + (d.winddirection || 0) + ')'; });

        windGroups.append('text')
            .attr('class', 'fmi-weather-graph-text')
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'central')
            .attr('x', 0)
            .attr('y', 0)
            .text(function (d) {
                return d.windspeedms != null ? d.windspeedms : '';
            });

        // Tooltip + hover guide
        var tooltip = d3.select('body').append('div')
            .attr('class', 'tooltip meteogram-tooltip');

        var hoverLine = root.append('line')
            .attr('class', 'hover-line')
            .attr('y1', 0)
            .attr('y2', height);

        var bisect = d3.bisector(function (d) { return d.epochtime; }).left;

        var overlay = root.append('rect')
            .attr('width', width)
            .attr('height', height)
            .attr('fill', 'transparent')
            .style('cursor', 'crosshair');

        overlay
            .on('mousemove', function (event) {
                var mx = d3.pointer(event, this)[0];
                var t = x.invert(mx);
                var i = bisect(data, t);
                if (i >= data.length) i = data.length - 1;
                if (i > 0 && (t - data[i - 1].epochtime) < (data[i].epochtime - t)) i = i - 1;
                var d = data[i];
                hoverLine
                    .attr('x1', x(d.epochtime))
                    .attr('x2', x(d.epochtime))
                    .style('opacity', 1);
                tooltip
                    .html(weatherGraph.constructTooltip(d))
                    .style('opacity', 1)
                    .style('left', (event.pageX + 16) + 'px')
                    .style('top', (event.pageY - 20) + 'px');
            })
            .on('mouseleave', function () {
                hoverLine.style('opacity', 0);
                tooltip.style('opacity', 0);
            });
    };

    // -------------------------------------
    // Tooltip content
    // -------------------------------------

    weatherGraph.constructTooltip = function (d) {
        var rows = [
            '<div class="tt-time">' + weatherGraph.formatTime(d.epochtime) + '</div>',
            '<div>Temperature: <b>' + (d.temperature != null ? d.temperature + ' °C' : '–') + '</b></div>',
            '<div>Precipitation: <b>' + (d.precipitation1h != null ? d.precipitation1h + ' mm' : '0 mm') + '</b></div>',
            '<div>Wind: <b>' + (d.windspeedms != null ? d.windspeedms + ' m/s ' : '') + weatherGraph.resolveWindDirectionText(d.winddirection) + '</b></div>'
        ];
        if (d.smartsymboltext) rows.push('<div class="tt-symbol">' + d.smartsymboltext + '</div>');
        return rows.join('');
    };

    // -------------------------------------
    // Helpers
    // -------------------------------------

    var localeFromLang = function () {
        switch (graphconf.lang) {
            case 'fi': return 'fi-FI';
            case 'sv': return 'sv-SE';
            default:   return 'en-GB';
        }
    };

    weatherGraph.formatTime = function (date) {
        var opts = { weekday: 'long', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
        return date.toLocaleString(localeFromLang(), opts);
    };

    weatherGraph.resolveWindDirectionText = function (value) {
        if (value == null) return '';
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
        return sector ? sector.label : '';
    };

    function debounce(fn, wait) {
        var t;
        return function () {
            var args = arguments, ctx = this;
            clearTimeout(t);
            t = setTimeout(function () { fn.apply(ctx, args); }, wait);
        };
    }

}(fmi.weather.weatherGraph = fmi.weather.weatherGraph || {}));
