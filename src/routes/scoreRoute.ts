import { Router, RequestHandler } from 'express';
import { MongoClient } from 'mongodb';
import { StartingElevenDoc } from '../startingEleven';
import dotenv from 'dotenv';

dotenv.config();

const uri = process.env.MONGODB_URI as string;
const client = new MongoClient(uri);
const CURRENT_GAMEWEEK = parseInt(process.env.GAMEWEEK as string, 10);

const DB_NAME = 'FantasyBotola';
const STARTING_TEAM_COLLECTION = `StartingTeam${CURRENT_GAMEWEEK}`;
const GAMEWEEK_COLLECTION = `gameweek${CURRENT_GAMEWEEK}`;

interface UserSquadDoc {
    userId: string;
    gameweek: number;
    totalPrice: number;
    playerScores: Array<{
        player: string;
        score: number;
    }>;
}

const getScore: RequestHandler = async (req, res) => {
    try {
        await client.connect();
        const userId = req.params.userId;
        const playerId = req.query.playerId as string;
        
        const userSquad = await client.db(DB_NAME)
            .collection(STARTING_TEAM_COLLECTION)
            .findOne({ userId });

        if (!userSquad) {
            res.status(404).json({ error: 'User squad not found' });
            return;
        }

        // If playerId is provided, return only that player's score
        if (playerId) {
            const playerScore = userSquad.playerScores?.find((p: {player: string, score: number}) => p.player === playerId);
            if (!playerScore) {
                res.status(404).json({ error: 'Player not found in squad' });
                return;
            }
            res.json(playerScore);
            return;
        }

        // Calculate total score
        const totalScore = userSquad.playerScores?.reduce((sum: number, player: {player: string, score: number}) => sum + player.score, 0) || 0;

        res.json({
            playerScores: userSquad.playerScores || [],
            totalScore
        });
    } catch (error) {
        console.error('Error fetching player score:', error);
        res.status(500).json({ error: 'Failed to fetch player score' });
    } finally {
        await client.close();
    }
};

const router = Router();
router.get('/score/:userId', getScore);

export default router;