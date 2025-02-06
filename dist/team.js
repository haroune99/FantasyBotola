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
exports.createUserSquad = createUserSquad;
exports.validateSquad = validateSquad;
const mongodb_1 = require("mongodb");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const uri = process.env.MONGODB_URI;
const client = new mongodb_1.MongoClient(uri);
const CURRENT_GAMEWEEK = parseInt(process.env.GAMEWEEK, 10);
const DB_NAME = 'FantasyBotola';
const PLAYER_COLLECTION_NAME = `PlayerValue${CURRENT_GAMEWEEK}`;
const USER_SQUAD_COLLECTION = `UserSquad${CURRENT_GAMEWEEK}`;
// --- Helper: Validate the squad meets constraints
function validateSquad(players) {
    if (players.length !== 15) {
        throw new Error('Squad must contain exactly 15 players.');
    }
    // Tally positions & clubs
    const positionCounts = { GK: 0, DEF: 0, MID: 0, FWD: 0 };
    const clubCounts = {};
    let totalPrice = 0;
    for (const p of players) {
        if (!(p.position in positionCounts)) {
            throw new Error(`Invalid position: ${p.position}`);
        }
        positionCounts[p.position]++;
        if (!clubCounts[p.club])
            clubCounts[p.club] = 0;
        clubCounts[p.club]++;
        totalPrice += p.fantasyPrice;
    }
    if (positionCounts.GK !== 2) {
        throw new Error(`Need exactly 2 GK. Found ${positionCounts.GK}`);
    }
    if (positionCounts.DEF !== 5) {
        throw new Error(`Need exactly 5 DEF. Found ${positionCounts.DEF}`);
    }
    if (positionCounts.MID !== 5) {
        throw new Error(`Need exactly 5 MID. Found ${positionCounts.MID}`);
    }
    if (positionCounts.FWD !== 3) {
        throw new Error(`Need exactly 3 FWD. Found ${positionCounts.FWD}`);
    }
    for (const club in clubCounts) {
        if (clubCounts[club] > 3) {
            throw new Error(`Cannot have more than 3 players from club ${club}`);
        }
    }
    if (totalPrice > 100) {
        throw new Error(`Squad price exceeds 100M. Found ${totalPrice}M`);
    }
}
function createUserSquad(userId, playerSelections) {
    return __awaiter(this, void 0, void 0, function* () {
        if (playerSelections.length !== 15) {
            throw new Error('Must provide exactly 15 player selections (name and club).');
        }
        yield client.connect();
        const db = client.db(DB_NAME);
        try {
            const collection = db.collection(PLAYER_COLLECTION_NAME);
            const query = playerSelections.map(({ name, club }) => ({ name, club }));
            const players = yield collection
                .find({ $or: query })
                .toArray();
            if (players.length !== 15) {
                const foundNames = players.map(p => `${p.name} (${p.club})`);
                throw new Error(`Could not find all 15 players by name and club. Found these: ${foundNames.join(', ')}`);
            }
            validateSquad(players);
            const totalPrice = players.reduce((sum, p) => sum + p.fantasyPrice, 0);
            const userSquad = {
                userId,
                gameweek: CURRENT_GAMEWEEK,
                totalPrice,
                players,
                createdAt: new Date()
            };
            const squadsCol = db.collection(USER_SQUAD_COLLECTION);
            yield squadsCol.insertOne(userSquad);
            console.log(`User squad created for userId=${userId}, totalPrice=${totalPrice}`);
            return userSquad;
        }
        finally {
            yield client.close();
        }
    });
}
// Example usage if you run `ts-node createUserSquad.ts` directly
if (require.main === module) {
    const exampleSelections = [
        { name: 'Mourad Abdelwadie', club: 'SC Chabab Mohammédia' },
        { name: 'Oussama Errahmany', club: 'SC Chabab Mohammédia' },
        { name: 'Yasser Machouat', club: 'SC Chabab Mohammédia' },
        { name: 'Jad Assouab', club: 'Jeunesse Sportive Soualem' },
        { name: 'Mehdi Khallati', club: 'Jeunesse Sportive Soualem' },
        { name: 'Mehdi Attouchi', club: 'Jeunesse Sportive Soualem' },
        { name: 'Oussama Benchchaoui', club: 'Difaâ Hassani El-Jadidi' },
        { name: 'Omar Arjoune', club: 'Difaâ Hassani El-Jadidi' },
        { name: 'Adil El Hassnaoui', club: 'Difaâ Hassani El-Jadidi' },
        { name: 'Zakaria Ami', club: "Hassania d'Agadir" },
        { name: 'Badreddine Octobre', club: "Hassania d'Agadir" },
        { name: 'Hamza El Belghyty', club: "Hassania d'Agadir" },
        { name: 'Zakaria Habti', club: 'Olympic Safi' },
        { name: 'Anas Samoudi', club: 'Olympic Safi' },
        { name: 'Abdoul Draman Ouedraogo', club: 'Olympic Safi' },
    ];
    createUserSquad('HarouneTest', exampleSelections)
        .then((squad) => {
        console.log('Squad created successfully:', squad);
    })
        .catch((err) => {
        console.error('Error creating squad:', err.message);
    });
}
