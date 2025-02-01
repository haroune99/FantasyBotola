import { forwardDataPromise, midfieldDataPromise, defenseGkDataPromise } from './data';
import dotenv from "dotenv";
import { MongoClient } from 'mongodb';

dotenv.config(); 

const uri = process.env.MONGODB_URI as string;
const client = new MongoClient(uri);

async function run() {
  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const database = client.db('FantasyBotola'); 
    const playersCollection = database.collection('players');

    const forwardData = await forwardDataPromise;
    const midfieldData = await midfieldDataPromise;
    const defenseGkData = await defenseGkDataPromise;

    const allData = [...forwardData, ...midfieldData, ...defenseGkData];

    // Upsert data into MongoDB
    for (const playerStat of allData) {
      await playersCollection.updateOne(
        { 'player.id': playerStat.player.id }, 
        { $set: playerStat },
        { upsert: true }
      );
    }

    console.log('Data upserted successfully');
  } catch (error) {
    console.error('Error connecting to MongoDB or upserting data:', error);
  } finally {
    await client.close();
  }
}

run().catch(console.dir);