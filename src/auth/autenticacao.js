import jwt from 'jsonwebtoken';

export async function verificaJWT(request, reply) {
  try {
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.status(401).send({ mensagem: 'Token não fornecido' });
    }

    const token = authHeader.split(' ')[1];

    const decoded = jwt.decode(token, { complete: true });

    if (decoded?.payload?.iss?.includes('google.com')) {
      request.user = decoded.payload;
      return;
    }

    const usuario = jwt.verify(token, process.env.JWT_SECRET);
    request.user = usuario;

  } catch (erro) {
    console.error('Erro ao verificar token:', erro);
    reply.status(401).send({ mensagem: 'Token inválido ou expirado' });
  }
}