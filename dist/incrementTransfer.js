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
dotenv_1.default.config();
const uri = process.env.MONGODB_URI;
const client = new mongodb_1.MongoClient(uri);
const CURRENT_GAMEWEEK = parseInt(process.env.GAMEWEEK, 10);
function incrementTransfers() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield client.connect();
            const db = client.db('FantasyBotola');
            // 1. Get all active users
            const squadCol = db.collection(`UserSquad${CURRENT_GAMEWEEK}`);
            const userIds = yield squadCol.distinct('userId');
            // 2. Process each user's transfer state
            const transferStateCol = db.collection('UserTransferState');
            let totalUpdated = 0;
            const nextGameweek = CURRENT_GAMEWEEK + 1;
            for (const userId of userIds) {
                // 3. Update transfer state atomically
                const result = yield transferStateCol.updateOne({ userId }, {
                    $inc: { availableTransfers: 1 },
                    $set: { lastGameweekUpdated: nextGameweek },
                    $setOnInsert: { maxSavedTransfers: 2 }
                }, { upsert: true });
                // 4. Cap at maximum 2 transfers
                yield transferStateCol.updateOne({ userId, availableTransfers: { $gt: 2 } }, { $set: { availableTransfers: 2 } });
                if (result.modifiedCount > 0)
                    totalUpdated++;
            }
            console.log(`Successfully updated transfers for ${totalUpdated}/${userIds.length} users`);
            console.log(`Next gameweek: ${nextGameweek}`);
        }
        catch (error) {
            console.error('Error updating transfers:', error);
        }
        finally {
            yield client.close();
        }
    });
}
incrementTransfers();
