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
exports.createStartingEleven = createStartingEleven;
const mongodb_1 = require("mongodb");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const uri = process.env.MONGODB_URI;
const client = new mongodb_1.MongoClient(uri);
const CURRENT_GAMEWEEK = parseInt(process.env.GAMEWEEK, 10);
const DB_NAME = 'FantasyBotola';
const USER_SQUAD_COLLECTION = `UserSquad${CURRENT_GAMEWEEK}`;
const STARTING_ELEVEN = `StartingTeam${CURRENT_GAMEWEEK}`;
function createStartingEleven(userId, playerNames) {
    return __awaiter(this, void 0, void 0, function* () {
        yield client.connect();
        const db = client.db(DB_NAME);
        try {
            // 1) Fetch the user's current gameweek squad
            const squadsCol = db.collection(USER_SQUAD_COLLECTION);
            const userSquad = yield squadsCol.findOne({ userId });
            if (!userSquad) {
                throw new Error(`User squad for GW${CURRENT_GAMEWEEK} not found for userId ${userId}`);
            }
            // 2) Validate player names against the TRANSFERRED squad
            const selectedPlayers = userSquad.players.filter(p => playerNames.includes(p.name));
            if (selectedPlayers.length !== 11) {
                const invalidNames = playerNames.filter(name => !userSquad.players.some(p => p.name === name));
                throw new Error(`Invalid selection: ${invalidNames.join(', ')} not in GW${CURRENT_GAMEWEEK} squad`);
            }
            // 3) Validate position requirements
            const positionCounts = { GK: 0, DEF: 0, MID: 0, FWD: 0 };
            selectedPlayers.forEach(p => positionCounts[p.position]++);
            if (positionCounts.GK !== 1)
                throw new Error('Must select exactly 1 GK');
            if (positionCounts.DEF < 3)
                throw new Error('Minimum 3 DEF required');
            if (positionCounts.MID < 2)
                throw new Error('Minimum 2 MID required');
            if (positionCounts.FWD < 1)
                throw new Error('Minimum 1 FWD required');
            // 4) Create starting eleven document
            const startingElevenDoc = {
                userId,
                gameweek: CURRENT_GAMEWEEK,
                totalPrice: selectedPlayers.reduce((sum, p) => sum + p.fantasyPrice, 0),
                startingEleven: selectedPlayers.map(p => ({
                    name: p.name,
                    club: p.club,
                    position: p.position,
                })),
                createdAt: new Date()
            };
            // 5) Store in current gameweek's starting eleven collection
            const startingElevenCol = db.collection(STARTING_ELEVEN);
            yield startingElevenCol.insertOne(startingElevenDoc);
            console.log(`GW${CURRENT_GAMEWEEK} starting eleven created for ${userId}`);
            return startingElevenDoc;
        }
        finally {
            yield client.close();
        }
    });
}
// Example usage
if (require.main === module) {
    const examplePlayers = [
        'Mourad Abdelwadie',
        'Mehdi Attouchi',
        'Hamza El Belghyty',
        'Jad Assouab',
        'Mehdi Khallati',
        'Badreddine Octobre',
        'Adil El Hassnaoui',
        'Oussama Benchchaoui',
        'Omar Arjoune',
        'Anas Samoudi',
        'Ayoub Lakhal'
    ];
    createStartingEleven('HarouneTest', examplePlayers)
        .then(() => console.log('Starting team set!'))
        .catch(console.error);
}
