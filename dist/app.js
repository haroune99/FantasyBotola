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
const express_1 = __importDefault(require("express"));
const startingEleven_1 = require("./startingEleven");
const app = (0, express_1.default)();
const PORT = 3000;
// Add body-parser middleware
app.use(express_1.default.json());
app.get('/team-selection', () => {
    console.log('team-selection');
});
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
app.post('/team-selection', teamSelectionHandler);
app.get('/', (req, res) => {
    res.send('Welcome to the Botola Fantas App!!!!');
});
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
