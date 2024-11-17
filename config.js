require('dotenv').config();

module.exports = {
    database: {
        name: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        dialect: 'postgres',
        dialectOptions: {
            ssl: {
                require: true, // SSL é obrigatório no Neon
                rejectUnauthorized: false, // Aceitar certificados autoassinados
            },
        },
    },
    server: {
        port: process.env.PORT || 3750,
    },
};
