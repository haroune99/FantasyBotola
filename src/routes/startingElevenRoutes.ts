import { Router, RequestHandler } from 'express';
import { createStartingEleven } from '../startingEleven';

const router = Router();

router.get('/team-selection', (req, res) => {
    res.send('team-selection');
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