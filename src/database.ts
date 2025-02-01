import { forwardDataPromise, midfieldDataPromise, defenseGkDataPromise } from './data';
import { MongoClient } from 'mongodb';
import { PlayerStats } from './data';
import dotenv from "dotenv";

dotenv.config();

async function run() {
    const uri = process.env.MONGODB_URI as string;
    const client = new MongoClient(uri);
  try {
    await client.connect();
    const database = client.db('FantasyBotola');
    const playersCollection = database.collection('players');

    // Wait for all data to be ready
    const [forwardData, midfieldData, defenseGkData] = await Promise.all([
      forwardDataPromise,
      midfieldDataPromise,
      defenseGkDataPromise
    ]);

    const allData = [...forwardData, ...midfieldData, ...defenseGkData];
    
    // Get existing data directly
    const existingDataCursor = playersCollection.find({});
    const existingDataArray = await existingDataCursor.toArray();
    
    // Create map of existing player stats
    const existingDataMap = new Map<number, PlayerStats>(
      existingDataArray.map(doc => [doc.player.id, doc as unknown as PlayerStats])
    );

    const gameweekData: PlayerStats[] = [];

    // Process each player's stats
    for (const newStat of allData) {
      try {
        const existingStat = existingDataMap.get(newStat.player.id);
        let updatedStat: PlayerStats;
        let gameweekStat: PlayerStats;

        if (existingStat) {
          // Merge stats - only update numeric fields
          updatedStat = { ...existingStat };
          for (const key in newStat) {
            if (typeof newStat[key as keyof PlayerStats] === 'number') {
              (updatedStat as any)[key] = newStat[key as keyof PlayerStats];
            }
          }

          // Calculate gameweek-specific data
          gameweekStat = calculateGameweekData(existingStat, newStat);
        } else {
          // New player - initialize with current stats
          updatedStat = newStat;
          gameweekStat = { ...newStat };
        }

        // Update database
        await playersCollection.updateOne(
          { 'player.id': newStat.player.id },
          { $set: updatedStat },
          { upsert: true }
        );

        gameweekData.push(gameweekStat);
      } catch (error) {
        console.error(`Error processing player ${newStat.player.id}:`, error);
      }
    }

    console.log('Data upserted successfully');
  } catch (error) {
    console.error('Error in main process:', error);
  } finally {
    await client.close();
  }
}

// calculateGameweekData remains the same
function calculateGameweekData(existingStat: PlayerStats, newStat: PlayerStats): PlayerStats {
  const gameweekStat: PlayerStats = {
    player: { ...newStat.player },
    team: { ...newStat.team }
  };

  const numericKeys = [
    'goals', 'assists', 'penaltyWon', 'yellowCards', 'redCards',
    'minutesPlayed', 'cleanSheet', 'penaltiesTaken', 'penaltyGoals',
    'goalsConcededOutsideTheBox', 'goalsConcededInsideTheBox', 'ownGoals'
  ];

  for (const key of numericKeys) {
    const typedKey = key as keyof PlayerStats;
    const newValue = newStat[typedKey] || 0;
    const existingValue = existingStat[typedKey] || 0;
    
    if (typeof newValue === 'number' && typeof existingValue === 'number') {
      (gameweekStat as any)[typedKey] = newValue - existingValue;
    }
  }

  return gameweekStat;
}

run().catch(console.error);