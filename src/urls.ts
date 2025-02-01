// Function to generate all the URLs for the given base URL 
function generateUrls(baseUrl: string, offsetIncrement: number, maxOffset: number): string[] {
    const urls: string[] = [];
    for (let offset = 0; offset <= maxOffset; offset += offsetIncrement) {
      const url = `${baseUrl}&offset=${offset}`;
      urls.push(url);
    }
    return urls;
  }
  
  // Define the base URL and parameters
  const offsetIncrement: number = 20;
  const fwd_max_offset: number = 80;
  const mid_max_offset: number = 200;
  const def_gk_max_offset: number = 160;
  
  const fwd_base_url_1: string = 'https://www.sofascore.com/api/v1/unique-tournament/937/season/65433/statistics?limit=20&order=-rating&accumulation=total&fields=goals%2Cassists%2CpenaltyWon%2CminutesPlayed%2CyellowCards%2CredCards&filters=position.in.F';
  const forward_urls_1: string[] = generateUrls(fwd_base_url_1, offsetIncrement, fwd_max_offset);
  
  const fwd_base_url_2: string = ' https://www.sofascore.com/api/v1/unique-tournament/937/season/65433/statistics?limit=20&order=-rating&accumulation=total&fields=ownGoals&filters=position.in.F';
  const forward_urls_2: string[] = generateUrls(fwd_base_url_2, offsetIncrement, fwd_max_offset);
  
  const forward_urls: string[] = [...forward_urls_1, ...forward_urls_2];

  const mid_base_url_1: string = 'https://www.sofascore.com/api/v1/unique-tournament/937/season/65433/statistics?limit=20&order=-rating&accumulation=total&fields=goals%2CpenaltyWon%2Cassists%2CminutesPlayed%2CredCards%2CyellowCards&filters=position.in.M';
  const midfield_urls_1: string[] = generateUrls(mid_base_url_1, offsetIncrement, mid_max_offset);
  
  const mid_base_url_2: string = 'https://www.sofascore.com/api/v1/unique-tournament/937/season/65433/statistics?limit=20&order=-rating&accumulation=total&fields=ownGoals%2CpenaltiesTaken%2CpenaltyGoals%2CcleanSheet&filters=position.in.M';
  const midfield_urls_2: string[] = generateUrls(mid_base_url_2, offsetIncrement, mid_max_offset);
  
  const midfield_urls: string[] = [...midfield_urls_1, ...midfield_urls_2];

  const def_gk_base_url_1: string = 'https://www.sofascore.com/api/v1/unique-tournament/937/season/65433/statistics?limit=20&order=-rating&accumulation=total&fields=goals%2Cassists%2CyellowCards%2CminutesPlayed%2CredCards%2CpenaltyWon&filters=position.in.D~G';
  const def_gk_urls_1: string[] = generateUrls(def_gk_base_url_1, offsetIncrement, def_gk_max_offset);
  
  const def_gk_base_url_2: string = 'https://www.sofascore.com/api/v1/unique-tournament/937/season/65433/statistics?limit=20&order=-rating&accumulation=total&fields=ownGoals%2CcleanSheet%2CpenaltiesTaken%2CpenaltyGoals%2CgoalsConcededOutsideTheBox%2CgoalsConcededInsideTheBox&filters=position.in.D~G';
  const def_gk_urls_2: string[] = generateUrls(def_gk_base_url_2, offsetIncrement, def_gk_max_offset);
  
  const defense_gk_urls: string[] = [...def_gk_urls_1, ...def_gk_urls_2];

  export { forward_urls };
  export { midfield_urls };
  export { defense_gk_urls };