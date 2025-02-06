"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.defense_gk_urls = exports.midfield_urls = exports.forward_urls = void 0;
// Function to generate all the URLs for the given base URL 
function generateUrls(baseUrl, offsetIncrement, maxOffset) {
    const urls = [];
    for (let offset = 0; offset <= maxOffset; offset += offsetIncrement) {
        const url = `${baseUrl}&offset=${offset}`;
        urls.push(url);
    }
    return urls;
}
// Define the base URL and parameters
const offsetIncrement = 20;
const fwd_max_offset = 80;
const mid_max_offset = 200;
const def_gk_max_offset = 160;
const fwd_base_url_1 = 'https://www.sofascore.com/api/v1/unique-tournament/937/season/65433/statistics?limit=20&order=-rating&accumulation=total&fields=goals%2Cassists%2CpenaltyWon%2CminutesPlayed%2CyellowCards%2CredCards&filters=position.in.F';
const forward_urls_1 = generateUrls(fwd_base_url_1, offsetIncrement, fwd_max_offset);
const fwd_base_url_2 = ' https://www.sofascore.com/api/v1/unique-tournament/937/season/65433/statistics?limit=20&order=-rating&accumulation=total&fields=ownGoals&filters=position.in.F';
const forward_urls_2 = generateUrls(fwd_base_url_2, offsetIncrement, fwd_max_offset);
const forward_urls = [...forward_urls_1, ...forward_urls_2];
exports.forward_urls = forward_urls;
const mid_base_url_1 = 'https://www.sofascore.com/api/v1/unique-tournament/937/season/65433/statistics?limit=20&order=-rating&accumulation=total&fields=goals%2CpenaltyWon%2Cassists%2CminutesPlayed%2CredCards%2CyellowCards&filters=position.in.M';
const midfield_urls_1 = generateUrls(mid_base_url_1, offsetIncrement, mid_max_offset);
const mid_base_url_2 = 'https://www.sofascore.com/api/v1/unique-tournament/937/season/65433/statistics?limit=20&order=-rating&accumulation=total&fields=ownGoals%2CpenaltiesTaken%2CpenaltyGoals%2CcleanSheet&filters=position.in.M';
const midfield_urls_2 = generateUrls(mid_base_url_2, offsetIncrement, mid_max_offset);
const midfield_urls = [...midfield_urls_1, ...midfield_urls_2];
exports.midfield_urls = midfield_urls;
const def_gk_base_url_1 = 'https://www.sofascore.com/api/v1/unique-tournament/937/season/65433/statistics?limit=20&order=-rating&accumulation=total&fields=goals%2Cassists%2CyellowCards%2CminutesPlayed%2CredCards%2CpenaltyWon&filters=position.in.D~G';
const def_gk_urls_1 = generateUrls(def_gk_base_url_1, offsetIncrement, def_gk_max_offset);
const def_gk_base_url_2 = 'https://www.sofascore.com/api/v1/unique-tournament/937/season/65433/statistics?limit=20&order=-rating&accumulation=total&fields=ownGoals%2CcleanSheet%2CpenaltiesTaken%2CpenaltyGoals%2CgoalsConcededOutsideTheBox%2CgoalsConcededInsideTheBox&filters=position.in.D~G';
const def_gk_urls_2 = generateUrls(def_gk_base_url_2, offsetIncrement, def_gk_max_offset);
const defense_gk_urls = [...def_gk_urls_1, ...def_gk_urls_2];
exports.defense_gk_urls = defense_gk_urls;
