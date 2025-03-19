// index.js
const fastify = require('fastify')();
const { Client } = require('pg');

// Conexão com o banco de dados
const client = new Client({
  connectionString: process.env.DATABASE_URL, // URL do seu banco de dados NeonTech
});
client.connect();

// Habilitar CORS
fastify.register(require('fastify-cors'));

// Rotas CRUD para 'produtos_academia'

fastify.get('/produtos', async (req, reply) => {
  const res = await client.query('SELECT * FROM produtos_academia');
  reply.send(res.rows);
});

fastify.get('/produtos/:id', async (req, reply) => {
  const { id } = req.params;
  const res = await client.query('SELECT * FROM produtos_academia WHERE IDProduto = $1', [id]);
  reply.send(res.rows[0]);
});

fastify.post('/produtos', async (req, reply) => {
  const { nome, preco, descricao_produto, imagens, categoria } = req.body;
  const res = await client.query(
    'INSERT INTO produtos_academia (nome, preco, descricao_produto, imagens, categoria) VALUES ($1, $2, $3, $4, $5) RETURNING *',
    [nome, preco, descricao_produto, imagens, categoria]
  );
  reply.status(201).send(res.rows[0]);
});

fastify.put('/produtos/:id', async (req, reply) => {
  const { id } = req.params;
  const { nome, preco, descricao_produto, imagens, categoria } = req.body;
  const res = await client.query(
    'UPDATE produtos_academia SET nome = $1, preco = $2, descricao_produto = $3, imagens = $4, categoria = $5 WHERE IDProduto = $6 RETURNING *',
    [nome, preco, descricao_produto, imagens, categoria, id]
  );
  reply.send(res.rows[0]);
});

fastify.delete('/produtos/:id', async (req, reply) => {
  const { id } = req.params;
  const res = await client.query('DELETE FROM produtos_academia WHERE IDProduto = $1 RETURNING *', [id]);
  reply.send(res.rows[0]);
});

// Iniciar o servidor
fastify.listen(3000, err => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log('Servidor rodando na porta 3000');
});
