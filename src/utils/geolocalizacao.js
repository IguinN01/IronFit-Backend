import axios from 'axios';

export async function buscarCoordenadas(cep) {
  const response = await axios.get(`https://nominatim.openstreetmap.org/search`, {
    params: {
      q: cep,
      countrycodes: 'br',
      format: 'json',
      addressdetails: 1,
    },
    headers: {
      'User-Agent': 'IronFitAcademia/1.0',  
    },
  });

  if (response.data.length === 0) {
    throw new Error('CEP não encontrado');
  }

  const { lat, lon } = response.data[0];
  return { lat: parseFloat(lat), lon: parseFloat(lon) };
}