import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const uri = process.env.MONGODB_URI as string;
const client = new MongoClient(uri);
const CURRENT_GAMEWEEK = parseInt(process.env.GAMEWEEK as string, 10);

const DB_NAME = 'FantasyBotola';
const USER_SQUAD_COLLECTION = `UserSquad${CURRENT_GAMEWEEK}`;
const STARTING_ELEVEN = `StartingTeam${CURRENT_GAMEWEEK}`;

// The shape of the user’s squad document in MongoDB
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

// The shape of the user’s starting eleven document we’ll store
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

/**
 * Create a user’s starting eleven from their squad.
 * This function:
 * 1) Fetches the user's squad from MongoDB
 * 2) Validates the starting eleven meets requirements
 * 3) Inserts into `StartingEleven` collection if valid
 */
async function createStartingEleven(userId: string, playerNames: string[]): Promise<StartingElevenDoc> {
  await client.connect();
  const db = client.db(DB_NAME);

  try {
    // 1) Fetch the user's squad from MongoDB
    const squadsCol = db.collection<UserSquadDoc>(USER_SQUAD_COLLECTION);
    const userSquad = await squadsCol.findOne({ userId });

    if (!userSquad) {
      throw new Error(`User squad not found for userId ${userId}`);
    }

    const { players } = userSquad;

    // 2) Validate playerNames are in the user's squad
    const selectedPlayers = players.filter(p => playerNames.includes(p.name));

    if (selectedPlayers.length !== playerNames.length) {
      const invalidNames = playerNames.filter(name => !players.some(p => p.name === name));
      throw new Error(`Invalid player names: ${invalidNames.join(', ')}`);
    }

    // 3) Select players for the starting eleven
    const startingElevenPlayers = selectedPlayers;

    if (startingElevenPlayers.length !== 11) {
      throw new Error('Must select exactly 11 players for the starting eleven.');
    }

    // 4) Validate the starting eleven meets position requirements
    const positionCounts = { GK: 0, DEF: 0, MID: 0, FWD: 0 };

    for (const player of startingElevenPlayers) {
      positionCounts[player.position]++;
    }

    if (
      positionCounts.GK < 1 ||
      positionCounts.DEF < 3 ||
      positionCounts.MID < 2 ||
      positionCounts.FWD < 1
    ) {
      throw new Error('Starting eleven must have at least 1 GK, 3 DEF, 2 MID, and 1 FWD.');
    }

    const totalPrice = startingElevenPlayers.reduce((sum, p) => sum + p.fantasyPrice, 0);

    const startingElevenDoc: StartingElevenDoc = {
      userId,
      gameweek: CURRENT_GAMEWEEK,
      totalPrice,
      startingEleven: startingElevenPlayers.map(p => ({
        name: p.name,
        club: p.club,
        position: p.position,
      })),
      createdAt: new Date()
    };

    // 5) Insert into StartingEleven collection
    const startingElevenCol = db.collection<StartingElevenDoc>(STARTING_ELEVEN);
    await startingElevenCol.insertOne(startingElevenDoc);

    console.log(`Starting eleven created for userId=${userId}, totalPrice=${totalPrice}`);

    return startingElevenDoc;
  } finally {
    await client.close();
  }
}

// Example usage if you run `ts-node createStartingEleven.ts` directly
if (require.main === module) {
  const examplePlayerNames = [
    'Mourad Abdelwadie', 
    'Mehdi Attouchi', 
    'Hamza El Belghyty',
    'Jad Assouab',
    'Mehdi Khallati',
    'Badreddine Octobre',
    'Adil El Hassnaoui',
    'Oussama Benchchaoui',
    'Omar Arjoune',
    'Anas Samoudi',
    'Abdoul Draman Ouedraogo'
  ];

  createStartingEleven('HarouneTest', examplePlayerNames)
    .then((startingEleven) => {
      console.log('Starting eleven created successfully:', startingEleven);
    })
    .catch((err) => {
      console.error('Error creating starting eleven:', err.message);
    });
}

export { createStartingEleven };