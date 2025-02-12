import express, { Request, Response, RequestHandler } from 'express';
import { createStartingEleven } from './startingEleven';
import startingElevenRoutes from './routes/startingElevenRoutes';

const app = express();
const PORT = 3000;

// Add body-parser middleware
app.use(express.json());

app.use(startingElevenRoutes);


app.get('/', (req, res) => {
    res.send('Welcome to the Botola Fantas App!!!');
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});