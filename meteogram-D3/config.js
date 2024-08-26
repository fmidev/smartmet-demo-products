var graphconf = {
  serviceURL: 'http://smartmet.fmi.fi/timeseries?',
  producer: 'ecmwf_maailma_pinta',
  timestep: '120', // how much minutes between points
  timesteps: '30', // how many points to draw on the graph
  lang: 'en', // en, fi, sv
  locations: {
    'Helsinki': '60,25',
    'Tampere': '61.5,23.8',
    'Oulu': '65.0,25.5'
    // add more locations here
  }
}
