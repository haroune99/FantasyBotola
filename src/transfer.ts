import { MongoClient, ObjectId } from 'mongodb';
import dotenv from 'dotenv';
import { UserSquadDoc, PlayerDoc, validateSquad } from './team';

dotenv.config();

const uri = process.env.MONGODB_URI as string;
const client = new MongoClient(uri);
const CURRENT_GAMEWEEK = parseInt(process.env.GAMEWEEK as string, 10);

const DB_NAME = 'FantasyBotola';
const PLAYER_COLLECTION = `PlayerValue${CURRENT_GAMEWEEK}`;
const USER_SQUAD_COLLECTION = `UserSquad${CURRENT_GAMEWEEK}`;
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

      // 1. Check Transfer Availability
      const transferStateCol = db.collection<UserTransferStateDoc>(USER_TRANSFER_STATE_COLLECTION);
      const transferState = await transferStateCol.findOne(
        { userId: request.userId },
        { session }
      );

      let available = transferState?.availableTransfers ?? 1;
      const maxSaved = transferState?.maxSavedTransfers ?? 2;
      const lastUpdated = transferState?.lastGameweekUpdated ?? CURRENT_GAMEWEEK;

      // Update transfers if new gameweek
      if (lastUpdated < CURRENT_GAMEWEEK) {
        available = Math.min(available + 1, maxSaved);
        await transferStateCol.updateOne(
          { userId: request.userId },
          { $set: { availableTransfers: available, lastGameweekUpdated: CURRENT_GAMEWEEK } },
          { upsert: true, session }
        );
      }

      if (available < 1) throw new Error('No transfers available');

      // 2. Validate Players
      const squadCol = db.collection<UserSquadDoc>(USER_SQUAD_COLLECTION);
      const currentSquad = await squadCol.findOne(
        { userId: request.userId, gameweek: CURRENT_GAMEWEEK },
        { session }
      );
      if (!currentSquad) throw new Error('Current squad not found');

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

      if (playerOut.position !== playerIn.position) {
        throw new Error('Position mismatch');
      }

      // 3. Budget and Club Checks
      const newTotal = currentSquad.totalPrice - playerOut.fantasyPrice + playerIn.fantasyPrice;
      if (newTotal > 100) throw new Error('Budget exceeded');

      const currentClubCount = currentSquad.players.filter(p => p.club === playerIn.club).length;
      if (currentClubCount - (playerOut.club === playerIn.club ? 1 : 0) >= 3) {
        throw new Error('Club limit exceeded');
      }

      // 4. Create New Squad
      const newPlayers = currentSquad.players.map(p => 
        p === playerOut ? playerIn : p
      );
      validateSquad(newPlayers); // Reuse existing validation

      // 5. Update Database
      await transferStateCol.updateOne(
        { userId: request.userId },
        { $inc: { availableTransfers: -1 } },
        { session }
      );

      const newSquad: UserSquadDoc = {
        ...currentSquad,
        gameweek: CURRENT_GAMEWEEK + 1,
        totalPrice: newTotal,
        players: newPlayers,
        createdAt: new Date()
      };

      await squadCol.insertOne(newSquad, { session });
    });
  } finally {
    await session.endSession();
    await client.close();
  }
}

// Example usage
if (require.main === module) {
  makeTransfer({
    userId: 'HarouneTest',
    playerOut: { name: 'Omar Arjoune', club: 'Difaâ Hassani El-Jadidi' },
    playerIn: { name: 'Amine Zouhzouh', club: 'AS FAR Rabat' }
  }).catch(console.error);
}