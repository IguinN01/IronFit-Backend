import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const ORS_API_KEY = process.env.ORS_API_KEY;

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