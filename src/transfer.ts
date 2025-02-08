import { MongoClient, ObjectId, WithId } from 'mongodb';
import dotenv from 'dotenv';
import { UserSquadDoc, PlayerDoc, validateSquad } from './team';

dotenv.config();

const uri = process.env.MONGODB_URI as string;
const client = new MongoClient(uri);
const CURRENT_GAMEWEEK = parseInt(process.env.GAMEWEEK as string, 10);

const DB_NAME = 'FantasyBotola';
const PLAYER_COLLECTION = `PlayerValue${CURRENT_GAMEWEEK}`;
const USER_SQUAD_COLLECTION = `UserSquad${CURRENT_GAMEWEEK-1}`;
const USER_TRANSFER_STATE_COLLECTION = 'UserTransferState';

interface TransferRequest {
  userId: string;
  playerOut: { name: string; club: string };
  playerIn: { name: string; club: string };
}

export interface UserTransferStateDoc {
  userId: string;
  availableTransfers: number;
  maxSavedTransfers: number;
  lastGameweekUpdated: number;
}

async function makeTransfer(request: TransferRequest): Promise<void> {
    await client.connect();
    const session = client.startSession();
  
    try {
      await session.withTransaction(async () => {
        const db = client.db(DB_NAME);
  
        // 1. Get or create transfer state with proper typing
        const transferStateCol = db.collection<UserTransferStateDoc>(USER_TRANSFER_STATE_COLLECTION);
        const transferResult = await transferStateCol.findOneAndUpdate(
          { userId: request.userId },
          {
            $setOnInsert: {
              availableTransfers: 1,
              maxSavedTransfers: 2,
              lastGameweekUpdated: CURRENT_GAMEWEEK
            }
          },
          {
            upsert: true,
            returnDocument: 'after',
            session
          }
        );
  
        // Handle null result case
        if (!transferResult) {
          throw new Error('Failed to initialize transfer state');
        }
  
        // 2. Type guard for WithId<Document>
        const transferState = transferResult as WithId<UserTransferStateDoc>;
        
        // 3. Validate available transfers
        if (transferState.availableTransfers < 1) {
          throw new Error('No transfers available');
        }

      // 3. Get current squad for NEXT gameweek
      const squadCol = db.collection<UserSquadDoc>(`UserSquad${CURRENT_GAMEWEEK + 1}`);
      let currentSquad = await squadCol.findOne({ userId: request.userId }, { session });

      // 4. Clone squad if no next GW squad exists
      if (!currentSquad) {
        const currentGwSquad = await db.collection<UserSquadDoc>(USER_SQUAD_COLLECTION)
          .findOne({ userId: request.userId }, { session });
        
        if (!currentGwSquad) throw new Error('Current squad not found');
        
        currentSquad = {
          ...currentGwSquad,
          _id: new ObjectId(),
          gameweek: CURRENT_GAMEWEEK + 1,
          createdAt: new Date()
        };
        await squadCol.insertOne(currentSquad, { session });
      }

      // 5. Validate transfer parameters
      const playerOut = currentSquad.players.find(
        p => p.name === request.playerOut.name && p.club === request.playerOut.club
      );
      if (!playerOut) throw new Error('Player not in squad');

      const playersCol = db.collection<PlayerDoc>(PLAYER_COLLECTION);
      const playerIn = await playersCol.findOne(
        { name: request.playerIn.name, club: request.playerIn.club },
        { session }
      );
      if (!playerIn) throw new Error('Player not found');

      // 6. Validate transfer constraints
      if (playerOut.position !== playerIn.position) {
        throw new Error('Position mismatch');
      }

      const newTotal = currentSquad.totalPrice - playerOut.fantasyPrice + playerIn.fantasyPrice;
      if (newTotal > 100) throw new Error('Budget exceeded');

      const currentClubCount = currentSquad.players.filter(p => p.club === playerIn.club).length;
      if (currentClubCount - (playerOut.club === playerIn.club ? 1 : 0) >= 3) {
        throw new Error('Club limit exceeded');
      }

      // 7. Apply transfer and update state
      const newPlayers = currentSquad.players.map(p => 
        p === playerOut ? playerIn : p
      );
      validateSquad(newPlayers);

      await transferStateCol.updateOne(
        { _id: transferState._id },
        { $inc: { availableTransfers: -1 } },
        { session }
      );

      await squadCol.updateOne(
        { _id: currentSquad._id },
        { $set: { players: newPlayers, totalPrice: newTotal } },
        { session }
      );
    });
  } finally {
    await session.endSession();
    await client.close();
  }
}

// Export for testing
if (require.main === module) {
  makeTransfer({
    userId: 'HarouneTest',
    playerOut: { name: 'Abdoul Draman Ouedraogo', club: 'Olympic Safi' },
    playerIn: { name: 'Ayoub Lakhal', club: 'Moghreb Atlético Tetuán' }
  }).catch(console.error);
}