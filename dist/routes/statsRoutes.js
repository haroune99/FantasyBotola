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
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const mongodb_1 = require("mongodb");
const uri = process.env.MONGODB_URI;
const client = new mongodb_1.MongoClient(uri);
const DB_NAME = 'FantasyBotola';
const CURRENT_GAMEWEEK = parseInt(process.env.GAMEWEEK, 10);
const PLAYERVALUE_COLLECTION = `PlayerValue${CURRENT_GAMEWEEK}`;
const valuePlayers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield client.connect();
        const name = req.params.name;
        const playerValue = yield client.db(DB_NAME)
            .collection(PLAYERVALUE_COLLECTION)
            .findOne({ name });
        if (!playerValue) {
            res.status(404).json({ error: 'Player not found' });
            return;
        }
        res.json(playerValue);
    }
    catch (error) {
        console.error('Error fetching player value:', error);
        res.status(500).json({ error: 'Failed to fetch player value' });
    }
});
const router = (0, express_1.Router)();
router.get('/stats/:name', valuePlayers);
exports.default = router;
