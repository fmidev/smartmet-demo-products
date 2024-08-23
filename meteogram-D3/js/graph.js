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
    // Construct Weather Graph and Its Container
    // -------------------------------------

    weatherGraph.construct = function () {
        var locations = Object.keys(graphconf.locations)
        var coordinates = Object.values(graphconf.locations)

        locationname = locations[0]
        latlon = coordinates[0]

        if (locations.length > 1) {
            var input = `<div id="select-wrapper" style="width:100%;display:table;">
                            <div id="select-locations" style="text-align:center;display:table-cell;vertical-align:middle;">
                                <select class="forecast-target">`
            for (var i = 0; i < locations.length; i++) {
                input += `<option value="${coordinates[i]}">${locations[i]}</option>`
            }
            input += `</select>
                    </div>
                </div>`

            $('#fmi-weather-graph-container').append(input)
        }

        $('#fmi-weather-graph-container').append('<div id="fmi-weather-graph" class="fmi-body"></div>')

        $('.forecast-target').change(function () {
            latlon = $(this).val()
            locationname = $(this).find("option:selected").text()
            weatherGraph.getData()
        })
        weatherGraph.getData()
    }

    // -------------------------------------
    // Get Data from Timeseries
    // -------------------------------------

    var formattedData
    weatherGraph.getData = function () {
        var url = `${graphconf.serviceURL}`
        url += `&param=epochtime,smartsymbol,smartsymboltext,precipitation1h,temperature,totalcloudcover,dark,windspeedms,winddirection,time,place`
        url += `&latlon=${latlon}`
        url += `&producer=${graphconf.producer}`
        url += `&format=json`
        url += `&timestep=${graphconf.timestep}`
        url += `&timesteps=${graphconf.timesteps}`
        url += `&lang=${graphconf.lang}`

        $.ajax({
            crossOrigin: true,
            url: url,
            error: function (error) {
                weatherGraph.debug('An error has occurred while loading the data')
            },
            success: function (data) {
                formattedData = weatherGraph.formatData(data)
                weatherGraph.constructGraph(formattedData)
            }
        })
    }

    // -------------------------------------
    // Format JSON Data for D3.js
    // -------------------------------------

    weatherGraph.formatData = function (data) {
        return data.map(obj => ({
            epochtime: new Date(obj.epochtime * 1000),
            temperature: obj.temperature,
            smartsymbol: obj.smartsymbol,
            totalcloudcover: obj.totalcloudcover,
            precipitation1h: obj.precipitation1h,
            dark: obj.dark,
            windspeedms: obj.windspeedms,
            winddirection: obj.winddirection,
            smartsymboltext: obj.smartsymboltext
        }))
    }

    // -------------------------------------
    // Construct D3.js Weather Graph
    // -------------------------------------


    weatherGraph.weatherSymbol = function (data, timestamp) {

        // Find the object in the array with the matching timestamp
        var entry = data.find(d => d.epochtime === timestamp);

        // If found, return the corresponding weather symbol file name
        if (entry) {
            return "symbols/" + entry.smartsymbol + ".svg"; // Assuming weatherSymbol holds the base name of the icon
        }
        // Return an empty string if the timestamp is not found
        return "";
    }
    weatherGraph.windDirection = function (data, timestamp) {
        // Find the object in the array with the matching timestamp
        const entry = data.find(d => d.epochtime === timestamp);

        if (entry) {
            const direction = entry.winddirection;  // Assuming the correct key for wind direction
            const windspeed = entry.windspeedms;      // Assuming the correct key for windspeed


            if (direction !== undefined && windspeed !== undefined) {
                return { "windspeed": windspeed, "winddirection": direction };
            }
        }

        // Return default values if data is missing or undefined
        return { "windspeed": "unknown", "winddirection": 0 };
    }





    weatherGraph.constructGraph = function (data) {
        // Clear any existing SVG
        d3.select(`#${container}`).select("svg").remove();

        var margin = { top: 50, right: 40, bottom: 100, left: 40 }; // Increased bottom margin for icons
        var width = 1200 - margin.left - margin.right;
        var height = 600 - margin.top - margin.bottom;

        var svg = d3.select(`#${container}`)
            .append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        // Scales
        var x = d3.scaleTime()
            .domain(d3.extent(data, d => d.epochtime))
            .range([0, width]);

        var yTemp = d3.scaleLinear()
            .domain([d3.min(data, d => d.temperature) - 5, d3.max(data, d => d.temperature) + 5])
            .range([height, 0]);

        var yPrec = d3.scaleLinear()
            .domain([0, (d3.max(data, d => d.precipitation1h + 5)) * 4])
            .range([height, 0]);

        // X Axis
        svg.append("g")
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(x));

        // Add Weather Symbols below the x-axis, outside the graph area
        var iconSize = 40; // Size of the icon
        var iconYOffset = 30; // Distance below x-axis

        svg.selectAll(".icon")
            .data(data)
            .enter()
            .append("image")
            .attr("xlink:href", d => weatherGraph.weatherSymbol(data, d.epochtime)) // Get the correct icon for each timestamp
            .attr("width", iconSize)
            .attr("height", iconSize)
            .attr("x", d => x(d.epochtime) - iconSize / 2) // Center the icon
            .attr("y", height + iconYOffset) // Position below the x-axis
            .attr("class", "icon");

        svg.selectAll(".wind-arrow-group")
            .data(data)
            .enter()
            .append("g")
            .attr("class", "wind-arrow-group")
            .attr("transform", d => `translate(${x(d.epochtime)}, ${height + iconYOffset + iconSize + 10})`) // Position below weather icon
            .each(function (d) {
                const wind = weatherGraph.windDirection(data, d.epochtime); // Get wind direction and speed

                // Append the wind arrow image, rotate based on wind direction
                d3.select(this)
                    .append("image")
                    .attr("xlink:href", "symbols/wind.svg")
                    .attr("width", iconSize)
                    .attr("height", iconSize)
                    .attr("x", -iconSize / 2) // Center horizontally
                    .attr("y", -iconSize / 2) // Center vertically
                    .attr("transform", `rotate(${wind.winddirection})`); // Rotate the icon

                // Append the wind speed text inside the circle
                d3.select(this)
                    .append("text")
                    .attr("class", "fmi-weather-graph-text")
                    .attr("text-anchor", "middle")
                    .attr("x", 0)
                    .attr("y", 5) // Adjust y to vertically center the text inside the circle
                    .text(wind.windspeed);
            });


        // Y Axis for Temperature
        svg.append("g")
            .attr("class", "axisRed")
            .call(d3.axisLeft(yTemp));

        // Y Axis for Precipitation
        svg.append("g")
            .attr("class", "axisBlue")
            .attr("transform", `translate(${width},0)`)
            .call(d3.axisRight(yPrec));

        // Temperature Line
        svg.append("path")
            .datum(data)
            .attr("fill", "none")
            .attr("stroke", "red")
            .attr("stroke-width", 1.5)
            .attr("d", d3.line()
                .x(d => x(d.epochtime))
                .y(d => yTemp(d.temperature))
            );

        // Precipitation Bars
        svg.selectAll("bar")
            .data(data)
            .enter()
            .append("rect")
            .attr("x", d => x(d.epochtime) - 5)
            .attr("y", d => yPrec(d.precipitation1h))
            .attr("width", 10)
            .attr("height", d => height - yPrec(d.precipitation1h))
            .attr("fill", "blue");

        // Tooltip
        var tooltip = d3.select("body").append("div")
            .attr("class", "tooltip")
            .style("opacity", 0);

            svg.selectAll(".dot")
            .data(data)
            .enter().append("circle")
            .attr("class", "dot")
            .attr("cx", d => x(d.epochtime))
            .attr("cy", d => yTemp(d.temperature))
            .attr("r", 5)
            .on("mouseover", function (event, d) {
                tooltip.transition()
                    .duration(200)
                    .style("opacity", .9);
                tooltip.html(weatherGraph.constructTooltip(d))
                    .style("left", (event.pageX + 40) + "px") // Offset slightly to avoid direct overlap
                    .style("top", (event.pageY - 99) + "px"); // Position tooltip above the cursor
            })
            .on("mouseout", function () {
                tooltip.transition()
                    .duration(500)
                    .style("opacity", 0);
            });
        
    }


    // -------------------------------------
    // Construct Tooltip in HTML Format
    // -------------------------------------

    weatherGraph.constructTooltip = function (d) {
        var temperature = `Temperature: <b>${d.temperature} °C</b><br/>`
        var precipitation = `Precipitation: <b>${d.precipitation1h} mm</b><br/>`
        var wind = `Wind: <b>${d.windspeedms} m/s ${weatherGraph.resolveWindDirectionText(d.winddirection)}</b><br/>`
        var weather = `Weather: ${d.smartsymboltext}`
        var timeMessage = `${weatherGraph.formatTime(d.epochtime)}<br/>`

        return `<div style="height:70px">${timeMessage}${temperature}${precipitation}${wind}${weather}</div>`
    }

    weatherGraph.formatTime = function (date) {
        var options = { weekday: 'long', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }
        return date.toLocaleString('en-US', options)
    }

    weatherGraph.resolveWindDirectionText = function (value) {
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
        const sector = sectors.find(sector => value >= sector.min && value < sector.max);
        return sector ? sector.label : "unknown";
    };


}(fmi.weather.weatherGraph = fmi.weather.weatherGraph || {}));