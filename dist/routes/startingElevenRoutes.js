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
const express_1 = require("express");
const startingEleven_1 = require("../startingEleven");
const mongodb_1 = require("mongodb");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const uri = process.env.MONGODB_URI;
const client = new mongodb_1.MongoClient(uri);
const DB_NAME = 'FantasyBotola';
const CURRENT_GAMEWEEK = parseInt(process.env.GAMEWEEK, 10);
const STARTING_ELEVEN = `StartingTeam${CURRENT_GAMEWEEK}`;
const router = (0, express_1.Router)();
router.get('/starting-eleven/:userId', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId } = req.params;
    try {
        yield client.connect();
        const db = client.db(DB_NAME);
        const startingElevenCol = db.collection(STARTING_ELEVEN);
        const startingEleven = yield startingElevenCol.findOne({ userId });
        if (!startingEleven) {
            res.status(404).json({ error: `Starting eleven not found for userId ${userId}` });
            return;
        }
        res.status(200).json(startingEleven);
    }
    catch (error) {
        console.error('Error fetching starting eleven:', error);
        res.status(500).json({ error: 'Failed to fetch starting eleven' });
    }
    finally {
        yield client.close();
    }
}));
const teamSelectionHandler = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId, playerNames } = req.body;
        if (!userId || !playerNames) {
            res.status(400).json({
                error: 'Missing required fields: userId and playerNames'
            });
            return;
        }
        yield (0, startingEleven_1.createStartingEleven)(userId, playerNames);
        res.status(200).json({ message: 'Starting team set!' });
    }
    catch (error) {
        console.error('Error setting starting team:', error);
        res.status(500).json({
            error: 'Failed to set starting team'
        });
    }
});
router.post('/team-selection', teamSelectionHandler);
exports.default = router;
