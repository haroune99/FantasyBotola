import { forwardDataPromise, midfieldDataPromise, defenseGkDataPromise } from './data';
import { MongoClient, Db } from 'mongodb'; // Import Db type
import { PlayerStats } from './data';
import dotenv from "dotenv";

dotenv.config();

const CURRENT_GAMEWEEK = process.env.GAMEWEEK;

async function run() {
    const uri = process.env.MONGODB_URI as string;
    const client = new MongoClient(uri);
    
    try {
        await client.connect();
        const database = client.db('FantasyBotola');

        // Get all player data
        const [forwardData, midfieldData, defenseGkData] = await Promise.all([
            forwardDataPromise,
            midfieldDataPromise,
            defenseGkDataPromise
        ]);

        // Update position-specific collections
        await updatePositionCollection(database, 'forwards', forwardData);
        await updatePositionCollection(database, 'midfielders', midfieldData);
        await updatePositionCollection(database, 'defenders_goalkeepers', defenseGkData);

        // Rest of your existing gameweek processing code
        const allData = [...forwardData, ...midfieldData, ...defenseGkData];
        const gameweekCollection = database.collection<PlayerStats>(`gameweek${CURRENT_GAMEWEEK}`);
        const gameweekData = await processGameweekData(database, allData);
        
        await gameweekCollection.deleteMany({});
        await gameweekCollection.insertMany(gameweekData);
        
        console.log(`Gameweek ${CURRENT_GAMEWEEK} data stored successfully`);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await client.close();
    }
}

// New function to handle position-specific updates
async function updatePositionCollection(database: Db, collectionName: string, data: PlayerStats[]) {
    const collection = database.collection<PlayerStats>(collectionName);
    
    try {
        const bulkOps = data.map(player => ({
            updateOne: {
                filter: { 'player.id': player.player.id },
                update: { $set: player },
                upsert: true
            }
        }));

        const result = await collection.bulkWrite(bulkOps);
        console.log(`${collectionName} updated: ${result.upsertedCount} inserted, ${result.modifiedCount} updated`);
        
    } catch (error) {
        console.error(`Error updating ${collectionName}:`, error);
        throw error;
    }
}

// Add proper typing for database parameter
async function processGameweekData(database: Db, allData: PlayerStats[]) {
    const playersCollection = database.collection<PlayerStats>('players');
    const existingPlayers = await playersCollection.find().toArray();
    
    // Fix type for the Map
    const existingMap = new Map<number, PlayerStats>(
        existingPlayers.map((p: PlayerStats) => [p.player.id, p])
    );

    const gameweekData: PlayerStats[] = [];

    for (const newStat of allData) {
        const existing = existingMap.get(newStat.player.id);
        
        // Update persistent player stats
        await playersCollection.updateOne(
            { 'player.id': newStat.player.id },
            { $set: newStat },
            { upsert: true }
        );

        // Handle new players properly
        if (existing) {
            gameweekData.push(calculateGameweekData(existing, newStat));
        } else {
            // For new players, use current stats as first gameweek data
            gameweekData.push(newStat);
        }
    }

    return gameweekData;
}

// Ensure calculateGameweekData has proper typing
function calculateGameweekData(existingStat: PlayerStats, newStat: PlayerStats): PlayerStats {
    // Create base object with latest player/team info
    const gameweekStat: PlayerStats = {
        ...newStat, // Spread first to get all properties
        player: { ...newStat.player }, // Explicitly set player
        team: { ...newStat.team } // Explicitly set team
    };

    // Now calculate differences for numeric fields
    const numericKeys = [
        'goals', 'assists', 'penaltyWon', 'yellowCards', 'redCards',
        'minutesPlayed', 'cleanSheet', 'penaltiesTaken', 'penaltyGoals',
        'goalsConcededOutsideTheBox', 'goalsConcededInsideTheBox', 'ownGoals'
    ];

    for (const key of numericKeys) {
        const typedKey = key as keyof PlayerStats;
        const existingValue = existingStat[typedKey] || 0;
        const newValue = newStat[typedKey] || 0;
        
        if (typeof newValue === 'number' && typeof existingValue === 'number') {
            (gameweekStat as any)[typedKey] = newValue - existingValue;
        }
    }

    return gameweekStat;
}

run().catch(console.error);