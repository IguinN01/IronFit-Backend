import dotenv from 'dotenv';
dotenv.config();

import Fastify from 'fastify';
import formbody from '@fastify/formbody';
import cors from '@fastify/cors';
import fastifyExpress from '@fastify/express';
import fastifyJWT from '@fastify/jwt';

import admin from './firebase.js';

import bcrypt from 'bcrypt';

import { gerarToken } from './src/utils/jwt.js';
import { verificaJWT } from './src/auth/autenticacao.js';
import mercadopago from './src/config/mercadopago.js';
import pagamentoCreditoRoutes from './src/routes/pagamentoCredito.js';
import freteRoutes from './src/routes/frete.js';

import pg from 'pg';
const { Pool } = pg;

const fastify = Fastify();

const start = async () => {
  try {
    fastify.register(formbody);
    fastify.register(fastifyExpress);
    fastify.register(fastifyJWT, {
      secret: process.env.JWT_SECRET
    });

    fastify.decorate("authenticate", async function (request, reply) {
      try {
        await request.jwtVerify();
      } catch (err) {
        reply.status(401).send({ error: 'Token inválido' });
      }
    });

    fastify.register(pagamentoCreditoRoutes);
    fastify.register(freteRoutes);

    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    });

    fastify.decorate('pg', pool);

    mercadopago.configure({
      access_token: process.env.MERCADO_PAGO_ACCESS_TOKEN
    });

    setInterval(async () => {
      try {
        await pool.query('SELECT 1');
        console.log("🔄 Mantendo conexão ativa...");
      } catch (error) {
        console.error("🔴 Erro ao manter conexão ativa:", error);
      }
    }, 3 * 60 * 1000);

    fastify.register(cors, {
      origin: [
        "http://localhost:3000",
        "http://192.168.0.225:3000",
        "https://academia-iron.web.app",
        "https://iron-fit-fontend.vercel.app",
        "https://academia-frontend-ten.vercel.app"
      ],
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      credentials: true
    });

    fastify.get('/', async (req, reply) => {
      reply.send({ message: 'API IronFit funcionando! Use /produtos para acessar os produtos.' });
    });

    fastify.post("/auth/google", async (req, reply) => {
      const { idToken } = req.body;

      if (!idToken) {
        return reply.status(400).send({ error: "Token do Google é obrigatório." });
      }

      try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const { email, name, picture } = decodedToken;

        if (!email) {
          return reply.status(400).send({ error: "Token inválido: e-mail ausente." });
        }

        const resultado = await pool.query("SELECT * FROM usuarios WHERE email = $1", [email]);

        let userId;

        if (resultado.rows.length > 0) {
          const usuario = resultado.rows[0];

          if (usuario.senha !== null) {
            return reply.status(400).send({
              error: "Este e-mail está vinculado a uma conta com senha. Faça login tradicional."
            });
          }

          userId = usuario.id;
        } else {
          const novoUsuario = await pool.query(
            "INSERT INTO usuarios (nome, email, senha, foto) VALUES ($1, $2, $3, $4) RETURNING id",
            [name || "Usuário Google", email, null, picture || null]
          );
          userId = novoUsuario.rows[0].id;
        }

        const token = gerarToken(fastify, { id: userId, email });

        return reply.send({ token });
      } catch (erro) {
        console.error("❌ Erro ao verificar token do Firebase:", erro);
        return reply.status(500).send({ error: "Falha na autenticação com Google." });
      }
    });

    fastify.post("/cadastro", async (req, reply) => {
      console.log("📩 Dados recebidos:", req.body);

      const { nome, email, senha, uid } = req.body;

      if (!nome || !email || (!senha && !uid)) {
        return reply.status(400).send({ error: "Nome, email e senha/uid são obrigatórios." });
      }

      try {
        const usuarioExistente = await pool.query("SELECT * FROM usuarios WHERE email = $1", [email]);

        if (usuarioExistente.rows.length > 0) {
          return reply.status(400).send({ error: "E-mail já está em uso." });
        }

        const senhaSegura = senha ? await bcrypt.hash(senha, 10) : null;

        const novoUsuario = await pool.query(
          "INSERT INTO usuarios (nome, email, senha) VALUES ($1, $2, $3) RETURNING id",
          [nome, email, senhaSegura]
        );

        const userId = novoUsuario.rows[0].id;

        const token = fastify.jwt.sign({ id: userId, email }, { expiresIn: "1h" });

        reply.status(201).send({ message: "Usuário cadastrado com sucesso!", token });
      } catch (erro) {
        console.error("Erro ao cadastrar usuário:", erro);
        reply.status(500).send({ error: "Erro ao cadastrar usuário." });
      }
    });

    fastify.post('/login', async (req, reply) => {
      console.log("📩 Tentativa de login:", req.body);

      const { email, senha, uid } = req.body;

      if (!email || (!senha && !uid)) {
        return reply.status(400).send({ error: "E-mail e senha/uid são obrigatórios." });
      }

      try {
        const result = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
        if (result.rows.length === 0) {
          return reply.status(400).send({ error: 'Conta não encontrada. Faça o cadastro primeiro.' });
        }

        const usuario = result.rows[0];

        if (uid) {
          if (usuario.senha === uid) {
            const token = fastify.jwt.sign({ id: usuario.id, email }, { expiresIn: "1h" });
            return reply.send({ token });
          } else {
            return reply.status(400).send({ error: 'Conta Google inválida.' });
          }
        }

        const senhaValida = await bcrypt.compare(senha, usuario.senha);
        if (!senhaValida) {
          return reply.status(400).send({ error: 'E-mail ou senha incorretos.' });
        }

        const token = fastify.jwt.sign({ id: usuario.id, email }, { expiresIn: "1h" });
        reply.send({ token });
      } catch (err) {
        console.error("Erro no login:", err);
        reply.status(500).send({ error: 'Erro interno do servidor.' });
      }
    });

    fastify.post("/check-user", async (req, reply) => {
      const { email } = req.body;

      if (!email) {
        return reply.status(400).send({ error: "E-mail é obrigatório." });
      }

      try {
        const result = await pool.query("SELECT * FROM usuarios WHERE email = $1", [email]);

        if (result.rows.length > 0) {
          return reply.send({ existe: true, uid: result.rows[0].senha });
        }

        return reply.send({ existe: false });
      } catch (err) {
        console.error("Erro ao verificar usuário:", err);
        reply.status(500).send({ error: "Erro ao verificar o e-mail." });
      }
    });

    fastify.get('/usuario/:id', async (req, reply) => {
      const { id } = req.params;

      try {
        const result = await pool.query(
          'SELECT id, nome, email, criado_em FROM usuarios WHERE id = $1',
          [id]
        );

        if (result.rows.length === 0) {
          return reply.status(404).send({ error: "Usuário não encontrado." });
        }

        reply.send(result.rows[0]);
      } catch (err) {
        console.error("Erro ao buscar usuário:", err);
        reply.status(500).send({ error: "Erro interno do servidor." });
      }
    });

    fastify.get('/usuarios/email/:email', async (req, reply) => {
      const { email } = req.params;

      try {
        const result = await pool.query('SELECT id, nome, email, criado_em FROM usuarios WHERE email = $1', [email]);

        if (result.rows.length === 0) {
          return reply.status(404).send({ error: 'Usuário não encontrado' });
        }

        return reply.send(result.rows[0]);
      } catch (error) {
        console.error("Erro ao buscar usuário pelo e-mail:", error);
        return reply.status(500).send({ error: 'Erro interno do servidor' });
      }
    });

    fastify.put('/usuario/:id/email', async (req, reply) => {
      const { id } = req.params;
      const { novoEmail } = req.body;

      if (!novoEmail) {
        return reply.status(400).send({ error: 'Novo e-mail é obrigatório.' });
      }

      try {
        const existe = await pool.query('SELECT id FROM usuarios WHERE email = $1', [novoEmail]);

        if (existe.rows.length > 0) {
          return reply.status(400).send({ error: 'Este e-mail já está sendo usado por outro usuário.' });
        }

        await pool.query('UPDATE usuarios SET email = $1 WHERE id = $2', [novoEmail, id]);

        return reply.send({ message: 'E-mail atualizado com sucesso.' });
      } catch (err) {
        console.error('Erro ao atualizar e-mail:', err);
        reply.status(500).send({ error: 'Erro interno ao atualizar o e-mail.' });
      }
    });

    fastify.put('/usuario/:id/senha', async (req, reply) => {
      const { id } = req.params;
      const { senhaAtual, novaSenha } = req.body;

      if (!novaSenha) {
        return reply.status(400).send({ error: 'Nova senha é obrigatória.' });
      }

      try {
        const resultado = await pool.query('SELECT senha FROM usuarios WHERE id = $1', [id]);

        if (resultado.rows.length === 0) {
          return reply.status(404).send({ error: 'Usuário não encontrado.' });
        }

        const senhaNoBanco = resultado.rows[0].senha;

        if (senhaNoBanco) {
          if (!senhaAtual) {
            return reply.status(400).send({ error: 'Senha atual é obrigatória para alterar a senha.' });
          }

          const senhaConfere = await bcrypt.compare(senhaAtual, senhaNoBanco);
          if (!senhaConfere) {
            return reply.status(401).send({ error: 'Senha atual incorreta.' });
          }
        }

        const novaSenhaHash = await bcrypt.hash(novaSenha, 10);
        await pool.query('UPDATE usuarios SET senha = $1 WHERE id = $2', [novaSenhaHash, id]);

        reply.send({ message: senhaNoBanco ? 'Senha alterada com sucesso.' : 'Senha definida com sucesso.' });
      } catch (err) {
        console.error('Erro ao alterar senha:', err);
        reply.status(500).send({ error: 'Erro interno ao atualizar a senha.' });
      }
    });

    fastify.put('/redefinir_senha', async (req, reply) => {
      const { email, novaSenha } = req.body;

      if (!email || !novaSenha) {
        return reply.status(400).send({ error: 'E-mail e nova senha são obrigatórios.' });
      }

      try {
        const senhaHash = await bcrypt.hash(novaSenha, 10);
        const resultado = await pool.query('UPDATE usuarios SET senha = $1 WHERE email = $2', [senhaHash, email]);

        if (resultado.rowCount === 0) {
          return reply.status(404).send({ error: 'Usuário não encontrado.' });
        }

        return reply.send({ message: 'Senha redefinida com sucesso no banco de dados.' });
      } catch (err) {
        console.error('Erro ao redefinir senha:', err);
        reply.status(500).send({ error: 'Erro interno ao redefinir a senha.' });
      }
    });

    fastify.get('/usuario/:id/tem_senha', async (req, reply) => {
      const { id } = req.params;

      try {
        const resultado = await pool.query('SELECT senha FROM usuarios WHERE id = $1', [id]);

        if (resultado.rows.length === 0) {
          return reply.status(404).send({ error: 'Usuário não encontrado.' });
        }

        const temSenha = resultado.rows[0].senha !== null;
        return reply.send({ temSenha });
      } catch (err) {
        console.error('Erro ao verificar senha:', err);
        reply.status(500).send({ error: 'Erro interno ao verificar senha.' });
      }
    });

    fastify.get('/produtos', async (req, reply) => {
      try {
        const res = await pool.query('SELECT * FROM produtos_academia');
        reply.send(res.rows);
      } catch (err) {
        reply.status(500).send({ error: "Erro ao buscar produtos" });
      }
    });

    fastify.get('/produtos/:id', async (req, reply) => {
      const { id } = req.params;
      try {
        const res = await pool.query('SELECT * FROM produtos_academia WHERE IDProduto = $1', [id]);
        if (res.rows.length === 0) {
          return reply.status(404).send({ error: "Produto não encontrado" });
        }
        reply.send(res.rows[0]);
      } catch (err) {
        reply.status(500).send({ error: "Erro ao buscar produto" });
      }
    });

    fastify.post('/pagamento-pix', { preHandler: [verificaJWT] }, async (request, reply) => {
      const { amount } = request.body;
      const email = request.user?.email || request.body.email;

      if (!amount || isNaN(amount)) {
        return reply.status(400).send({ mensagem: 'Valor do pagamento inválido' });
      }

      if (!email) {
        return reply.status(400).send({ mensagem: 'E-mail do usuário é obrigatório' });
      }

      try {
        const pagamento = await mercadopago.payment.create({
          transaction_amount: Number(amount),
          description: 'Compra via Pix - IronFit',
          payment_method_id: 'pix',
          payer: { email }
        });

        const { id, point_of_interaction } = pagamento.response;

        const qrCodeBase64 = point_of_interaction?.transaction_data?.qr_code_base64;
        const pixCopiaECola = point_of_interaction?.transaction_data?.qr_code;

        if (!qrCodeBase64 || !pixCopiaECola) {
          return reply.status(500).send({ mensagem: 'Dados do Pix não encontrados na resposta do Mercado Pago' });
        }

        return reply.send({
          id,
          qrCodeBase64,
          pixCopiaECola
        });

      } catch (erro) {
        console.error('Erro ao processar pagamento Pix:', erro);
        return reply.status(500).send({
          mensagem: 'Erro ao processar pagamento Pix',
          detalhes: erro.response?.message || erro.message
        });
      }
    });

    fastify.post('/assinatura/criar', async (request, reply) => {
      try {
        const { email, nome, plano } = request.body;

        const planos = {
          'iron-warrior': {
            valor: 149.99,
            periodo: 'monthly',
            repeticoes: 1,
          },
          'iron-champion': {
            valor: 119.99,
            periodo: 'monthly',
            repeticoes: 6,
          },
          'iron-legend': {
            valor: 109.99,
            periodo: 'monthly',
            repeticoes: 12,
          },
          'iron-teste': {
            valor: 0.51,
            periodo: 'monthly',
            repeticoes: 1,
          },
        };

        const planoSelecionado = planos[plano];

        if (!planoSelecionado) {
          return reply.status(400).send({ error: 'Plano inválido.' });
        }

        const preapproval = await mercadopago.preapproval.create({
          reason: `Assinatura ${plano.replace('-', ' ').toUpperCase()}`,
          auto_recurring: {
            frequency: 1,
            frequency_type: 'months',
            transaction_amount: planoSelecionado.valor,
            currency_id: 'BRL',
            repetitions: planoSelecionado.repeticoes,
            billing_day: 10,
          },
          back_url: 'https://academia-iron.web.app/perfil',
          payer_email: email,
        });

        return reply.send(preapproval.response);
      } catch (error) {
        console.error('Erro ao criar assinatura:', error?.message || error);
        return reply.status(500).send({ error: error?.message || 'Erro ao criar assinatura.' });
      }
    });

    fastify.get('/assinatura/listar/:userEmail', async (request, reply) => {
      try {
        const { userEmail } = request.params;

        const subscriptions = await mercadopago.preapproval.search({
          qs: {
            payer_email: userEmail,
          },
        });

        return reply.send(subscriptions.response.results);
      } catch (error) {
        console.error(error);
        return reply.status(500).send({ error: 'Erro ao listar assinaturas.' });
      }
    });

    fastify.put('/assinatura/cancelar/:assinaturaId', async (request, reply) => {
      try {
        const { assinaturaId } = request.params;

        const cancelamento = await mercadopago.preapproval.update(assinaturaId, {
          status: 'cancelled',
        });

        return reply.send(cancelamento.response);
      } catch (error) {
        console.error(error);
        return reply.status(500).send({ error: 'Erro ao cancelar assinatura.' });
      }
    });

    const PORT = process.env.PORT || 4000;
    await fastify.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`🟢 Servidor rodando na porta ${PORT}`);
  } catch (err) {
    console.error("🔴 Erro ao iniciar o servidor:", err);
    process.exit(1);
  }
};

start();

// git status
// git add .
// git commit -m "170"
// git push origin main