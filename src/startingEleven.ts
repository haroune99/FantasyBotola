import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const uri = process.env.MONGODB_URI as string;
const client = new MongoClient(uri);
const CURRENT_GAMEWEEK = parseInt(process.env.GAMEWEEK as string, 10);

const DB_NAME = 'FantasyBotola';
const NEXT_GAMEWEEK = CURRENT_GAMEWEEK + 1;
const USER_SQUAD_COLLECTION = `UserSquad${NEXT_GAMEWEEK}`;
const STARTING_ELEVEN = `StartingTeam${NEXT_GAMEWEEK}`;

interface UserSquadDoc {
  userId: string;      
  gameweek: number;
  totalPrice: number;  
  players: {
    name: string;
    marketValue: number;
    club: string;
    position: 'GK' | 'DEF' | 'MID' | 'FWD';
    fantasyPrice: number;
  }[];
  createdAt: Date;     
}

interface StartingElevenDoc {
  userId: string;
  gameweek: number;
  totalPrice: number;
  startingEleven: {
    name: string;
    club: string;
    position: 'GK' | 'DEF' | 'MID' | 'FWD';
  }[];
  createdAt: Date;
}

async function createStartingEleven(userId: string, playerNames: string[]): Promise<StartingElevenDoc> {
  await client.connect();
  const db = client.db(DB_NAME);

  try {
    // 1) Fetch the user's NEXT gameweek squad
    const squadsCol = db.collection<UserSquadDoc>(USER_SQUAD_COLLECTION);
    const userSquad = await squadsCol.findOne({ userId });

    if (!userSquad) {
      throw new Error(`User squad for GW${NEXT_GAMEWEEK} not found for userId ${userId}`);
    }

    // 2) Validate player names against the TRANSFERRED squad
    const selectedPlayers = userSquad.players.filter(p => playerNames.includes(p.name));

    if (selectedPlayers.length !== 11) {
      const invalidNames = playerNames.filter(name => 
        !userSquad.players.some(p => p.name === name)
      );
      throw new Error(`Invalid selection: ${invalidNames.join(', ')} not in GW${NEXT_GAMEWEEK} squad`);
    }

    // 3) Validate position requirements
    const positionCounts = { GK: 0, DEF: 0, MID: 0, FWD: 0 };
    selectedPlayers.forEach(p => positionCounts[p.position]++);

    if (positionCounts.GK !== 1) throw new Error('Must select exactly 1 GK');
    if (positionCounts.DEF < 3) throw new Error('Minimum 3 DEF required');
    if (positionCounts.MID < 2) throw new Error('Minimum 2 MID required');
    if (positionCounts.FWD < 1) throw new Error('Minimum 1 FWD required');

    // 4) Create starting eleven document
    const startingElevenDoc: StartingElevenDoc = {
      userId,
      gameweek: NEXT_GAMEWEEK,
      totalPrice: selectedPlayers.reduce((sum, p) => sum + p.fantasyPrice, 0),
      startingEleven: selectedPlayers.map(p => ({
        name: p.name,
        club: p.club,
        position: p.position,
      })),
      createdAt: new Date()
    };

    // 5) Store in NEXT gameweek's starting eleven collection
    const startingElevenCol = db.collection<StartingElevenDoc>(STARTING_ELEVEN);
    await startingElevenCol.insertOne(startingElevenDoc);

    console.log(`GW${NEXT_GAMEWEEK} starting eleven created for ${userId}`);
    return startingElevenDoc;
  } finally {
    await client.close();
  }
}

// Updated example usage for GW20
if (require.main === module) {
  const gw20Players = [
    'Mourad Abdelwadie', 
    'Mehdi Attouchi',
    'Hamza El Belghyty',
    'Jad Assouab',
    'Mehdi Khallati',
    'Badreddine Octobre',
    'Adil El Hassnaoui',
    'Oussama Benchchaoui',
    'Amine Zouhzouh',
    'Anas Samoudi',
    'Ayoub Lakhal'
  ];

  createStartingEleven('HarouneTest', gw20Players)
    .then(() => console.log('GW20 starting team set!'))
    .catch(console.error);
}

export { createStartingEleven };