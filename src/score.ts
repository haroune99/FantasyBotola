import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import FuzzySet from 'fuzzyset.js';
import { ObjectId } from 'mongodb';

dotenv.config();

const uri = process.env.MONGODB_URI as string;
const client = new MongoClient(uri);
const CURRENT_GAMEWEEK = parseInt(process.env.GAMEWEEK as string, 10);

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

interface StartingTeamDoc {
    _id: ObjectId;
    userId: string;
    gameweek: number;
    totalPrice: number;
    startingEleven: { name: string; club: string; position: string }[];
    createdAt: Date;
}

interface GameweekStatsDoc {
    _id: string;
    goals: number;
    assists: number;
    minutesPlayed: number;
    yellowCards: number;
    redCards: number;
    cleanSheet: boolean;
    penaltyMiss: number;
    ownGoals: number;
    player: { name: string };
    team: { name: string };
}

async function scorePlayers(startingTeams: StartingTeamDoc[]): Promise<void> {
    await client.connect();
    const db = client.db(DB_NAME);

    try {
        for (const startingTeam of startingTeams) {
            const players = startingTeam.startingEleven;

            // Build fuzzy set for player names in the gameweek collection
            const gameweekPlayers = await db.collection(GAMEWEEK_COLLECTION)
                .distinct('player.name');
            const fuzzyGameweekPlayers = FuzzySet(gameweekPlayers);

            // Fetch gameweek stats for each player
            const statsPromises = players.map(async (player) => {
                const collection = db.collection<GameweekStatsDoc>(GAMEWEEK_COLLECTION);

                // Try to find matching player stats based on fuzzy matching of name and exact match for team
                let stats = null;
                const fuzzyMatches = fuzzyGameweekPlayers.get(player.name);
                if (fuzzyMatches && fuzzyMatches[0] && fuzzyMatches[0][0] > 0.5) {
                    stats = await collection.findOne({
                        'player.name': fuzzyMatches[0][1],
                        'team.name': { $regex: escapeRegExp(player.club), $options: 'i' }
                    });
                }

                // Ensure stats are valid numbers or default to zero
                if (!stats) {
                    stats = { goals: 0, assists: 0, minutesPlayed: 0, yellowCards: 0, redCards: 0, cleanSheet: false, penaltyMiss: 0, ownGoals: 0 };
                } else {
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
            });

            // Resolve all promises to get stats for all players
            const playerStats = await Promise.all(statsPromises);

            // Calculate scores
            const playerScores = playerStats.map((stats, index) => {
                let score = 0;

                // Minutes played
                if (stats.minutesPlayed > 0) {
                    if (stats.minutesPlayed >= 60) {
                        score += scoringRules.minutesPlayed.moreThan60;
                    } else {
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
                    } else if (players[index].position === 'MID') {
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
            const startingTeamCol = db.collection<StartingTeamDoc>(STARTING_TEAM_COLLECTION);
            const updateResult = await startingTeamCol.updateOne(
                { _id: new ObjectId(startingTeam._id) },  // Convert to ObjectId
                { $set: { playerScores } }
            );

            if (updateResult.modifiedCount === 1) {
                console.log(`Scores updated for team with userId=${startingTeam.userId}`);
            } else {
                console.log(`Failed to update scores for team with userId=${startingTeam.userId}`);
            }
        }
    } catch (error) {
        console.error('Error scoring players:', error);
    } finally {
        await client.close();
    }
}

// Escape special characters for regex
function escapeRegExp(text: string) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

// Example usage if you run `ts-node score.ts` directly
if (require.main === module) {
    // Example startingTeam data - using your actual data
    const exampleStartingTeams: StartingTeamDoc[] = [
        {
            _id: new ObjectId("67a786846c0fe2bfe27f25eb"),  // Your actual _id
            userId: "HarouneTest",
            gameweek: CURRENT_GAMEWEEK,
            totalPrice: 53.5,
            startingEleven: [
                { name: 'Omar Arjoune', club: 'Difaâ Hassani El-Jadidi', position: 'MID' },
                { name: 'Jad Assouab', club: 'Jeunesse Sportive Soualem', position: 'DEF' },
                { name: 'Mourad Abdelwadie', club: 'SC Chabab Mohammédia', position: 'GK' },
                { name: 'Oussama Benchchaoui', club: 'Difaâ Hassani El-Jadidi', position: 'DEF' },
                { name: 'Adil El Hassnaoui', club: 'Difaâ Hassani El-Jadidi', position: 'MID' },
                { name: 'Anas Samoudi', club: 'Olympic Safi', position: 'FWD' },
                { name: 'Mehdi Khallati', club: 'Jeunesse Sportive Soualem', position: 'DEF' },
                { name: 'Mehdi Attouchi', club: 'Jeunesse Sportive Soualem', position: 'DEF' },
                { name: 'Ayoub Lakhal', club: 'Moghreb Atlético Tetuán', position: 'FWD' },
                { name: 'Badreddine Octobre', club: "Hassania d'Agadir", position: 'MID' },
                { name: 'Hamza El Belghyty', club: "Hassania d'Agadir", position: 'MID' }
            ],
            createdAt: new Date(1739032196588)
        }
    ];

    console.log(`Scoring teams for GW${CURRENT_GAMEWEEK}`);
    scorePlayers(exampleStartingTeams)
        .then(() => {
            console.log(`GW${CURRENT_GAMEWEEK} scoring completed successfully.`);
        })
        .catch((err) => {
            console.error('Error scoring players:', err);
        });
}

// Export to call it from other modules
export { scorePlayers };