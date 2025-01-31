import fetch from 'node-fetch';

// Define the type for the player statistics
interface PlayerStats {
  player: {
    name: string;
    slug: string;
  };
  goals: number;
  penaltyGoals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  minutesPlayed: number;
}

// Function to fetch data from the URL
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

// Example usage
const url = 'https://www.sofascore.com/api/v1/unique-tournament/937/season/65433/statistics?limit=20&order=-rating&accumulation=total&fields=goals%2CpenaltyGoals%2Cassists%2CyellowCards%2CminutesPlayed%2CredCards&filters=position.in.G~D~M~F';

fetchPlayerStats(url).then((playerStats) => {
    console.log('Player Stats:', playerStats[0]);
  });



