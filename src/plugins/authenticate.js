export default async function authenticate(fastify, opts) {
  console.log("✅ authenticate plugin carregado");

  fastify.decorate("authenticate", async function (request, reply) {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.status(401).send({ error: 'Token inválido' });
    }
  });
}