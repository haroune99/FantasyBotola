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
exports.calculateGameweekData = calculateGameweekData;
const data_1 = require("./data");
const mongodb_1 = require("mongodb"); // Import Db type
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const CURRENT_GAMEWEEK = parseInt(process.env.GAMEWEEK, 10);
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        const uri = process.env.MONGODB_URI;
        const client = new mongodb_1.MongoClient(uri);
        try {
            yield client.connect();
            const database = client.db('FantasyBotola');
            // Get all player data
            const [forwardData, midfieldData, defenseGkData] = yield Promise.all([
                data_1.forwardDataPromise,
                data_1.midfieldDataPromise,
                data_1.defenseGkDataPromise
            ]);
            // Update position-specific collections
            yield updatePositionCollection(database, 'forwards', forwardData);
            yield updatePositionCollection(database, 'midfielders', midfieldData);
            yield updatePositionCollection(database, 'defenders_goalkeepers', defenseGkData);
            // Rest of your existing gameweek processing code
            const allData = [...forwardData, ...midfieldData, ...defenseGkData];
            const gameweekCollection = database.collection(`gameweek${CURRENT_GAMEWEEK}`);
            const gameweekData = yield processGameweekData(database, allData);
            yield gameweekCollection.deleteMany({});
            yield gameweekCollection.insertMany(gameweekData);
            console.log(`Gameweek ${CURRENT_GAMEWEEK} data stored successfully`);
        }
        catch (error) {
            console.error('Error:', error);
        }
        finally {
            yield client.close();
        }
    });
}
// New function to handle position-specific updates
function updatePositionCollection(database, collectionName, data) {
    return __awaiter(this, void 0, void 0, function* () {
        const collection = database.collection(collectionName);
        try {
            const bulkOps = data.map(player => ({
                updateOne: {
                    filter: { 'player.id': player.player.id },
                    update: { $set: player },
                    upsert: true
                }
            }));
            const result = yield collection.bulkWrite(bulkOps);
            console.log(`${collectionName} updated: ${result.upsertedCount} inserted, ${result.modifiedCount} updated`);
        }
        catch (error) {
            console.error(`Error updating ${collectionName}:`, error);
            throw error;
        }
    });
}
// Add proper typing for database parameter
function processGameweekData(database, allData) {
    return __awaiter(this, void 0, void 0, function* () {
        const playersCollection = database.collection('players');
        const existingPlayers = yield playersCollection.find().toArray();
        // Fix type for the Map
        const existingMap = new Map(existingPlayers.map((p) => [p.player.id, p]));
        const gameweekData = [];
        for (const newStat of allData) {
            const existing = existingMap.get(newStat.player.id);
            // Update persistent player stats
            yield playersCollection.updateOne({ 'player.id': newStat.player.id }, { $set: newStat }, { upsert: true });
            // Handle new players properly
            if (existing) {
                gameweekData.push(calculateGameweekData(existing, newStat));
            }
            else {
                // For new players, use current stats as first gameweek data
                gameweekData.push(newStat);
            }
        }
        return gameweekData;
    });
}
// Ensure calculateGameweekData has proper typing
function calculateGameweekData(existingStat, newStat) {
    // Create base object with latest player/team info
    const gameweekStat = Object.assign(Object.assign({}, newStat), { player: Object.assign({}, newStat.player), team: Object.assign({}, newStat.team) });
    // Now calculate differences for numeric fields
    const numericKeys = [
        'goals', 'assists', 'penaltyWon', 'yellowCards', 'redCards',
        'minutesPlayed', 'cleanSheet', 'penaltiesTaken', 'penaltyGoals',
        'goalsConcededOutsideTheBox', 'goalsConcededInsideTheBox', 'ownGoals'
    ];
    for (const key of numericKeys) {
        const typedKey = key;
        const existingValue = existingStat[typedKey] || 0;
        const newValue = newStat[typedKey] || 0;
        if (typeof newValue === 'number' && typeof existingValue === 'number') {
            gameweekStat[typedKey] = newValue - existingValue;
        }
    }
    return gameweekStat;
}
run().catch(console.error);
