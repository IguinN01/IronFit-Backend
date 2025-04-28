async function pedidosRoutes(fastify, options) {

  fastify.post('/pedidos', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { produtos, valor_total } = request.body;
    const userId = request.user.id;

    if (!produtos || !valor_total) {
      return reply.status(400).send({ error: 'Produtos e valor total são obrigatórios.' });
    }

    const { rows } = await fastify.pg.query(
      'INSERT INTO pedidos (usuarios_id, produtos, valor_total) VALUES ($1, $2, $3) RETURNING *',
      [userId, produtos, valor_total]
    );

    return reply.status(201).send(rows[0]);
  });

  fastify.get('/pedidos/recentes', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const userId = request.user.id;

    const { rows } = await fastify.pg.query(
      `SELECT id, produtos, valor_total, data_pedido
        FROM pedidos
        WHERE usuarios_id = $1
        ORDER BY data_pedido DESC
        LIMIT 3`,
      [userId]
    );

    return reply.send(rows);
  });
}

export default pedidosRoutes;