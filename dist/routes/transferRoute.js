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
const transfer_1 = require("../transfer");
const mongodb_1 = require("mongodb");
const uri = process.env.MONGODB_URI;
const client = new mongodb_1.MongoClient(uri);
const DB_NAME = 'FantasyBotola';
const CURRENT_GAMEWEEK = parseInt(process.env.GAMEWEEK, 10);
const TRANSFERSTATECOLLECTION = `UserTransferState`;
const router = (0, express_1.Router)();
const checkTransfer = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield client.connect();
        const userId = req.params.userId;
        const availableTransfers = yield client.db(DB_NAME)
            .collection(TRANSFERSTATECOLLECTION)
            .findOne({ userId });
        if (!availableTransfers) {
            res.status(404).json({ error: 'User not found' });
            return;
        }
        res.json(availableTransfers);
    }
    catch (error) {
        console.error('Error fetching the userId:', error);
        res.status(500).json({ error: 'Failed to fetch Transfer State' });
    }
});
const transferHandler = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId, playerOut, playerIn } = req.body;
        if (!userId || !(playerOut === null || playerOut === void 0 ? void 0 : playerOut.name) || !(playerOut === null || playerOut === void 0 ? void 0 : playerOut.club) || !(playerIn === null || playerIn === void 0 ? void 0 : playerIn.name) || !(playerIn === null || playerIn === void 0 ? void 0 : playerIn.club)) {
            res.status(400).json({
                error: 'Missing required fields: userId, playerOut (name, club), and playerIn (name, club)'
            });
            return;
        }
        yield (0, transfer_1.makeTransfer)({ userId, playerOut, playerIn });
        res.status(200).json({ message: 'Transfer made successfully' });
    }
    catch (error) {
        console.error('Error making transfer:', error);
        res.status(500).json({
            error: 'Failed to make transfer'
        });
    }
});
router.get('/transfer/:userId', checkTransfer);
router.post('/transfer/:userId', transferHandler);
exports.default = router;
