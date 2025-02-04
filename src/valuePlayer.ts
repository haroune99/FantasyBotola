import { MongoClient, Db } from 'mongodb';
import dotenv from "dotenv";
import { PlayerStats } from './data';
import fs from 'fs';
import csv from 'csv-parser';


dotenv.config();
/*
const uri = process.env.MONGODB_URI as string;
const client = new MongoClient(uri);
const CURRENT_GAMEWEEK = parseInt(process.env.GAMEWEEK as string, 10);

async function fetchCollectionData(database: Db, collectionName: string): Promise<PlayerStats[]> {
    const collection = database.collection<PlayerStats>(collectionName);
    return await collection.find().toArray();
}

async function getGameweekData(gameweek: number): Promise<PlayerStats[]> {
    await client.connect();
    const database = client.db('FantasyBotola');
    return await fetchCollectionData(database, `gameweek${gameweek}`);
}

const gameweekData = getGameweekData(CURRENT_GAMEWEEK);
*/
interface PlayerValue {
    name: string;
    marketValue: number;
    club: string;
}

function convertMarketValue(valueStr: string): number {
    // Handle unknown values marked with "-"
    if (valueStr.trim() === '-') return 0.01;
    
    // Remove euro sign and commas, convert to lowercase
    const cleaned = valueStr.replace(/€|,/g, '').toLowerCase();
    
    // Extract numerical value and multiplier
    const match = cleaned.match(/([\d.]+)([mk])/);
    if (!match) {
        console.warn(`Invalid value format: ${valueStr}, defaulting to 0.01M`);
        return 0.01;
    }
    
    const value = parseFloat(match[1]);
    const multiplier = match[2];
    
    // Convert to millions basis
    return multiplier === 'k' ? value / 1000 : value;
}

async function processPlayerValues(filePath: string): Promise<PlayerValue[]> {
    const players: PlayerValue[] = [];
    
    return new Promise((resolve, reject) => {
        fs.createReadStream(filePath)
            .pipe(csv({
                mapHeaders: ({ header }) => header.trim()
            }))
            .on('data', (row) => {
                try {
                    players.push({
                        name: row['Player Name'].trim(),
                        marketValue: convertMarketValue(row['Market Value']),
                        club: row.Club.trim()
                    });
                } catch (error) {
                    console.error(`Error processing row: ${JSON.stringify(row)}`, error);
                }
            })
            .on('end', () => resolve(players))
            .on('error', reject);
    });
}

// Example usage
processPlayerValues('./data/botola mv.csv')
    .then(players => {
        console.log('Processed players:');
        console.log(players.slice(0, 50));
    })
    .catch(console.error);
