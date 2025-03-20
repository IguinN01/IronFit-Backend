// index.js
require('dotenv').config();
const fastify = require('fastify')();
const cors = require('@fastify/cors');
const { Client } = require('pg');

// Configuração do banco de dados
const client = new Client({
  connectionString: process.env.DATABASE_URL, // URL do banco de dados NeonTech
  ssl: {
    rejectUnauthorized: false, // Necessário para conectar a bancos como NeonTech
  },
});

// Conectar ao banco de dados
client.connect()
  .then(() => console.log("🟢 Conectado ao banco de dados"))
  .catch(err => {
    console.error("🔴 Erro ao conectar ao banco:", err);
    process.exit(1);
  });

// Habilitar CORS
fastify.register(cors, {
  origin: '*', // Para produção, defina o domínio do frontend (ex: 'https://seusite.vercel.app')
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
});

// Rotas CRUD para 'produtos_academia'

// Listar todos os produtos
fastify.get('/produtos', async (req, reply) => {
  try {
    const res = await client.query('SELECT * FROM produtos_academia');
    reply.send(res.rows);
  } catch (err) {
    reply.status(500).send({ error: "Erro ao buscar produtos" });
  }
});

// Buscar um produto por ID
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

// Criar um novo produto
fastify.post('/produtos', async (req, reply) => {
  const { nome, preco, descricao_produto, imagens, categoria } = req.body;
  try {
    const res = await client.query(
      'INSERT INTO produtos_academia (nome, preco, descricao_produto, imagens, categoria) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [nome, preco, descricao_produto, imagens, categoria]
    );
    reply.status(201).send(res.rows[0]);
  } catch (err) {
    reply.status(500).send({ error: "Erro ao criar produto" });
  }
});

// Atualizar um produto
fastify.put('/produtos/:id', async (req, reply) => {
  const { id } = req.params;
  const { nome, preco, descricao_produto, imagens, categoria } = req.body;
  try {
    const res = await client.query(
      'UPDATE produtos_academia SET nome = $1, preco = $2, descricao_produto = $3, imagens = $4, categoria = $5 WHERE IDProduto = $6 RETURNING *',
      [nome, preco, descricao_produto, imagens, categoria, id]
    );
    if (res.rows.length === 0) {
      return reply.status(404).send({ error: "Produto não encontrado" });
    }
    reply.send(res.rows[0]);
  } catch (err) {
    reply.status(500).send({ error: "Erro ao atualizar produto" });
  }
});

// Deletar um produto
fastify.delete('/produtos/:id', async (req, reply) => {
  const { id } = req.params;
  try {
    const res = await client.query('DELETE FROM produtos_academia WHERE IDProduto = $1 RETURNING *', [id]);
    if (res.rows.length === 0) {
      return reply.status(404).send({ error: "Produto não encontrado" });
    }
    reply.send({ message: "Produto deletado com sucesso" });
  } catch (err) {
    reply.status(500).send({ error: "Erro ao deletar produto" });
  }
});

// Iniciar o servidor
const PORT = process.env.PORT || 3000; // Render define automaticamente a porta
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