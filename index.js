import express from 'express'
import session from 'express-session'
import path from "path";
import dotenv from "dotenv";
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from "url";
import { MerchantClient } from "@dv.net/js-client";

dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

const client = new MerchantClient({
    xApiKey: process.env.X_API_KEY,
    host: process.env.HOST
});

app.use(express.json());
app.use(
  session({
    secret: 'demo-dv-net-shop',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 1000 * 60 * 60 },
  })
);

app.use((req, res, next) => {
  if (!req.session.cart) {
    req.session.cart = {};
  }
  next();
});

app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/products', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'data.json'));
});

app.get('/api/cart', (req, res) => {
  res.json({ items: req.session.cart });
});

app.post('/api/cart/add', (req, res) => {
  const { productId } = req.body;
  if (!productId) {
    return res.status(400).json({ error: 'productId is required' });
  }
  const currentQty = req.session.cart[productId] || 0;
  req.session.cart[productId] = currentQty + 1;
  res.json({ ok: true, items: req.session.cart });
});

app.post('/api/cart/remove', (req, res) => {
  const { productId } = req.body;
  if (!productId) {
    return res.status(400).json({ error: 'productId is required' });
  }
  const currentQty = req.session.cart[productId] || 0;
  if (currentQty > 1) {
    req.session.cart[productId] = currentQty - 1;
  } else {
    delete req.session.cart[productId];
  }
  res.json({ ok: true, items: req.session.cart });
});

app.post('/api/cart/clear', (req, res) => {
  req.session.cart = {};
  res.json({ ok: true, items: req.session.cart });
});

app.post('/api/pay-url', async (req, res) => {
    try {
        const { amount } = req.body;
        if (!amount) {
            return res.status(422).json({ error: 'amount is required' });
        }
        const wallet = await client.getExternalWallet({
            storeExternalId: uuidv4(),
            amount: amount
        });
        res.json({ ok: true, payUrl: wallet.pay_url });
    } catch (error) {
        console.error(error);
        res.status(400).json(error);
    }
});

app.listen(PORT, () => {
  console.log(`DV NET Shop running at http://localhost:${PORT}`);
});


