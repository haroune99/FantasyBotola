import { UserSquadDoc } from '../../team';

declare global {
    namespace Express {
        interface Request {
            userSquad?: UserSquadDoc;
        }
    }
}

export {}; 