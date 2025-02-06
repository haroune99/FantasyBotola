import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import { UserTransferStateDoc } from './transfer';

dotenv.config();

const uri = process.env.MONGODB_URI as string;
const client = new MongoClient(uri);
const CURRENT_GAMEWEEK = parseInt(process.env.GAMEWEEK as string, 10);

async function incrementTransfers() {
  try {
    await client.connect();
    const db = client.db('FantasyBotola');

    // 1. Get all active users
    const squadCol = db.collection(`UserSquad${CURRENT_GAMEWEEK}`);
    const userIds = await squadCol.distinct('userId');

    // 2. Process each user's transfer state
    const transferStateCol = db.collection<UserTransferStateDoc>('UserTransferState');
    
    let totalUpdated = 0;
    const nextGameweek = CURRENT_GAMEWEEK + 1;

    for (const userId of userIds) {
      // 3. Update transfer state atomically
      const result = await transferStateCol.updateOne(
        { userId },
        {
          $inc: { availableTransfers: 1 },
          $set: { lastGameweekUpdated: nextGameweek },
          $setOnInsert: { maxSavedTransfers: 2 }
        },
        { upsert: true }
      );

      // 4. Cap at maximum 2 transfers
      await transferStateCol.updateOne(
        { userId, availableTransfers: { $gt: 2 } },
        { $set: { availableTransfers: 2 } }
      );

      if (result.modifiedCount > 0) totalUpdated++;
    }

    console.log(`Successfully updated transfers for ${totalUpdated}/${userIds.length} users`);
    console.log(`Next gameweek: ${nextGameweek}`);
  } catch (error) {
    console.error('Error updating transfers:', error);
  } finally {
    await client.close();
  }
}

incrementTransfers();