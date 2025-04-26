import axios from 'axios';

export async function buscarCoordenadas(cep) {
  const enderecoResponse = await axios.get(`https://brasilapi.com.br/api/cep/v1/${cep}`);

  const { city, state, street } = enderecoResponse.data;

  const query = `${street ? street + ', ' : ''}${city}, ${state}, Brasil`;

  const response = await axios.get(`https://nominatim.openstreetmap.org/search`, {
    params: {
      q: query,
      format: 'json',
      addressdetails: 1,
    },
    headers: {
      'User-Agent': 'SeuProjetoFaculdade/1.0',
    },
  });

  if (response.data.length === 0) {
    throw new Error('Endereço não encontrado no Nominatim');
  }

  const { lat, lon } = response.data[0];
  return { lat: parseFloat(lat), lon: parseFloat(lon) };
}