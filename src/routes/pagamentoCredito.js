import mercadopago from '../config/mercadopago.js';
import { enviarEmail } from '../utils/email.js';

export default async function pagamentoCreditoRoutes(fastify, opts) {
  fastify.post('/pagamento-credito', { preHandler: fastify.authenticate }, async (request, reply) => {
    const userId = request.user.id;
    const { carrinho, frete } = request.body;

    if (!Array.isArray(carrinho) || typeof frete !== 'number') {
      return reply.status(400).send({ erro: 'Carrinho ou frete inválido.' });
    }

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

      const status = pagamento.body.status;
      const statusDetail = pagamento.body.status_detail;
      const pagamentoId = pagamento.body.id;

      if (status === 'approved') {
        const html = `
          <h2>Compra realizada com sucesso!</h2>
          <p>Olá,</p>
          <p>Recebemos seu pagamento de <strong>R$ ${Number(amount).toFixed(2)}</strong>.</p>
          <p>ID da transação: <strong>${pagamentoId}</strong></p>
          <p>Obrigado por comprar com a IronFit! 💪</p>
        `;

        await enviarEmail(email, 'IronFit - Compra confirmada!', html);

        const total = Number(amount);
        const dataPedido = new Date();

        await fastify.pg.query(
          `INSERT INTO pedidos (id_usuario, itens, frete, total, data_pedido)
            VALUES ($1, $2, $3, $4, $5)`,
          [userId, JSON.stringify(carrinho), frete, total, dataPedido]
        );
      }

      return reply.send({ status, statusDetail, id: pagamentoId });

    } catch (erro) {
      console.error('Erro ao processar pagamento:', erro);
      return reply.status(500).send({
        erro: 'Ocorreu um erro ao processar o pagamento. Tente novamente.',
        detalhe: erro?.message || erro
      });
    }
  });
}