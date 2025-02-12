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
exports.makeTransfer = makeTransfer;
const mongodb_1 = require("mongodb");
const dotenv_1 = __importDefault(require("dotenv"));
const team_1 = require("./team");
dotenv_1.default.config();
const uri = process.env.MONGODB_URI;
const client = new mongodb_1.MongoClient(uri);
const CURRENT_GAMEWEEK = parseInt(process.env.GAMEWEEK, 10);
const DB_NAME = 'FantasyBotola';
const PLAYER_COLLECTION = `PlayerValue${CURRENT_GAMEWEEK}`; // Current GW player values
const CURRENT_SQUAD_COLLECTION = `UserSquad${CURRENT_GAMEWEEK - 1}`; // Current GW squad
const NEXT_SQUAD_COLLECTION = `UserSquad${CURRENT_GAMEWEEK}`; // Same GW squad
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
                // 4. Get squad for next gameweek if it exists
                const nextSquadCol = db.collection(NEXT_SQUAD_COLLECTION);
                let nextSquad = yield nextSquadCol.findOne({ userId: request.userId }, { session });
                // 5. If no next GW squad exists, clone from current GW
                if (!nextSquad) {
                    const currentSquad = yield db.collection(CURRENT_SQUAD_COLLECTION)
                        .findOne({ userId: request.userId }, { session });
                    if (!currentSquad) {
                        throw new Error(`Current squad not found for GW${CURRENT_GAMEWEEK}`);
                    }
                    nextSquad = Object.assign(Object.assign({}, currentSquad), { _id: new mongodb_1.ObjectId(), gameweek: CURRENT_GAMEWEEK + 1, createdAt: new Date() });
                    yield nextSquadCol.insertOne(nextSquad, { session });
                    console.log(`Created new squad for GW${CURRENT_GAMEWEEK}`);
                }
                // 6. Validate transfer parameters
                const playerOut = nextSquad.players.find(p => p.name === request.playerOut.name && p.club === request.playerOut.club);
                if (!playerOut) {
                    throw new Error('Player to transfer out not found in squad');
                }
                const playersCol = db.collection(PLAYER_COLLECTION);
                const playerIn = yield playersCol.findOne({ name: request.playerIn.name, club: request.playerIn.club }, { session });
                if (!playerIn) {
                    throw new Error('Player to transfer in not found in database');
                }
                // 7. Validate transfer constraints
                if (playerOut.position !== playerIn.position) {
                    throw new Error('Position mismatch between players');
                }
                const newTotal = nextSquad.totalPrice - playerOut.fantasyPrice + playerIn.fantasyPrice;
                if (newTotal > 100) {
                    throw new Error(`Budget exceeded: ${newTotal}M > 100M`);
                }
                const currentClubCount = nextSquad.players.filter(p => p.club === playerIn.club).length;
                if (currentClubCount - (playerOut.club === playerIn.club ? 1 : 0) >= 3) {
                    throw new Error(`Club limit exceeded for ${playerIn.club}`);
                }
                // 8. Apply transfer
                const newPlayers = nextSquad.players.map(p => p === playerOut ? playerIn : p);
                (0, team_1.validateSquad)(newPlayers);
                // 9. Update transfer state and squad
                yield transferStateCol.updateOne({ _id: transferState._id }, { $inc: { availableTransfers: -1 } }, { session });
                yield nextSquadCol.updateOne({ _id: nextSquad._id }, {
                    $set: {
                        players: newPlayers,
                        totalPrice: newTotal
                    }
                }, { session });
                console.log(`Transfer completed for GW${CURRENT_GAMEWEEK + 1}`);
                console.log(`OUT: ${playerOut.name} (${playerOut.club})`);
                console.log(`IN: ${playerIn.name} (${playerIn.club})`);
                console.log(`New squad total: ${newTotal}M`);
            }));
        }
        catch (error) {
            console.error('Transfer failed:', error);
            throw error;
        }
        finally {
            yield session.endSession();
            yield client.close();
        }
    });
}
// Example usage for testing
if (require.main === module) {
    console.log(`Making transfer for GW${CURRENT_GAMEWEEK} using GW${CURRENT_GAMEWEEK - 1} squad as base`);
    makeTransfer({
        userId: 'HarouneTest',
        playerOut: { name: 'Abdoul Draman Ouedraogo', club: 'Olympic Safi' },
        playerIn: { name: 'Ayoub Lakhal', club: 'Moghreb Atlético Tetuán' }
    }).catch(console.error);
}
