import { Router, RequestHandler } from 'express';
import { makeTransfer } from '../transfer';
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

interface TransferSaved {
    _id: string;
    usedId: string;
    availableTransfers: number;
    lastGameweekUpdated: number;
    maxSavedTransfers: number;
}

const uri = process.env.MONGODB_URI as string;
const client = new MongoClient(uri);
const DB_NAME = 'FantasyBotola';
const CURRENT_GAMEWEEK = parseInt(process.env.GAMEWEEK as string, 10);
const TRANSFERSTATECOLLECTION = `UserTransferState`;

const router = Router();

const checkTransfer: RequestHandler = async (req, res) => {
    try {
        await client.connect();
        const userId = req.params.userId;
        
        const availableTransfers = await client.db(DB_NAME)
            .collection<TransferSaved>(TRANSFERSTATECOLLECTION)
            .findOne({ userId });

        if (!availableTransfers) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        res.json(availableTransfers);
    } catch (error) {
        console.error('Error fetching the userId:', error);
        res.status(500).json({ error: 'Failed to fetch Transfer State' });
    }
};

const transferHandler: RequestHandler = async (req, res) => {
    try {
        const { userId, playerOut, playerIn } = req.body;

        if (!userId || !playerOut?.name || !playerOut?.club || !playerIn?.name || !playerIn?.club) {
            res.status(400).json({ 
                error: 'Missing required fields: userId, playerOut (name, club), and playerIn (name, club)' 
            });
            return;
        }

        await makeTransfer({ userId, playerOut, playerIn });
        res.status(200).json({ message: 'Transfer made successfully' });
    } catch (error) {
        console.error('Error making transfer:', error);
        res.status(500).json({ 
            error: 'Failed to make transfer' 
        });
    }
};

router.get('/transfer/:userId', checkTransfer);

router.post('/transfer/:userId', transferHandler);


export default router;