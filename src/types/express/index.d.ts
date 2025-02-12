import { UserSquadDoc } from '../../team';

declare global {
    namespace Express {
        interface Request {
            userSquad?: UserSquadDoc;
        }
    }
}

export {}; // This makes the file a module