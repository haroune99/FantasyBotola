import fs from 'fs';
import csv from 'csv-parser';

interface RawPlayer {
  name: string;
  marketValue: number;
  club: string;
  position: 'GK' | 'DEF' | 'MID' | 'FWD';
}

interface PricedPlayer extends RawPlayer {
  fantasyPrice: number;
}

// 1) Read & parse CSV
async function processPlayerValues(filePath: string): Promise<RawPlayer[]> {
  const players: RawPlayer[] = [];
  return new Promise<RawPlayer[]>((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(
        csv({
          mapHeaders: ({ header }) => header.trim()
        })
      )
      .on('data', (row) => {
        try {
          players.push({
            name: row['Player Name'].trim(),
            marketValue: convertMarketValue(row['Market Value']),
            club: row.Club.trim(),
            // read the position column (GK, DEF, MID, FWD)
            position: row.Position.trim() as 'GK' | 'DEF' | 'MID' | 'FWD'
          });
        } catch (error) {
          console.error(`Error processing row: ${JSON.stringify(row)}`, error);
        }
      })
      .on('end', () => resolve(players))
      .on('error', reject);
  });
}

// 2) Convert from CSV field to numeric real market values
function convertMarketValue(valueStr: string): number {
  if (valueStr.trim() === '-') return 0.01;
  const cleaned = valueStr.replace(/€|,/g, '').toLowerCase();
  const match = cleaned.match(/([\d.]+)([mk])/);
  if (!match) {
    console.warn(`Invalid value format: ${valueStr}, defaulting to 0.01M`);
    return 0.01;
  }
  const value = parseFloat(match[1]);
  const multiplier = match[2];
  return multiplier === 'k' ? value / 1000 : value; // 'K' => thousands, 'M' => millions
}

// 3) Define piecewise breakpoints for base price (regardless of position)
//    We'll linearly interpolate between them based on percentile.
const PRICE_BREAKPOINTS = [
  { pct: 0.0, price: 12.5 }, // top player(s)
  { pct: 0.01, price: 10.0 }, // top 1%
  { pct: 0.05, price: 8.0 },  // top 5%
  { pct: 0.25, price: 6.0 },  // top 25%
  { pct: 0.75, price: 5.0 },  // top 75%
  { pct: 1.0, price: 4.0 },   // bottom players
];

function getFantasyPriceByPercentile(pct: number): number {
  for (let i = 0; i < PRICE_BREAKPOINTS.length - 1; i++) {
    const current = PRICE_BREAKPOINTS[i];
    const next = PRICE_BREAKPOINTS[i + 1];
    if (pct >= current.pct && pct <= next.pct) {
      // Linear interpolation between current and next
      const rangePct = (pct - current.pct) / (next.pct - current.pct);
      const interpolated = current.price + rangePct * (next.price - current.price);
      // Round to nearest 0.5
      return Math.round(interpolated * 2) / 2;
    }
  }
  // fallback, if out of range for some reason
  return 4.0;
}

// 4) Position multipliers or adjustments
//    Example: GK and DEF are cheaper, MID is baseline, FWD is more expensive.
//    Tweak these factors or define more advanced logic as needed.
const POSITION_MULTIPLIERS: Record<RawPlayer['position'], number> = {
  GK: 0.75,
  DEF: 0.85,
  MID: 1.0,
  FWD: 1.2,
};

function applyPositionAdjustment(basePrice: number, position: RawPlayer['position']): number {
  const multiplier = POSITION_MULTIPLIERS[position] || 1.0;
  // Then round again after multiplier
  const adjusted = basePrice * multiplier;
  return Math.round(adjusted * 2) / 2;
}

// 5) Sort, compute percentiles, map to fantasy prices, adjust by position.
async function generateFantasyPrices(filePath: string): Promise<PricedPlayer[]> {
  // read raw players
  const players = await processPlayerValues(filePath);

  // sort descending by real market value
  players.sort((a, b) => b.marketValue - a.marketValue);

  const total = players.length;

  return players.map((player, index) => {
    // percentile (0 at top, 1 at bottom)
    const percentile = index / (total - 1);

    // base price from piecewise percentile
    const basePrice = getFantasyPriceByPercentile(percentile);

    // final price adjusted by position
    const fantasyPrice = applyPositionAdjustment(basePrice, player.position);

    return { ...player, fantasyPrice };
  });
}

// MAIN usage example
generateFantasyPrices('./data/botola mv.csv')
  .then((players) => {
    // see the first 100 players
    console.table(players.slice(0, 100));
  })
  .catch(console.error);
