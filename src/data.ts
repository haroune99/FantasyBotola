import { forward_urls } from './urls';

interface Player {
    name: string;
    id: number;
  }
  
  interface Team {
    name: string;
    shortName: string;
    id: number;
    entityType: string;
    teamColors: object;
  }
  
  interface PlayerStats {
    ownGoals?: number;
    goals?: number;
    assists?: number;
    penaltyWon?: number;
    yellowCards?: number;
    redCards?: number;
    minutesPlayed?: number;
    player: Player;
    team: Team;
  }
  

let fwd_data: PlayerStats[] = [];


async function fetchPlayerStats(url: string): Promise<PlayerStats[]> {
    try {
      const response = await fetch(url);
  
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
  
      const data = await response.json() as { results: PlayerStats[] };
      return data.results;
    } catch (error) {
      console.error('Error fetching data:', error);
      return [];
    }
  }
  
function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
async function mergePlayerStats(urls: string[]): Promise<PlayerStats[]> {
    const allStats: PlayerStats[] = [];
  
    for (const url of urls) {
      const stats = await fetchPlayerStats(url);
      allStats.push(...stats);
      await delay(1000); // Delay of 1 second between requests
    }
  
    const playerStatsMap: Map<string, PlayerStats> = new Map();
  
    allStats.forEach(stat => {
      if (playerStatsMap.has(stat.player.name)) {
        const existingStat = playerStatsMap.get(stat.player.name);
        playerStatsMap.set(stat.player.name, { ...existingStat, ...stat });
      } else {
        playerStatsMap.set(stat.player.name, { ...stat });
      }
    });
  
    return Array.from(playerStatsMap.values());
  }
  
async function getForwardData() {
    fwd_data = await mergePlayerStats(forward_urls);
  }

getForwardData()
