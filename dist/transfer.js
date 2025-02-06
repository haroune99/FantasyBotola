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
                const db = client.db(DB_NAME);
                // 1. Get or create transfer state with proper typing
                const transferStateCol = db.collection(USER_TRANSFER_STATE_COLLECTION);
                const transferResult = yield transferStateCol.findOneAndUpdate({ userId: request.userId }, {
                    $setOnInsert: {
                        availableTransfers: 1,
                        maxSavedTransfers: 2,
                        lastGameweekUpdated: CURRENT_GAMEWEEK
                    }
                }, {
                    upsert: true,
                    returnDocument: 'after',
                    session
                });
                // Handle null result case
                if (!transferResult) {
                    throw new Error('Failed to initialize transfer state');
                }
                // 2. Type guard for WithId<Document>
                const transferState = transferResult;
                // 3. Validate available transfers
                if (transferState.availableTransfers < 1) {
                    throw new Error('No transfers available');
                }
                // 3. Get current squad for NEXT gameweek
                const squadCol = db.collection(`UserSquad${CURRENT_GAMEWEEK + 1}`);
                let currentSquad = yield squadCol.findOne({ userId: request.userId }, { session });
                // 4. Clone squad if no next GW squad exists
                if (!currentSquad) {
                    const currentGwSquad = yield db.collection(USER_SQUAD_COLLECTION)
                        .findOne({ userId: request.userId }, { session });
                    if (!currentGwSquad)
                        throw new Error('Current squad not found');
                    currentSquad = Object.assign(Object.assign({}, currentGwSquad), { _id: new mongodb_1.ObjectId(), gameweek: CURRENT_GAMEWEEK + 1, createdAt: new Date() });
                    yield squadCol.insertOne(currentSquad, { session });
                }
                // 5. Validate transfer parameters
                const playerOut = currentSquad.players.find(p => p.name === request.playerOut.name && p.club === request.playerOut.club);
                if (!playerOut)
                    throw new Error('Player not in squad');
                const playersCol = db.collection(PLAYER_COLLECTION);
                const playerIn = yield playersCol.findOne({ name: request.playerIn.name, club: request.playerIn.club }, { session });
                if (!playerIn)
                    throw new Error('Player not found');
                // 6. Validate transfer constraints
                if (playerOut.position !== playerIn.position) {
                    throw new Error('Position mismatch');
                }
                const newTotal = currentSquad.totalPrice - playerOut.fantasyPrice + playerIn.fantasyPrice;
                if (newTotal > 100)
                    throw new Error('Budget exceeded');
                const currentClubCount = currentSquad.players.filter(p => p.club === playerIn.club).length;
                if (currentClubCount - (playerOut.club === playerIn.club ? 1 : 0) >= 3) {
                    throw new Error('Club limit exceeded');
                }
                // 7. Apply transfer and update state
                const newPlayers = currentSquad.players.map(p => p === playerOut ? playerIn : p);
                (0, team_1.validateSquad)(newPlayers);
                yield transferStateCol.updateOne({ _id: transferState._id }, { $inc: { availableTransfers: -1 } }, { session });
                yield squadCol.updateOne({ _id: currentSquad._id }, { $set: { players: newPlayers, totalPrice: newTotal } }, { session });
            }));
        }
        finally {
            yield session.endSession();
            yield client.close();
        }
    });
}
// Export for testing
if (require.main === module) {
    makeTransfer({
        userId: 'HarouneTest',
        playerOut: { name: 'Omar Arjoune', club: 'Difaâ Hassani El-Jadidi' },
        playerIn: { name: 'Amine Zouhzouh', club: 'AS FAR Rabat' }
    }).catch(console.error);
}
