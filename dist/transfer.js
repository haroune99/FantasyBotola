"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongodb_1 = require("mongodb");
const dotenv_1 = __importDefault(require("dotenv"));
const team_1 = require("./team");
dotenv_1.default.config();
const uri = process.env.MONGODB_URI;
const client = new mongodb_1.MongoClient(uri);
const CURRENT_GAMEWEEK = parseInt(process.env.GAMEWEEK, 10);
const DB_NAME = 'FantasyBotola';
const PLAYER_COLLECTION = `PlayerValue${CURRENT_GAMEWEEK}`;
const USER_SQUAD_COLLECTION = `UserSquad${CURRENT_GAMEWEEK}`;
const USER_TRANSFER_STATE_COLLECTION = 'UserTransferState';
function makeTransfer(request) {
    return __awaiter(this, void 0, void 0, function* () {
        yield client.connect();
        const session = client.startSession();
        try {
            yield session.withTransaction(() => __awaiter(this, void 0, void 0, function* () {
                var _a, _b, _c;
                const db = client.db(DB_NAME);
                // 1. Check Transfer Availability
                const transferStateCol = db.collection(USER_TRANSFER_STATE_COLLECTION);
                const transferState = yield transferStateCol.findOne({ userId: request.userId }, { session });
                let available = (_a = transferState === null || transferState === void 0 ? void 0 : transferState.availableTransfers) !== null && _a !== void 0 ? _a : 1;
                const maxSaved = (_b = transferState === null || transferState === void 0 ? void 0 : transferState.maxSavedTransfers) !== null && _b !== void 0 ? _b : 2;
                const lastUpdated = (_c = transferState === null || transferState === void 0 ? void 0 : transferState.lastGameweekUpdated) !== null && _c !== void 0 ? _c : CURRENT_GAMEWEEK;
                // Update transfers if new gameweek
                if (lastUpdated < CURRENT_GAMEWEEK) {
                    available = Math.min(available + 1, maxSaved);
                    yield transferStateCol.updateOne({ userId: request.userId }, { $set: { availableTransfers: available, lastGameweekUpdated: CURRENT_GAMEWEEK } }, { upsert: true, session });
                }
                if (available < 1)
                    throw new Error('No transfers available');
                // 2. Validate Players
                const squadCol = db.collection(USER_SQUAD_COLLECTION);
                const currentSquad = yield squadCol.findOne({ userId: request.userId, gameweek: CURRENT_GAMEWEEK }, { session });
                if (!currentSquad)
                    throw new Error('Current squad not found');
                const playerOut = currentSquad.players.find(p => p.name === request.playerOut.name && p.club === request.playerOut.club);
                if (!playerOut)
                    throw new Error('Player not in squad');
                const playersCol = db.collection(PLAYER_COLLECTION);
                const playerIn = yield playersCol.findOne({ name: request.playerIn.name, club: request.playerIn.club }, { session });
                if (!playerIn)
                    throw new Error('Player not found');
                if (playerOut.position !== playerIn.position) {
                    throw new Error('Position mismatch');
                }
                // 3. Budget and Club Checks
                const newTotal = currentSquad.totalPrice - playerOut.fantasyPrice + playerIn.fantasyPrice;
                if (newTotal > 100)
                    throw new Error('Budget exceeded');
                const currentClubCount = currentSquad.players.filter(p => p.club === playerIn.club).length;
                if (currentClubCount - (playerOut.club === playerIn.club ? 1 : 0) >= 3) {
                    throw new Error('Club limit exceeded');
                }
                // 4. Create New Squad
                const newPlayers = currentSquad.players.map(p => p === playerOut ? playerIn : p);
                (0, team_1.validateSquad)(newPlayers); // Reuse existing validation
                // 5. Update Database
                yield transferStateCol.updateOne({ userId: request.userId }, { $inc: { availableTransfers: -1 } }, { session });
                const newSquad = Object.assign(Object.assign({}, currentSquad), { _id: new mongodb_1.ObjectId(), gameweek: CURRENT_GAMEWEEK + 1, totalPrice: newTotal, players: newPlayers, createdAt: new Date() });
                yield squadCol.insertOne(newSquad, { session });
            }));
        }
        finally {
            yield session.endSession();
            yield client.close();
        }
    });
}
// Example usage
if (require.main === module) {
    makeTransfer({
        userId: 'HarouneTest',
        playerOut: { name: 'Omar Arjoune', club: 'Difaâ Hassani El-Jadidi' },
        playerIn: { name: 'New Player', club: 'Difaâ Hassani El-Jadidi' }
    }).catch(console.error);
}
