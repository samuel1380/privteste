const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

// Configurações PagVIVA (Usando Variáveis de Ambiente para Segurança)
const PAGVIVA_CONFIG = {
    endpoint: 'https://pagviva.com/api/transaction/deposit',
    token: process.env.PAGVIVA_TOKEN || 'a9dc1703-e814-4fe2-b3f0-0e91258208cb',
    apiKey: process.env.PAGVIVA_API_KEY || '697d6de0f0c33',
    secret: process.env.PAGVIVA_SECRET || 'f327e8a9-6766-4ec7-a3a1-10671db2ec68'
};

// Middleware para JSON
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Servir arquivos estáticos
app.use(express.static(path.join(__dirname, '.')));

// Armazenamento temporário de transações
const transactions = {};

// Endpoint para criar PIX (Backend para evitar CORS e ocultar chaves)
app.post('/create-pix', async (req, res) => {
    try {
        const { amount, debtor_name, email, debtor_document_number } = req.body;
        const token = String(PAGVIVA_CONFIG.token || '').trim();
        const apiKey = String(PAGVIVA_CONFIG.apiKey || '').trim();
        const secret = String(PAGVIVA_CONFIG.secret || '').trim();

        if (!token || !apiKey || !secret) {
            return res.status(500).json({
                error: true,
                message: 'Chaves da PagVIVA ausentes no servidor'
            });
        }

        // O postback só funciona quando o site estiver online (Render)
        const isLocal = req.headers.host.includes('localhost') || req.headers.host.includes('127.0.0.1');
        const postbackUrl = isLocal ? 'https://google.com/callback-placeholder' : `https://${req.headers.host}/postback`;

        const payload = {
            "postback": postbackUrl,
            "amount": amount,
            "debtor_name": debtor_name,
            "email": email,
            "debtor_document_number": debtor_document_number.replace(/\D/g, ''),
            "phone": "11999999999",
            "method_pay": "pix"
        };

        console.log('Solicitando PIX à PagVIVA...', { amount });

        const response = await axios.post(PAGVIVA_CONFIG.endpoint, payload, {
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': `Bearer ${token}|${secret}`,
                'x-api-key': apiKey,
                'x-secret-key': secret,
                'token': token,
                'secret': secret
            }
        });

        console.log('Resposta PagVIVA:', response.data);
        res.json(response.data);

    } catch (error) {
        console.error('--- ERRO PAGVIVA DETALHADO ---');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Dados da Resposta:', JSON.stringify(error.response.data, null, 2));
            console.error('Headers da Resposta:', error.response.headers);
        } else {
            console.error('Mensagem de Erro:', error.message);
        }
        
        const errorMsg = error.response && error.response.data ? 
            (typeof error.response.data === 'string' ? error.response.data : JSON.stringify(error.response.data)) : 
            error.message;

        res.status(500).json({
            error: true,
            message: errorMsg
        });
    }
});

// Rota de Postback para PagVIVA
app.post('/postback', (req, res) => {
    const payload = req.body;
    const { idTransaction, status } = payload;
    
    console.log('--- POSTBACK RECEBIDO ---');
    console.log(`Transação: ${idTransaction} | Status: ${status}`);
    
    // Armazena o status da transação
    transactions[idTransaction] = status;

    // Responder sempre com 200 para a PagVIVA não tentar reenviar
    res.status(200).send('OK');
});

// Endpoint para o frontend verificar o status
app.get('/check-status/:id', (req, res) => {
    const id = req.params.id;
    const status = transactions[id] || 1; // 1 = Aguardando por padrão
    
    res.json({
        idTransaction: id,
        status: status,
        approved: status == 2 || status == '2'
    });
});

// Rota principal (opcional, já que o express.static cuida disso)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
    console.log(`URL de Postback local: http://localhost:${PORT}/postback`);
    console.log('PagVIVA env:', {
        token: !!process.env.PAGVIVA_TOKEN,
        apiKey: !!process.env.PAGVIVA_API_KEY,
        secret: !!process.env.PAGVIVA_SECRET
    });
});
