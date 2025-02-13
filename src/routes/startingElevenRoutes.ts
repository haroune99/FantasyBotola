import { Router, RequestHandler } from 'express';
import { createStartingEleven, StartingElevenDoc } from '../startingEleven';
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const uri = process.env.MONGODB_URI as string;
const client = new MongoClient(uri);
const DB_NAME = 'FantasyBotola';
const CURRENT_GAMEWEEK = parseInt(process.env.GAMEWEEK as string, 10);
const STARTING_ELEVEN = `StartingTeam${CURRENT_GAMEWEEK}`;

const router = Router();

const path = require('path');

router.get('/starting-eleven/:userId', async (req, res) => {
    const { userId } = req.params;

    try {
        await client.connect();
        const db = client.db(DB_NAME);
        const startingElevenCol = db.collection<StartingElevenDoc>(STARTING_ELEVEN);

        const startingEleven = await startingElevenCol.findOne({ userId });

        if (!startingEleven) {
            res.status(404).json({ error: `Starting eleven not found for userId ${userId}` });
            return;
        }

        res.status(200).json(startingEleven);
    } catch (error) {
        console.error('Error fetching starting eleven:', error);
        res.status(500).json({ error: 'Failed to fetch starting eleven' });
    } finally {
        await client.close();
    }
});

const teamSelectionHandler: RequestHandler = async (req, res) => {
    try {
        const { userId, playerNames } = req.body;

        if (!userId || !playerNames) {
            res.status(400).json({ 
                error: 'Missing required fields: userId and playerNames' 
            });
            return;
        }

        await createStartingEleven(userId, playerNames);
        res.status(200).json({ message: 'Starting team set!' });
    } catch (error) {
        console.error('Error setting starting team:', error);
        res.status(500).json({ 
            error: 'Failed to set starting team' 
        });
    }
};

router.post('/team-selection', teamSelectionHandler);

export default router; 