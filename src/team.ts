import { MongoClient, Db } from 'mongodb';
import dotenv from "dotenv";
import { PlayerStats } from './data';

dotenv.config();

const uri = process.env.MONGODB_URI as string;
const client = new MongoClient(uri);

async function fetchCollectionData(database: Db, collectionName: string): Promise<PlayerStats[]> {
    const collection = database.collection<PlayerStats>(collectionName);
    return await collection.find().toArray();
}

async function getForwardsData(): Promise<PlayerStats[]> {
    await client.connect();
    const database = client.db('FantasyBotola');
    return await fetchCollectionData(database, 'forwards');
}

async function getMidfieldsData(): Promise<PlayerStats[]> {
    await client.connect();
    const database = client.db('FantasyBotola');
    return await fetchCollectionData(database, 'midfielders');
}

async function getDefendersGoalkeepersData(): Promise<PlayerStats[]> {
    await client.connect();
    const database = client.db('FantasyBotola');
    return await fetchCollectionData(database, 'defenders_goalkeepers');
}





export { getForwardsData, getMidfieldsData, getDefendersGoalkeepersData };