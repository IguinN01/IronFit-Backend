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
      const email = decoded.payload.email;

      const { rows } = await request.server.pg.query(
        'SELECT id FROM usuarios WHERE email = $1',
        [email]
      );

      if (rows.length === 0) {
        return reply.status(401).send({ mensagem: 'Usuário Google não encontrado no banco de dados.' });
      }

      request.user = {
        id: rows[0].id,
        email
      };
      return;
    }

    const usuario = jwt.verify(token, process.env.JWT_SECRET);
    request.user = usuario;

  } catch (erro) {
    console.error('Erro ao verificar token:', erro);
    reply.status(401).send({ mensagem: 'Token inválido ou expirado' });
  }
}