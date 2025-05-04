export function gerarToken(fastify, user) {
  return fastify.jwt.sign(
    { id: user.id, email: user.email },
    { expiresIn: "1h" }
  );
}