import express from 'express';
import cors from 'cors';
import 'dotenv/config'; 
import qaRoutes from './src/routes/qaRoutes.js';

const app = express();
const port = process.env.PORT || 8080;

app.use(cors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));
app.use(express.json());

app.use('/api', qaRoutes);

app.listen(port, () => {
    console.log(`Servidor corriendo en http://localhost:${port}`);
    console.log('API Endpoints disponibles en /api');
});