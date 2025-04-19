export default async function (fastify, opts) {
  fastify.decorate("authenticate", async function (request, reply) {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.code(401).send({ erro: 'Token inválido ou ausente' });
    }
  });
}