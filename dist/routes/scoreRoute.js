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
const mongodb_1 = require("mongodb");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const uri = process.env.MONGODB_URI;
const client = new mongodb_1.MongoClient(uri);
const CURRENT_GAMEWEEK = parseInt(process.env.GAMEWEEK, 10);
const DB_NAME = 'FantasyBotola';
const STARTING_TEAM_COLLECTION = `StartingTeam${CURRENT_GAMEWEEK}`;
const GAMEWEEK_COLLECTION = `gameweek${CURRENT_GAMEWEEK}`;
const getScore = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        yield client.connect();
        const userId = req.params.userId;
        const playerId = req.query.playerId;
        const userSquad = yield client.db(DB_NAME)
            .collection(STARTING_TEAM_COLLECTION)
            .findOne({ userId });
        if (!userSquad) {
            res.status(404).json({ error: 'User squad not found' });
            return;
        }
        // If playerId is provided, return only that player's score
        if (playerId) {
            const playerScore = (_a = userSquad.playerScores) === null || _a === void 0 ? void 0 : _a.find((p) => p.player === playerId);
            if (!playerScore) {
                res.status(404).json({ error: 'Player not found in squad' });
                return;
            }
            res.json(playerScore);
            return;
        }
        // Calculate total score
        const totalScore = ((_b = userSquad.playerScores) === null || _b === void 0 ? void 0 : _b.reduce((sum, player) => sum + player.score, 0)) || 0;
        res.json({
            playerScores: userSquad.playerScores || [],
            totalScore
        });
    }
    catch (error) {
        console.error('Error fetching player score:', error);
        res.status(500).json({ error: 'Failed to fetch player score' });
    }
    finally {
        yield client.close();
    }
});
const router = (0, express_1.Router)();
router.get('/score/:userId', getScore);
exports.default = router;
