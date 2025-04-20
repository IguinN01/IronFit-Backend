import mercadopago from '../config/mercadopago.js';

export default async function pagamentoCreditoRoutes(fastify, opts) {

  console.log('authenticate disponível?', typeof fastify.authenticate);

  fastify.post('/pagamento-credito', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const {
        token,
        paymentMethodId,
        issuerId,
        installments,
        identificationNumber,
        identificationType,
        email,
        amount
      } = request.body;

      if (!token || !paymentMethodId || !email || !amount) {
        return reply.status(400).send({ erro: 'Dados incompletos para processar o pagamento.' });
      }

      const pagamento = await mercadopago.payment.create({
        transaction_amount: Number(amount),
        token,
        description: 'Compra na minha loja',
        installments,
        payment_method_id: paymentMethodId,
        issuer_id: issuerId,
        payer: {
          email,
          identification: {
            type: identificationType,
            number: identificationNumber
          }
        }
      });

      return reply.send({
        status: pagamento.body.status,
        status_detail: pagamento.body.status_detail,
        id: pagamento.body.id
      });

    } catch (erro) {
      console.error('Erro ao processar pagamento:', erro);
      return reply.status(500).send({
        erro: 'Ocorreu um erro ao processar o pagamento. Tente novamente.',
        detalhe: erro?.message || erro
      });
    }
  });
}