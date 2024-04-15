# SmartMet Demo Products

This project is designed purely for demonstration purposes to visualize weather data from the SmartMet server. It serves as an educational tool to illustrate the integration of real-time weather data into web applications and is not intended for commercial use or as a reliable source for weather forecasting.

#### Libraries and Resources Used in This Project:

- **AJAX**: Utilized for asynchronous web requests to fetch weather data. AJAX is a technique for creating fast and dynamic web pages. This project specifically uses the jQuery library, which includes AJAX functionalities.
  - Get jQuery: [https://ajax.googleapis.com/ajax/libs/jquery/3.3.1/jquery.min.js](https://ajax.googleapis.com/ajax/libs/jquery/3.3.1/jquery.min.js)

- **Highcharts**: A JavaScript charting library that enables the creation of interactive graphical charts. This library is used for visualizing the weather data in various chart formats.
  - Get Highcharts: [https://www.highcharts.com/](https://www.highcharts.com/)

- **Moment.js**: A JavaScript library for parsing, validating, manipulating, and formatting dates and times. Moment.js is used in this project to handle and display date and time information accurately.
  - Get Moment.js: [https://momentjs.com/](https://momentjs.com/)

- **Leaflet**: An open-source JavaScript library for mobile-friendly interactive maps. Leaflet is used to display geographical data and for the implementation of map-related functionalities.
  - Get Leaflet: [https://leafletjs.com/](https://leafletjs.com/)

- **Leaflet Time Dimension**: A plugin for Leaflet that adds the ability to manage time-based layers on a map, allowing for the visualization of time-dependent data.
  - Get Leaflet Time Dimension: [https://github.com/socib/Leaflet.TimeDimension](https://github.com/socib/Leaflet.TimeDimension)

#### Map Tile Source:
- **OpenStreetMap Tiles**: The map tiles are sourced from OpenStreetMap, an open-source mapping project. The tile URL used in this project is:
  - [https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png](https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png)

#### Accessing Resources:
All libraries and resources used in this project can be found in the `index.html` files. <br>
These are the libraries chosen for this example, but alternative ones can also be used, for example:

- Highcharts: Chart.js, Google Charts, Plotly
- Moment.js: Day.js, date-fns
- Leaflet: OpenLayers, Mapbox GL JS, Google Maps JavaScript API

### Prerequisites

Smartmet server with datasets and a working WMS and Timeseries plugins

### Installing

```
cd /destination/folder
git clone https://github.com/fmidev/smartmet-demo-products.git .
```
**OR**

go to https://github.com/fmidev/smartmet-demo-products and download zip.

The application needs weather symbols to work, to integrate FMI's smartsymbols, follow these steps:

- Visit the [FMI GitHub repository](https://github.com/fmidev/opendata-resources) to access the weather symbols.

- Download the weather symbols provided in the repository and place into symbols folder.

### Contents

## License

This project is licensed under the MIT License
