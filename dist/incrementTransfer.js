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
// incrementTransfers.ts
const mongodb_1 = require("mongodb");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const uri = process.env.MONGODB_URI;
const client = new mongodb_1.MongoClient(uri);
const CURRENT_GAMEWEEK = parseInt(process.env.GAMEWEEK, 10);
function incrementTransfers() {
    return __awaiter(this, void 0, void 0, function* () {
        yield client.connect();
        const db = client.db('FantasyBotola');
        const col = db.collection('UserTransferState');
        const result = yield col.updateMany({ lastGameweekUpdated: { $lt: CURRENT_GAMEWEEK } }, [
            {
                $inc: { availableTransfers: 1 },
                $set: { lastGameweekUpdated: CURRENT_GAMEWEEK }
            },
            {
                $set: {
                    availableTransfers: {
                        $min: [
                            '$availableTransfers',
                            { $ifNull: ['$maxSavedTransfers', 2] }
                        ]
                    }
                }
            }
        ]);
        console.log(`Updated ${result.modifiedCount} users`);
    });
}
incrementTransfers().finally(() => client.close());
