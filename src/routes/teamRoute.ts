import { Router, RequestHandler, Request } from 'express';
import { createUserSquad, UserSquadDoc } from '../team';
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const uri = process.env.MONGODB_URI as string;
const client = new MongoClient(uri);
const DB_NAME = 'FantasyBotola';
const CURRENT_GAMEWEEK = parseInt(process.env.GAMEWEEK as string, 10);
const USER_SQUAD_COLLECTION = `UserSquad${CURRENT_GAMEWEEK}`;

declare global {
    namespace Express {
        interface Request {
            userSquad?: UserSquadDoc;
        }
    }
}

const router = Router();

const fetchUserSquadMiddleware: RequestHandler = async (req, res, next) => {
    const { userId } = req.params;

    try {
        await client.connect();
        const db = client.db(DB_NAME);
        const squadsCol = db.collection<UserSquadDoc>(USER_SQUAD_COLLECTION);

        const userSquad = await squadsCol.findOne({ userId });

        if (!userSquad) {
            res.status(404).json({ error: `User squad not found for userId ${userId}` });
            return;
        }

        req.userSquad = userSquad;
        next();
    } catch (error) {
        console.error('Error fetching user squad:', error);
        res.status(500).json({ error: 'Failed to fetch user squad' });
    }
};

router.get('/user-squad/:userId', fetchUserSquadMiddleware, (req, res) => {
    if (!req.userSquad) {
        res.status(500).json({ error: 'User squad not found in request' });
        return;
    }
    res.status(200).json(req.userSquad);
});

const teamHandler: RequestHandler = async (req, res) => {
    try {
        const { userId, playerNames } = req.body;

        if (!userId || !playerNames) {
            res.status(400).json({ 
                error: 'Missing required fields: userId and playerNames' 
            });
            return;
        }

        await createUserSquad(userId, playerNames);
        res.status(200).json({ message: 'Team created!' });
    } catch (error) {
        console.error('Error creating team:', error);
        res.status(500).json({ 
            error: 'Failed to create team' 
        });
    }
};

router.post('/team', teamHandler);

export default router;
