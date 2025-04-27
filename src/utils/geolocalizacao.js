import axios from 'axios';

const ORS_API_KEY = '5b3ce3597851110001cf62488b67b3152f6f42f3990cc82d1befe873';

export async function calcularDistanciaReal(origem, destino) {
  const response = await axios.post('https://api.openrouteservice.org/v2/directions/driving-car', {
    coordinates: [
      [origem.lon, origem.lat],
      [destino.lon, destino.lat]
    ]
  }, {
    headers: {
      Authorization: ORS_API_KEY,
      'Content-Type': 'application/json',
    }
  });

  const distanciaMetros = response.data.routes[0].summary.distance;
  const distanciaKm = distanciaMetros / 1000;

  return distanciaKm;
}