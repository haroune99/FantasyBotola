import { Router, RequestHandler } from 'express';
import { makeTransfer } from '../transfer';

const router = Router();

router.get('/transfer', (req, res) => {
    res.send('transfer');
});

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


router.post('/transfer', transferHandler);


export default router;