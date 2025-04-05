require('dotenv').config();
const fastify = require('fastify')();
const cors = require('@fastify/cors');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
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
    "https://academia-iron.web.app",
    "https://iron-fit-fontend.vercel.app",
    "https://academia-frontend-ten.vercel.app"
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
});

fastify.post("/auth/google", async (req, reply) => {
  console.log("📩 Dados recebidos do Google:", req.body);

  const { nome, email, googleId } = req.body;

  if (!email || !googleId) {
    return reply.status(400).send({ error: "E-mail e Google ID são obrigatórios." });
  }

  try {
    const usuarioExistente = await pool.query("SELECT * FROM usuarios WHERE email = $1", [email]);

    if (usuarioExistente.rows.length > 0) {
      const usuario = usuarioExistente.rows[0];

      if (usuario.senha !== googleId) {
        return reply.status(400).send({ error: "Conta Google inválida." });
      }

      const token = jwt.sign({ id: usuario.id, email }, process.env.JWT_SECRET, { expiresIn: "1h" });
      return reply.send({ token });
    }

    const senhaGerada = crypto.randomBytes(16).toString('hex');
    const senhaHash = await bcrypt.hash(senhaGerada, 10);

    const novoUsuario = await pool.query(
      "INSERT INTO usuarios (nome, email, senha) VALUES ($1, $2, $3) RETURNING id",
      [nome, email, senhaHash]
    );

    const userId = novoUsuario.rows[0].id;

    const token = jwt.sign({ id: userId, email }, process.env.JWT_SECRET, { expiresIn: "1h" });

    reply.status(201).send({ message: "Usuário cadastrado com sucesso!", token });
  } catch (erro) {
    console.error("Erro na autenticação com Google:", erro);
    reply.status(500).send({ error: "Erro interno no servidor." });
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

    const senhaSegura = uid || (senha ? await bcrypt.hash(senha, 10) : null);

    const novoUsuario = await pool.query(
      "INSERT INTO usuarios (nome, email, senha) VALUES ($1, $2, $3) RETURNING id",
      [nome, email, senhaSegura]
    );

    const userId = novoUsuario.rows[0].id;

    const token = jwt.sign({ id: userId, email }, process.env.JWT_SECRET, { expiresIn: "1h" });

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
        const token = jwt.sign({ id: usuario.id, email }, process.env.JWT_SECRET, { expiresIn: '1h' });
        return reply.send({ token });
      } else {
        return reply.status(400).send({ error: 'Conta Google inválida.' });
      }
    }

    const senhaValida = await bcrypt.compare(senha, usuario.senha);
    if (!senhaValida) {
      return reply.status(400).send({ error: 'E-mail ou senha incorretos.' });
    }

    const token = jwt.sign({ id: usuario.id, email }, process.env.JWT_SECRET, { expiresIn: '1h' });
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