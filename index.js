const express = require('express');
const Sequelize = require('sequelize');
const dotenv = require('dotenv');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcrypt');
const { database, server } = require('./config');

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

// Configuração do diretório de imagens
const uploadDir = path.join(__dirname, 'img/capas-livro');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

app.use('/img/capas-livro', express.static(uploadDir));

// Configuração do multer para upload de imagens
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => cb(null, `${Date.now()}${path.extname(file.originalname)}`),
});
const upload = multer({ storage });

// Configuração do Sequelize com Neon
const sequelize = new Sequelize(database.name, database.user, database.password, {
    host: database.host,
    dialect: database.dialect,
    port: database.port,
    dialectOptions: database.dialectOptions,
});

// Testar conexão com o banco de dados
sequelize
    .authenticate()
    .then(() => console.log('Conexão com o banco Neon estabelecida com sucesso!'))
    .catch((err) => console.error('Erro ao conectar ao banco:', err.message));

// Sincronizar banco de dados
sequelize
    .sync({ alter: true })
    .then(() => console.log('Banco de dados sincronizado com sucesso!'))
    .catch((err) => console.error('Erro ao sincronizar banco de dados:', err));

// Definição dos modelos
const Usuario = sequelize.define('Usuario', {
    id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
    nome: { type: Sequelize.STRING, allowNull: false },
    email: { type: Sequelize.STRING, allowNull: false, unique: true },
    senha: { type: Sequelize.STRING, allowNull: false },
    masp: { type: Sequelize.STRING, unique: true, allowNull: true },
}, { timestamps: true, tableName: 'usuarios' });

const Livro = sequelize.define('Livro', {
    id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
    titulo: { type: Sequelize.STRING, allowNull: false },
    autor: { type: Sequelize.STRING, allowNull: false },
    quantidade: { type: Sequelize.INTEGER, allowNull: false },
    editora: { type: Sequelize.STRING, allowNull: false },
    assunto: { type: Sequelize.STRING },
    faixaEtaria: { type: Sequelize.ENUM('Livre', 'Infantil', 'Infantojuvenil', 'Adulto'), allowNull: false },
    imagem: { type: Sequelize.STRING, allowNull: true },
}, { timestamps: true, tableName: 'livros' });

const Emprestimo = sequelize.define('Emprestimo', {
    id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
    data_vencimento: { type: Sequelize.DATE, allowNull: false },
    renovacoes: { type: Sequelize.INTEGER, defaultValue: 0 },
    usuarioId: { type: Sequelize.INTEGER, references: { model: 'usuarios', key: 'id' } },
    livroId: { type: Sequelize.INTEGER, references: { model: 'livros', key: 'id' } },
}, { timestamps: true, tableName: 'emprestimos' });

Usuario.hasMany(Emprestimo, { foreignKey: 'usuarioId' });
Livro.hasMany(Emprestimo, { foreignKey: 'livroId' });
Emprestimo.belongsTo(Usuario, { foreignKey: 'usuarioId' });
Emprestimo.belongsTo(Livro, { foreignKey: 'livroId' });

// Rotas da API
app.post('/registrar', async (req, res) => {
    try {
        const { nome, email, senha } = req.body;
        const senhaHasheada = await bcrypt.hash(senha, 10);
        const usuario = await Usuario.create({ nome, email, senha: senhaHasheada });
        res.status(201).json(usuario);
    } catch (error) {
        res.status(400).json({ erro: error.message });
    }
});

app.post('/login', async (req, res) => {
    try {
        const { email, senha } = req.body;
        const usuario = await Usuario.findOne({ where: { email } });
        if (!usuario || !(await bcrypt.compare(senha, usuario.senha))) {
            return res.status(401).json({ erro: 'Credenciais inválidas' });
        }
        res.status(200).json({ id: usuario.id, nome: usuario.nome, email: usuario.email });
    } catch (error) {
        res.status(500).json({ erro: error.message });
    }
});

app.post('/livros', upload.single('imagem'), async (req, res) => {
    try {
        const { titulo, autor, quantidade, editora, assunto, faixaEtaria } = req.body;
        const imagem = req.file ? req.file.filename : null;
        const livro = await Livro.create({ titulo, autor, quantidade, editora, assunto, faixaEtaria, imagem });
        res.status(201).json(livro);
    } catch (error) {
        res.status(500).json({ erro: error.message });
    }
});

// Outras rotas aqui (alugar livro, devolver livro, renovar, listar etc.)

// Inicializar servidor
app.listen(server.port, () => {
    console.log(`Servidor rodando na porta ${server.port}`);
});
