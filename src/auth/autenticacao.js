// auth/autenticacao.js
import jwt from 'jsonwebtoken';

export function verificaJWT(req, res, done) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    res.status(401).send({ mensagem: 'Token não fornecido' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = decoded;
    done();
  } catch (erro) {
    res.status(401).send({ mensagem: 'Token inválido' });
  }
}