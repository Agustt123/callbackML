const express = require("express");
const amqp = require("amqplib");
const redis = require("redis");
const { showallsellers, agregarSellerActivo, quitarSellerActivo, agregarSellerActivoV2, showallsellersV2, deleteAllv2 } = require("./sellers");

const app = express();
app.use(express.json()); // Middleware para parsear JSON

// Redis externo
const clientFF = redis.createClient({
    socket: {
        host: "192.99.190.137",
        port: 50301,
    },
    password: "sdJmdxXC8luknTrqmHceJS48NTyzExQg",
});

// Conectar a Redis
clientFF.connect().catch(err => {
    console.error("Error al conectar con Redis:", err.message);
});

// RabbitMQ
const queue = "webhookml";
const rabbitConfig = {
    protocol: "amqp",
    hostname: "158.69.131.226",
    port: 5672,
    username: "lightdata",
    password: "QQyfVBKRbw6fBb",
    clientProperties: {
        connection_name: "callback"
    }
};

let rabbitConnection;
let rabbitChannel;

const sellersActivosCache = new Set();

async function connectRabbit() {
    if (rabbitChannel) return;

    rabbitConnection = await amqp.connect(rabbitConfig);
    rabbitChannel = await rabbitConnection.createChannel();
    await rabbitChannel.assertQueue(queue, { durable: true });
}

app.post("/incomes", async (req, res) => {
    const data = req.body;
    const incomeuserid = data.user_id ? data.user_id.toString() : "";

    try {
        // 1. Verificar en cache local
        if (sellersActivosCache.has(incomeuserid)) {
            await procesarWebhook(data, res);
            return;
        }

        // 2. Verificar en Redis externo
        const isActive = await clientFF.sIsMember("sellersactivos", incomeuserid);

        if (isActive) {
            sellersActivosCache.add(incomeuserid); // Guardar en cache local
            await procesarWebhook(data, res);
        } else {
            res.status(403).send("Vendedor no activo");
        }
    } catch (err) {
        console.error("❌ Error procesando webhook:", err.message);
        res.status(500).send("Error interno");
    }
});
app.get("/sellersactivos", async (req, res) => {
    const operador = req.query.operador;
    const token = req.query.token;

    // Validar token
    if (!token || token !== new Date().toISOString().slice(0, 10).replace(/-/g, '')) {
        return res.status(403).send("Token inválido");
    }

    try {
        switch (operador) {
            case "showall":
                await showallsellers(res);
                break;
            case "add":
                const sellerIdToAdd = req.query.sellerid;
                await agregarSellerActivo(sellerIdToAdd);
                res.send(`Seller ID '${sellerIdToAdd}' agregado a 'sellersactivos'.`);
                break;
            case "remove":
                const sellerIdToRemove = req.query.sellerid;
                await quitarSellerActivo(sellerIdToRemove);
                res.send(`Seller ID '${sellerIdToRemove}' quitado de 'sellersactivos'.`);
                break;
            case "addV2":
                const sellerIdV2 = req.query.sellerid;
                const dataV2 = JSON.parse(req.query.data);
                await agregarSellerActivoV2(sellerIdV2, dataV2);
                res.send(`Datos agregados para seller_id: ${sellerIdV2}`);
                break;
            case "showallV2":
                await showallsellersV2(res);
                break;
            case "remove2":
                await deleteAllv2();
                res.send("Todos los sellers eliminados.");
                break;
            default:
                res.status(400).send("Operador no válido");
        }
    } catch (err) {
        console.error("Error en el manejo de sellers activos:", err.message);
        res.status(500).send("Error interno");
    }
});
app.get("/get", (req, res) => {
    res.send("Webhook listener activo");
})



async function procesarWebhook(data, res) {
    await connectRabbit();
    rabbitChannel.sendToQueue(queue, Buffer.from(JSON.stringify(data)), {
        persistent: true,
    });
    res.status(200).send("Webhook recibido");
}

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`🚀 Webhook listener activo en http://localhost:${PORT}`);
});
