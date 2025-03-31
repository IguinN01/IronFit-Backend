require('dotenv').config();
const fastify = require('fastify')();
const cors = require('@fastify/cors');
const { Client } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

client.connect()
  .then(() => console.log("🟢 Conectado ao banco de dados"))
  .catch(err => {
    console.error("🔴 Erro ao conectar ao banco:", err);
    process.exit(1);
  });

fastify.register(cors, {
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
});

fastify.post('/register', async (req, reply) => {
  const { nome, email, senha, confirmacaoSenha } = req.body;

  if (senha !== confirmacaoSenha) {
    return reply.status(400).send({ error: 'As senhas não coincidem.' });
  }

  try {
    const result = await client.query('SELECT * FROM usuarios WHERE email = $1', [email]);
    if (result.rows.length > 0) {
      return reply.status(400).send({ error: 'E-mail já cadastrado.' });
    }

    const salt = await bcrypt.genSalt(10);
    const senhaCriptografada = await bcrypt.hash(senha, salt);

    await client.query(
      'INSERT INTO usuarios (nome, email, senha) VALUES ($1, $2, $3) RETURNING *',
      [nome, email, senhaCriptografada]
    );

    const token = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: '1h' });

    reply.status(201).send({ token });
  } catch (err) {
    console.error(err);
    reply.status(500).send({ error: 'Erro interno do servidor.' });
  }
});

fastify.post('/login', async (req, reply) => {
  const { email, senha } = req.body;

  try {
    const result = await client.query('SELECT * FROM usuarios WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return reply.status(400).send({ error: 'E-mail ou senha incorretos.' });
    }

    const usuario = result.rows[0];

    const senhaValida = await bcrypt.compare(senha, usuario.senha);
    if (!senhaValida) {
      return reply.status(400).send({ error: 'E-mail ou senha incorretos.' });
    }

    const token = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: '1h' });

    reply.send({ token });
  } catch (err) {
    console.error(err);
    reply.status(500).send({ error: 'Erro interno do servidor.' });
  }
});

fastify.post('/check-user', async (req, reply) => {
  const { email } = req.body;

  try {
    const result = await client.query('SELECT * FROM usuarios WHERE email = $1', [email]);
    if (result.rows.length > 0) {
      return reply.send({ existe: true });
    } else {
      return reply.send({ existe: false });
    }
  } catch (err) {
    console.error(err);
    reply.status(500).send({ error: 'Erro ao verificar o e-mail.' });
  }
});

fastify.get('/produtos', async (req, reply) => {
  try {
    const res = await client.query('SELECT * FROM produtos_academia');
    reply.send(res.rows);
  } catch (err) {
    reply.status(500).send({ error: "Erro ao buscar produtos" });
  }
});

fastify.get('/produtos/:id', async (req, reply) => {
  const { id } = req.params;
  try {
    const res = await client.query('SELECT * FROM produtos_academia WHERE IDProduto = $1', [id]);
    if (res.rows.length === 0) {
      return reply.status(404).send({ error: "Produto não encontrado" });
    }
    reply.send(res.rows[0]);
  } catch (err) {
    reply.status(500).send({ error: "Erro ao buscar produto" });
  }
});

fastify.get('/', async (req, reply) => {
  reply.send({ message: 'API IronFit funcionando! Use /produtos para acessar os produtos.' });
});

const PORT = process.env.PORT || 3000;
fastify.listen({ port: PORT, host: '0.0.0.0' }, err => {
  if (err) {
    console.error("🔴 Erro ao iniciar o servidor:", err);
    process.exit(1);
  }
  console.log(`🟢 Servidor rodando na porta ${PORT}`);
});

// git status
// git add .
// git commit -m "000"
// git push origin main 