import { Router, RequestHandler, Request, Response } from 'express';
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

interface PlayerValue {
    _id: string;
    name: string;
    marketValue: number;
    club: string;
    position: string;
    fantasyPrice: number;
}

const uri = process.env.MONGODB_URI as string;
const client = new MongoClient(uri);
const DB_NAME = 'FantasyBotola';
const CURRENT_GAMEWEEK = parseInt(process.env.GAMEWEEK as string, 10);
const PLAYERVALUE_COLLECTION = `PlayerValue${CURRENT_GAMEWEEK}`;

const valuePlayers: RequestHandler = async (req, res) => {
    try {
        await client.connect();
        const name = req.params.name;
        
        const playerValue = await client.db(DB_NAME)
            .collection<PlayerValue>(PLAYERVALUE_COLLECTION)
            .findOne({ name });

        if (!playerValue) {
            res.status(404).json({ error: 'Player not found' });
            return;
        }

        res.json(playerValue);
    } catch (error) {
        console.error('Error fetching player value:', error);
        res.status(500).json({ error: 'Failed to fetch player value' });
    }
};

const router = Router();
router.get('/stats/:name', valuePlayers);

export default router;
