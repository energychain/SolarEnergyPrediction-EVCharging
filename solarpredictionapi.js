module.exports = function(CONFIG) {
  const axios = require("axios");

  this.retrieveForecast = async function() {
    const options = {
      method: 'GET',
      url: 'https://solarenergyprediction.p.rapidapi.com/v2.0/solar/prediction',
      params: {
        plant: CONFIG["PLANT"]
      },
      headers: {
        'X-RapidAPI-Key': CONFIG["X-RapidAPI-Key"],
        'X-RapidAPI-Host': 'solarenergyprediction.p.rapidapi.com'
      }
    };
    const response = await axios.request(options);
    return response.data;
  }
}
