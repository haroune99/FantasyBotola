import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import { UserTransferStateDoc } from './transfer';

dotenv.config();

const uri = process.env.MONGODB_URI as string;
const client = new MongoClient(uri);
const CURRENT_GAMEWEEK = parseInt(process.env.GAMEWEEK as string, 10);

async function incrementTransfers() {
  await client.connect();
  const db = client.db('FantasyBotola');
  const col = db.collection<UserTransferStateDoc>('UserTransferState');

  const result = await col.updateMany(
    { lastGameweekUpdated: { $lt: CURRENT_GAMEWEEK } },
    [
      { 
        $inc: { availableTransfers: 1 },
        $set: { lastGameweekUpdated: CURRENT_GAMEWEEK }
      },
      {
        $set: {
          availableTransfers: {
            $min: [
              '$availableTransfers',
              { $ifNull: ['$maxSavedTransfers', 2] }
            ]
          }
        }
      }
    ]
  );

  console.log(`Updated ${result.modifiedCount} users`);
}

incrementTransfers().finally(() => client.close());