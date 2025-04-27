import { buscarCoordenadas } from '../utils/geolocalizacao.js';
import { calcularDistanciaReal } from '../utils/distanciaReal.js';

async function freteRoutes(fastify, options) {
  fastify.post('/calcular-frete', async (request, reply) => {
    const { cepDestino } = request.body;
    const cepOrigem = '01156-050';

    if (!cepDestino) {
      return reply.status(400).send({ error: 'CEP de destino é obrigatório.' });
    }

    try {
      const origem = await buscarCoordenadas(cepOrigem);
      const destino = await buscarCoordenadas(cepDestino);

      const distancia = await calcularDistanciaReal(origem, destino);

      let frete = distancia * 0.6;
      if (frete < 7.50) frete = 7.50;

      return { frete: frete.toFixed(2), distancia: distancia.toFixed(2) + ' km' };
    } catch (error) {
      console.error(error);
      return reply.status(500).send({ error: error.message || 'Erro ao calcular o frete.' });
    }
  });
}

export default freteRoutes;