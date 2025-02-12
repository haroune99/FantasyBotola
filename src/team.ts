import { MongoClient, ObjectId } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const uri = process.env.MONGODB_URI as string;
const client = new MongoClient(uri);
const CURRENT_GAMEWEEK = parseInt(process.env.GAMEWEEK as string, 10);

const DB_NAME = 'FantasyBotola';
const PLAYER_COLLECTION_NAME = `PlayerValue${CURRENT_GAMEWEEK}`;
const USER_SQUAD_COLLECTION = `UserSquad${CURRENT_GAMEWEEK}`;

// The shape of a Player in the DB
export interface PlayerDoc {
  name: string;
  marketValue: number;
  club: string;
  position: 'GK' | 'DEF' | 'MID' | 'FWD';
  fantasyPrice: number;
}

// The shape of the user’s squad document we’ll store
export interface UserSquadDoc {
  _id?: ObjectId;
  userId: string;      
  gameweek: number;
  totalPrice: number;  
  players: PlayerDoc[]; 
  createdAt: Date;     
}

// --- Helper: Validate the squad meets constraints
function validateSquad(players: PlayerDoc[]): void {
  if (players.length !== 15) {
    throw new Error('Squad must contain exactly 15 players.');
  }

  // Tally positions & clubs
  const positionCounts = { GK: 0, DEF: 0, MID: 0, FWD: 0 };
  const clubCounts: Record<string, number> = {};

  let totalPrice = 0;

  for (const p of players) {
    if (!(p.position in positionCounts)) {
      throw new Error(`Invalid position: ${p.position}`);
    }
    positionCounts[p.position]++;

    if (!clubCounts[p.club]) clubCounts[p.club] = 0;
    clubCounts[p.club]++;

    totalPrice += p.fantasyPrice;
  }

  if (positionCounts.GK !== 2) {
    throw new Error(`Need exactly 2 GK. Found ${positionCounts.GK}`);
  }
  if (positionCounts.DEF !== 5) {
    throw new Error(`Need exactly 5 DEF. Found ${positionCounts.DEF}`);
  }
  if (positionCounts.MID !== 5) {
    throw new Error(`Need exactly 5 MID. Found ${positionCounts.MID}`);
  }
  if (positionCounts.FWD !== 3) {
    throw new Error(`Need exactly 3 FWD. Found ${positionCounts.FWD}`);
  }

  for (const club in clubCounts) {
    if (clubCounts[club] > 3) {
      throw new Error(`Cannot have more than 3 players from club ${club}`);
    }
  }

  if (totalPrice > 100) {
    throw new Error(`Squad price exceeds 100M. Found ${totalPrice}M`);
  }
}

async function createUserSquad(userId: string, playerSelections: { name: string; club: string }[]): Promise<UserSquadDoc> {
  if (playerSelections.length !== 15) {
    throw new Error('Must provide exactly 15 player selections (name and club).');
  }

  await client.connect();
  const db = client.db(DB_NAME);

  try {
    const collection = db.collection<PlayerDoc>(PLAYER_COLLECTION_NAME);
    const query = playerSelections.map(({ name, club }) => ({ name, club }));
    const players = await collection
      .find({ $or: query })
      .toArray();

    if (players.length !== 15) {
      const foundNames = players.map(p => `${p.name} (${p.club})`);
      throw new Error(
        `Could not find all 15 players by name and club. Found these: ${foundNames.join(', ')}`
      );
    }

    validateSquad(players);

    const totalPrice = players.reduce((sum, p) => sum + p.fantasyPrice, 0);

    const userSquad: UserSquadDoc = {
      userId,
      gameweek: CURRENT_GAMEWEEK,
      totalPrice,
      players,
      createdAt: new Date()
    };

    const squadsCol = db.collection<UserSquadDoc>(USER_SQUAD_COLLECTION);
    await squadsCol.insertOne(userSquad);

    console.log(`User squad created for userId=${userId}, totalPrice=${totalPrice}`);

    return userSquad;
  } finally {
    await client.close();
  }
}

async function displayUserTeam(userId: string): Promise<void> {
  await client.connect();
  const db = client.db(DB_NAME);

  try {
    const squadsCol = db.collection<UserSquadDoc>(USER_SQUAD_COLLECTION);
    const userSquad = await squadsCol.findOne({ userId });

    if (!userSquad) {
      console.log(`User squad for GW${CURRENT_GAMEWEEK} not found for userId ${userId}`);
      return;
    }

    console.log(`User Squad for ${userId} in Gameweek ${CURRENT_GAMEWEEK}:`);
    console.log(`Total Price: ${userSquad.totalPrice}M`);
    console.log('Players:');
    userSquad.players.forEach(player => {
      console.log(`- ${player.name} (${player.club}) - ${player.position}`);
    });
  } catch (error) {
    console.error('Error displaying user team:', error);
  } finally {
    await client.close();
  }
}

// Example usage  
if (require.main === module) {
  const exampleSelections = [
    { name: 'Mourad Abdelwadie', club: 'SC Chabab Mohammédia' },
    { name: 'Oussama Errahmany', club: 'SC Chabab Mohammédia' },
    { name: 'Yasser Machouat', club: 'SC Chabab Mohammédia' },
    { name: 'Jad Assouab', club: 'Jeunesse Sportive Soualem' },
    { name: 'Mehdi Khallati', club: 'Jeunesse Sportive Soualem' },
    { name: 'Mehdi Attouchi', club: 'Jeunesse Sportive Soualem' },
    { name: 'Oussama Benchchaoui', club: 'Difaâ Hassani El-Jadidi' },
    { name: 'Omar Arjoune', club: 'Difaâ Hassani El-Jadidi' },
    { name: 'Adil El Hassnaoui', club: 'Difaâ Hassani El-Jadidi' },
    { name: 'Zakaria Ami', club: "Hassania d'Agadir" },
    { name: 'Badreddine Octobre', club: "Hassania d'Agadir" },
    { name: 'Hamza El Belghyty', club: "Hassania d'Agadir" },
    { name: 'Zakaria Habti', club: 'Olympic Safi' },
    { name: 'Anas Samoudi', club: 'Olympic Safi' },
    { name: 'Ayoub Lakhal', club: 'Moghreb Atlético Tetuán' },
  ];

  createUserSquad('HarouneTest', exampleSelections)
    .then((squad) => {
      console.log('Squad created successfully:', squad);
    })
    .catch((err) => {
      console.error('Error creating squad:', err.message);
    });
}

export { createUserSquad };
export { validateSquad };
export { displayUserTeam };