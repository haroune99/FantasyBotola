import express, { Request, Response, RequestHandler } from 'express';
import startingElevenRoutes from './routes/startingElevenRoutes';
import teamRoutes from './routes/teamRoute';
import transferRoutes from './routes/transferRoute';
import statsRouter from './routes/statsRoutes';
import scoreRouter from './routes/scoreRoute';


const path = require('path');

const app = express();
const PORT = 3000;

// Add body-parser middleware
app.use(express.json());

app.use(startingElevenRoutes);
app.use(teamRoutes);
app.use(transferRoutes);
app.use(statsRouter);
app.use(scoreRouter);


app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'views', 'homePage.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});