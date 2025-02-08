import { MongoClient, ObjectId, WithId } from 'mongodb';
import dotenv from 'dotenv';
import { UserSquadDoc, PlayerDoc, validateSquad } from './team';

dotenv.config();

const uri = process.env.MONGODB_URI as string;
const client = new MongoClient(uri);
const CURRENT_GAMEWEEK = parseInt(process.env.GAMEWEEK as string, 10);

const DB_NAME = 'FantasyBotola';
const PLAYER_COLLECTION = `PlayerValue${CURRENT_GAMEWEEK}`; // Current GW player values
const CURRENT_SQUAD_COLLECTION = `UserSquad${CURRENT_GAMEWEEK-1}`; // Current GW squad
const NEXT_SQUAD_COLLECTION = `UserSquad${CURRENT_GAMEWEEK}`; // Same GW squad
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

        // 4. Get squad for next gameweek if it exists
        const nextSquadCol = db.collection<UserSquadDoc>(NEXT_SQUAD_COLLECTION);
        let nextSquad = await nextSquadCol.findOne({ userId: request.userId }, { session });

        // 5. If no next GW squad exists, clone from current GW
        if (!nextSquad) {
          const currentSquad = await db.collection<UserSquadDoc>(CURRENT_SQUAD_COLLECTION)
            .findOne({ userId: request.userId }, { session });
          
          if (!currentSquad) {
            throw new Error(`Current squad not found for GW${CURRENT_GAMEWEEK}`);
          }
          
          nextSquad = {
            ...currentSquad,
            _id: new ObjectId(),
            gameweek: CURRENT_GAMEWEEK + 1,
            createdAt: new Date()
          };
          await nextSquadCol.insertOne(nextSquad, { session });
          console.log(`Created new squad for GW${CURRENT_GAMEWEEK}`);
        }

        // 6. Validate transfer parameters
        const playerOut = nextSquad.players.find(
          p => p.name === request.playerOut.name && p.club === request.playerOut.club
        );
        if (!playerOut) {
          throw new Error('Player to transfer out not found in squad');
        }

        const playersCol = db.collection<PlayerDoc>(PLAYER_COLLECTION);
        const playerIn = await playersCol.findOne(
          { name: request.playerIn.name, club: request.playerIn.club },
          { session }
        );
        if (!playerIn) {
          throw new Error('Player to transfer in not found in database');
        }

        // 7. Validate transfer constraints
        if (playerOut.position !== playerIn.position) {
          throw new Error('Position mismatch between players');
        }

        const newTotal = nextSquad.totalPrice - playerOut.fantasyPrice + playerIn.fantasyPrice;
        if (newTotal > 100) {
          throw new Error(`Budget exceeded: ${newTotal}M > 100M`);
        }

        const currentClubCount = nextSquad.players.filter(p => p.club === playerIn.club).length;
        if (currentClubCount - (playerOut.club === playerIn.club ? 1 : 0) >= 3) {
          throw new Error(`Club limit exceeded for ${playerIn.club}`);
        }

        // 8. Apply transfer
        const newPlayers = nextSquad.players.map(p => 
          p === playerOut ? playerIn : p
        );
        validateSquad(newPlayers);

        // 9. Update transfer state and squad
        await transferStateCol.updateOne(
          { _id: transferState._id },
          { $inc: { availableTransfers: -1 } },
          { session }
        );

        await nextSquadCol.updateOne(
          { _id: nextSquad._id },
          { 
            $set: { 
              players: newPlayers, 
              totalPrice: newTotal 
            } 
          },
          { session }
        );

        console.log(`Transfer completed for GW${CURRENT_GAMEWEEK + 1}`);
        console.log(`OUT: ${playerOut.name} (${playerOut.club})`);
        console.log(`IN: ${playerIn.name} (${playerIn.club})`);
        console.log(`New squad total: ${newTotal}M`);
      });
    } catch (error) {
      console.error('Transfer failed:', error);
      throw error;
    } finally {
      await session.endSession();
      await client.close();
    }
}

// Example usage for testing
if (require.main === module) {
  console.log(`Making transfer for GW${CURRENT_GAMEWEEK} using GW${CURRENT_GAMEWEEK-1} squad as base`);
  makeTransfer({
    userId: 'HarouneTest',
    playerOut: { name: 'Abdoul Draman Ouedraogo', club: 'Olympic Safi' },
    playerIn: { name: 'Ayoub Lakhal', club: 'Moghreb Atlético Tetuán' }
  }).catch(console.error);
}

export { makeTransfer };