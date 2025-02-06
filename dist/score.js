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
exports.scorePlayers = scorePlayers;
const mongodb_1 = require("mongodb");
const dotenv_1 = __importDefault(require("dotenv"));
const fuzzyset_js_1 = __importDefault(require("fuzzyset.js"));
const mongodb_2 = require("mongodb");
dotenv_1.default.config();
const uri = process.env.MONGODB_URI;
const client = new mongodb_1.MongoClient(uri);
const CURRENT_GAMEWEEK = parseInt(process.env.GAMEWEEK, 10);
const DB_NAME = 'FantasyBotola';
const STARTING_TEAM_COLLECTION = `StartingTeam${CURRENT_GAMEWEEK}`;
const GAMEWEEK_COLLECTION = `gameweek${CURRENT_GAMEWEEK}`;
// Define scoring rules
const scoringRules = {
    minutesPlayed: { upTo60: 1, moreThan60: 2 },
    goals: { GK: 10, DEF: 6, MID: 5, FWD: 4 },
    assists: 3,
    cleanSheet: { GK_DEF: 4, MID: 1 },
    penaltyMiss: -2,
    yellowCard: -1,
    redCard: -3,
    ownGoal: -2
};
function scorePlayers(startingTeams) {
    return __awaiter(this, void 0, void 0, function* () {
        yield client.connect();
        const db = client.db(DB_NAME);
        try {
            for (const startingTeam of startingTeams) {
                const players = startingTeam.startingEleven;
                // Build fuzzy set for player names in the gameweek collection
                const gameweekPlayers = yield db.collection(GAMEWEEK_COLLECTION)
                    .distinct('player.name');
                const fuzzyGameweekPlayers = (0, fuzzyset_js_1.default)(gameweekPlayers);
                // Fetch gameweek stats for each player
                const statsPromises = players.map((player) => __awaiter(this, void 0, void 0, function* () {
                    const collection = db.collection(GAMEWEEK_COLLECTION);
                    // Try to find matching player stats based on fuzzy matching of name and exact match for team
                    let stats = null;
                    const fuzzyMatches = fuzzyGameweekPlayers.get(player.name);
                    if (fuzzyMatches && fuzzyMatches[0] && fuzzyMatches[0][0] > 0.5) {
                        stats = yield collection.findOne({
                            'player.name': fuzzyMatches[0][1],
                            'team.name': { $regex: escapeRegExp(player.club), $options: 'i' }
                        });
                    }
                    // Ensure stats are valid numbers or default to zero
                    if (!stats) {
                        stats = { goals: 0, assists: 0, minutesPlayed: 0, yellowCards: 0, redCards: 0, cleanSheet: false, penaltyMiss: 0, ownGoals: 0 };
                    }
                    else {
                        // Convert numeric fields to numbers or default to zero
                        stats.goals = Number(stats.goals) || 0;
                        stats.assists = Number(stats.assists) || 0;
                        stats.minutesPlayed = Number(stats.minutesPlayed) || 0;
                        stats.yellowCards = Number(stats.yellowCards) || 0;
                        stats.redCards = Number(stats.redCards) || 0;
                        stats.penaltyMiss = Number(stats.penaltyMiss) || 0;
                        stats.ownGoals = Number(stats.ownGoals) || 0;
                    }
                    return stats;
                }));
                // Resolve all promises to get stats for all players
                const playerStats = yield Promise.all(statsPromises);
                // Calculate scores
                const playerScores = playerStats.map((stats, index) => {
                    let score = 0;
                    // Minutes played
                    if (stats.minutesPlayed > 0) {
                        if (stats.minutesPlayed >= 60) {
                            score += scoringRules.minutesPlayed.moreThan60;
                        }
                        else {
                            score += scoringRules.minutesPlayed.upTo60;
                        }
                    }
                    // Goals
                    if (stats.goals > 0) {
                        switch (players[index].position) {
                            case 'GK':
                                score += stats.goals * scoringRules.goals.GK;
                                break;
                            case 'DEF':
                                score += stats.goals * scoringRules.goals.DEF;
                                break;
                            case 'MID':
                                score += stats.goals * scoringRules.goals.MID;
                                break;
                            case 'FWD':
                                score += stats.goals * scoringRules.goals.FWD;
                                break;
                            default:
                                break;
                        }
                    }
                    // Assists
                    score += stats.assists * scoringRules.assists;
                    // Clean sheet
                    if (stats.cleanSheet) {
                        if (players[index].position === 'GK' || players[index].position === 'DEF') {
                            score += scoringRules.cleanSheet.GK_DEF;
                        }
                        else if (players[index].position === 'MID') {
                            score += scoringRules.cleanSheet.MID;
                        }
                    }
                    // Penalty miss, yellow card, red card, own goal
                    score += stats.penaltyMiss * scoringRules.penaltyMiss;
                    score += stats.yellowCards * scoringRules.yellowCard;
                    score += stats.redCards * scoringRules.redCard;
                    score += stats.ownGoals * scoringRules.ownGoal;
                    return { player: players[index].name, score };
                });
                // Handle players with no stats found
                players.forEach((player, index) => {
                    const foundStats = playerStats[index];
                    if (!foundStats) {
                        playerScores.push({ player: player.name, score: 0 });
                    }
                });
                // Log player scores for debugging
                console.log('Player Scores:', playerScores);
                // Update scores in the database
                const startingTeamCol = db.collection(STARTING_TEAM_COLLECTION);
                const updateResult = yield startingTeamCol.updateOne({ _id: new mongodb_2.ObjectId(startingTeam._id) }, // Convert to ObjectId
                { $set: { playerScores } });
                if (updateResult.modifiedCount === 1) {
                    console.log(`Scores updated for team with userId=${startingTeam.userId}`);
                }
                else {
                    console.log(`Failed to update scores for team with userId=${startingTeam.userId}`);
                }
            }
        }
        catch (error) {
            console.error('Error scoring players:', error);
        }
        finally {
            yield client.close();
        }
    });
}
// Escape special characters for regex
function escapeRegExp(text) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}
// Example usage if you run `ts-node score.ts` directly
if (require.main === module) {
    // Example startingTeam data
    const exampleStartingTeams = [
        {
            _id: new mongodb_2.ObjectId("67a36ef01400733632c9f95a"),
            userId: "HarouneTest",
            gameweek: 19,
            totalPrice: 52.5,
            startingEleven: [
                { name: 'Omar Arjoune', club: 'Difaâ Hassani El-Jadidi', position: 'MID' },
                { name: 'Jad Assouab', club: 'Jeunesse Sportive Soualem', position: 'DEF' },
                { name: 'Mourad Abdelwadie', club: 'SC Chabab Mohammédia', position: 'GK' },
                { name: 'Oussama Benchchaoui', club: 'Difaâ Hassani El-Jadidi', position: 'DEF' },
                { name: 'Adil El Hassnaoui', club: 'Difaâ Hassani El-Jadidi', position: 'MID' },
                { name: 'Anas Samoudi', club: 'Olympic Safi', position: 'FWD' },
                { name: 'Mehdi Khallati', club: 'Jeunesse Sportive Soualem', position: 'DEF' },
                { name: 'Mehdi Attouchi', club: 'Jeunesse Sportive Soualem', position: 'DEF' },
                { name: 'Abdoul Draman Ouedraogo', club: 'Olympic Safi', position: 'FWD' },
                { name: 'Badreddine Octobre', club: 'Hassania d\'Agadir', position: 'MID' },
                { name: 'Hamza El Belghyty', club: 'Hassania d\'Agadir', position: 'MID' }
            ],
            createdAt: new Date(1738764016106)
        }
    ];
    scorePlayers(exampleStartingTeams)
        .then(() => {
        console.log('Scoring completed successfully.');
    })
        .catch((err) => {
        console.error('Error scoring players:', err);
    });
}
