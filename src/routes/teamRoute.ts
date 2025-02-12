import { Router, RequestHandler } from 'express';
import { createUserSquad } from '../team';

const router = Router();

router.get('/team', (req, res) => {
    res.send('team');
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
