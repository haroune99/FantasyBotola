import { forward_urls } from './urls';
import { midfield_urls } from './urls';
import { defense_gk_urls } from './urls';

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
    cleanSheet?: number;
    penaltiesTaken?: number;
    penaltyGoals?: number;
    goalsConcededOutsideTheBox?: number;
    goalsConcededInsideTheBox?: number;
    player: Player;
    team: Team;
  }

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
  
  let fwd_data: PlayerStats[] = [];
  let midfield_data: PlayerStats[] = [];
  let defense_gk_data: PlayerStats[] = [];
  
  const forwardDataPromise = (async () => {
    fwd_data = await mergePlayerStats(forward_urls);
    return fwd_data;
  })();
  
  const midfieldDataPromise = (async () => {
    midfield_data = await mergePlayerStats(midfield_urls);
    return midfield_data;
  })();
  
  const defenseGkDataPromise = (async () => {
    defense_gk_data = await mergePlayerStats(defense_gk_urls);
    return defense_gk_data;
  })();
  
  export { forwardDataPromise, midfieldDataPromise, defenseGkDataPromise };
  export { PlayerStats };