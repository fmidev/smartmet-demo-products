


var fmi = fmi || {};                                                                                                                  
fmi.weather = fmi.weather || {}; 


 (function(weatherGraph, undefined) {

    // No nonsense JavaScript accepted in this neighborhood                                                                             
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Strict_mode                                                    
    "use strict"; 
    var debug      = true
    var container  = 'fmi-weather-graph'
    var locationname  = ''
    var latlon     = ''

    weatherGraph.debug = function(str) {
        if(debug == true) {
            console.log(str)
        }
    }

    // -------------------------------------
    // constuct weather Graph and its container
    // -------------------------------------

    weatherGraph.construct = function() {

        var locations = Object.keys(graphconf.locations)
        var coordinates = Object.values(graphconf.locations)

        locationname = locations[0]
        latlon = coordinates[0]

        if(locations.length > 1) {
            var input = '<div id="select-wrapper" style="width:100%;display:table;">'
            var input = input + '<div id="select-locations" style="text-align:center;display:table-cell;vertical-align:middle;">'
            var input = input + '<select class="forecast-target">'
            for( var i=0; i<locations.length; i++ ) {
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

        $( '.forecast-target' ).change(function() {
            latlon = $(this).val()
            locationname = $(this).find("option:selected").text()
            weatherGraph.getData()
        });

        weatherGraph.getData()
    }

    // -------------------------------------
    // get data from timeseries
    // -------------------------------------

    weatherGraph.getData = function() {

        var url = `${graphconf.serviceURL}`
        url = url + `&param=epochtime,weathersymbol3,precipitation1h,temperature,totalcloudcover,dark,windspeedms,winddirection,time,place`
        url = url + `&latlon=${latlon}`
        url = url + `&producer=${graphconf.producer}`
        url = url + `&format=json`
        url = url + `&timestep=${graphconf.timestep}`
        url = url + `&timesteps=${graphconf.timesteps}`

        $.ajax({
            crossOrigin: true,
            url: url,
            error: function(error) {
                weatherGraph.debug('An error has occurred while loading the data');
            },
            success: function(data) {
                // pass data to functions
                // add callbacks
                var formattedData = weatherGraph.formatData(data)
                weatherGraph.constructGraph(formattedData,container)
            }
        });
    }


    // -------------------------------------
    // format json data for highcharts
    // -------------------------------------

    weatherGraph.formatData = function(data) {

        // this could (and probably should)
        // be done on the server side
        
        var formattedData = [];

        var temp = [],
            time = [],
            symb = [],
            clcv = [],
            dark = [],
            prec = [],
            wind = [],
            wdir = [];


        for (var i = 0; i < data.length; i++){
            var obj = data[i];

            time.push(new Date(obj["epochtime"]*1000));

            temp.push(obj["temperature"]);
            symb.push(obj["weathersymbol3"]);
            clcv.push(obj["totalcloudcover"]);
            prec.push(obj["precipitation1h"]);
            dark.push(obj["dark"]);
            wind.push(obj["windspeedms"]);
            wdir.push(obj["winddirection"]);
            
        }
        formattedData.push(time);
        formattedData.push(temp);
        formattedData.push(symb);
        formattedData.push(clcv);
        formattedData.push(prec);
        formattedData.push(dark);
        formattedData.push(wind);
        formattedData.push(wdir);
        return formattedData;
    }


    // -------------------------------------
    // format time stamps and labels
    // -------------------------------------

    weatherGraph.formatTime = function(epoch) {

        var date = new Date(epoch);
        var day = date.getDate();
        var hours = date.getHours();
        var minutes = date.getMinutes();

        // add leading zeros
        if(hours<10) {hours = "0"+hours}
        if(minutes<10) {minutes = "0"+minutes}

        var weekday = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        var n = weekday[date.getUTCDay()];

        var month = ["January", "February", "March", "April", "May", "June","July", "August", "September", "October", "November", "December"] ;
        month = month[date.getUTCMonth()];

        var time = n + ", " + month + " " + day + ", " + hours + ":" + minutes;

        return time;
    }

    weatherGraph.formatTimeLabel = function(value) {

        // add leading zero if needed
        if(value < 10) {
            value = "0"+value;   
        }
        return value;
    }

    weatherGraph.resolveWeekDay = function(value) {

        var weekday = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        var n = weekday[value];
        return n;
    }



    // -------------------------------------
    // construct weather symbol
    //
    // add daylight information and map
    // value to correct symbol 
    // ------------------------------------

    weatherGraph.weatherSymbol = function(data,timestamp) {

        var symbol = "",
              dark = "";

        // get the corresponging symbol from data array
        for (var n = 0; n < data[0].length; n++) {
            if(data[0][n] == timestamp) {
                symbol = data[2][n];
                dark   = data[5][n];
            }
        }
        if(dark == "1"){
            return "yo"+symbol+".svg";
        } else {
            return symbol+".svg";
        }
    }

    weatherGraph.resolveWeatherSymbol3Text = function(value) {
        if (value=="1") {
            return "clear weather";
        }
        if (value=="2") {
            return "partly cloudy";
        }
        if (value=="3") {
            return "cloudy";
        }
        if (value=="21") {
            return "light showers";     
        }
        if (value=="22") {
            return "showers";
        }
        if (value=="23") {
            return "heavy showers";
        }
        if (value=="31") {
            return "light rain";
        }
        if (value=="32") {
            return "rain";
        }
        if (value=="33") {
            return "heavy rain";
        }
        if (value=="41") {
            return "light snow showers";
        }
        if (value=="42") {
            return "snow showers";
        }
        if (value=="43") {
            return "heavy snow showers";
        }
        if (value=="51") {
            return "light snowfall";
        }
        if (value=="52") {
            return "snowfall";           
        }
        if (value=="53") {
            return "heavy snowfall";
        }
        if (value=="61") {
            return "thundershowers";
        }
        if (value=="62") {
            return "heavy thundershowers";
        }
        if (value=="63") {
            return "thunder";
        }
        if (value=="64") {
            return "heavy thunder";
        }
        if (value=="71") {
            return "light sleet showers";
        }
        if (value=="72") {
            return "sleet showers";
        }
        if (value=="73") {
            return "heavy sleet showers";
        }
        if (value=="81") {
            return "light sleet";
        }
        if (value=="82") {
            return "sleet";
        }
        if (value=="83") {
            return "heavy sleet";
        }
        if (value=="91") {
            return "moderate fog";
        }
        if (value=="92") {
            return "heavy fog";
        }     

    }

    weatherGraph.resolveWindDirectionText = function(value) {
        if (parseInt(value) <= 0 || parseInt(value) < 23 ) {
            return "north wind";
        } 
        if (parseInt(value) <= 23 || parseInt(value) <  68) {
            return "north-east wind";
        }
        if (parseInt(value) <= 68 || parseInt(value) <  113) {
            return "east wind";
        } 
        if (parseInt(value) <= 113 || parseInt(value) <  158) {
            return "sout-east wind";
        }
        if (parseInt(value) <= 158 || parseInt(value) <  203) {
            return "south wind";
        }
        if (parseInt(value) <= 203 || parseInt(value) <  248) {
            return "south-west wind";
        } 
        if (parseInt(value) <= 248 || parseInt(value) <  293) {
            return "west wind";
        }
        if (parseInt(value) <= 293 || parseInt(value) <  338) {
            return "north-west wind";
        }
        if (parseInt(value) <= 338 || parseInt(value) <  0) {
            return "north wind";
        }      
    }


    weatherGraph.windDirection = function(data,timestamp) {
        var direction = "",
            windspeed = ""

        // get the corresponging direction from data array
        for (var n = 0; n < data[0].length; n++) {
            if(data[0][n] == timestamp) {
                direction = data[7][n];
                windspeed = data[6][n];
            }
        }
        return {"windspeed":windspeed, "winddirection":direction};
    }


    // -------------------------------------
    // constuct tooltip in html format
    // -------------------------------------

    weatherGraph.constructTooltip = function() {

        var epoch = this.x;
        var temperature = "Temperature: <b>"+this.points[0]['y']+" °C</b></br>";
        var precipitation = "Precipitation: <b>"+this.points[1]['y']+" mm</b></br>";
        var wind = "Wind: <b>"+this.points[3]['y']+" m/s " + weatherGraph.resolveWindDirectionText(this.points[4]['y']) + " ("+ this.points[4]['y'] + "Â°)</b></br>";
	var wind = "Wind: <b>"+this.points[3]['y']+" m/s " + weatherGraph.resolveWindDirectionText(this.points[4]['y']) + "</b></br>";
        var weather = "Weather: "+weatherGraph.resolveWeatherSymbol3Text(this.points[2]['y']);
        var timeMessage =  weatherGraph.formatTime(epoch)+"<br/>";

        return '<div style="height:70px">' + timeMessage + temperature + precipitation + wind + weather + '</div>';
        
    }

    weatherGraph.addDailyPlotBands = function(chart) {                                                                                                                                                  
        var add = true;
        var xAxis = chart.xAxis[0];
        var ticks = xAxis.tickPositions;

        for (var n = 0; n < ticks.length; n++) {
            if (add) {
                if (n == (ticks.length - 1)) {
                    var options = {
                        from: ticks[ticks.length - 1],
                        to: ticks[ticks.length - 1] + 86400000,
                        color: '#f2f2f2',
                        zIndex: 0
                    };
                } else {
                    var options = {
                        from: ticks[n],
                        to: ticks[n + 1],
                        color: '#f2f1f1',
                        zIndex: 0
                    };                                                                                                                                                                                    
                }
                xAxis.addPlotBand(options);
            }

        add = !add;
        }
    }


    // -------------------------------------    
    // generate chart options 
    // -------------------------------------

    weatherGraph.chartOptions = function(data) {
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
                text: null
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
                        var symbol = weatherGraph.weatherSymbol(data,this.value);
                        var wind = weatherGraph.windDirection(data,this.value);
                        var str   = '<img style="width:35px; height:35px;" src="symbols/'+symbol+'">';
                        str = str + '</br>';
                        str = str + '<div>'; 
                        str = str + '<img style="width:35px; height:35px; transform: rotate('+wind['winddirection']+'deg);" src="symbols/wind.svg">';
                        str = str + '<text class="fmi-weather-graph-text">'+wind['windspeed']+'</text>';
                        str = str + '</div>'; 

                        return str;
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
                        var date    = new Date(this.value),
                            hours   = weatherGraph.formatTimeLabel(date.getHours()),
                            minutes = weatherGraph.formatTimeLabel(date.getMinutes()),
                            day     = weatherGraph.resolveWeekDay(date.getDay());

			            if( hours != '00') {
                        //if( hours == 2 || hours == 4 || hours == 9 || hours == 12 ||  hours == 15 || hours == 18 || hours == 21) {
                            return hours + ":" + minutes;
                        } else {
                            // if 12 AM return day name as well
                            return day + ", " + hours + ":" + minutes;
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
                    // color: Highcharts.getOptions().colors[0],
                    align: 'high',
                    rotation: 0,
                    style: {
                        fontSize: '14px',
                        // color: Highcharts.getOptions().colors[0],
                    } 
                },
                tickInterval: 2,
                labels: {
                    style: {
                        fontFamily: 'Roboto-Regular',
                        fontWeight: 'bold',
                        fontSize: '13px',
                        // color: Highcharts.getOptions().colors[0]
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
            {   // weathersymbol3
                title: {
                    text: 'Current Weather'
                },
                tickInterval: 2,
                style: {                                                                                                                                                                                  color: '#1e6ed6',                                                                                                                                                                     fontWeight: 'bold',                                                                                                                                                                   fontSize: 11                                                                                                                                                                                                                                                                                                     
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
                // crosshairs: true,
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

    weatherGraph.constructGraph = function(data) {

        this.chart = new Highcharts.Chart(container, weatherGraph.chartOptions(data), function(chart) {});
        weatherGraph.addDailyPlotBands(this.chart);

    }



}(fmi.weather.weatherGraph = fmi.weather.weatherGraph || {}));