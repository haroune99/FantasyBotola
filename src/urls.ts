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
  const fwd_max_offset: number = 460;
  
  const fwd_base_url_1: string = 'https://www.sofascore.com/api/v1/unique-tournament/937/season/65433/statistics?limit=20&order=-rating&accumulation=total&fields=goals%2CpenaltyWon%2Cassists%2CyellowCards%2CredCards%2CminutesPlayed&filters=position.in.G~D~M~F';
  const forward_urls_1: string[] = generateUrls(fwd_base_url_1, offsetIncrement, fwd_max_offset);
  
  const fwd_base_url_2: string = 'https://www.sofascore.com/api/v1/unique-tournament/937/season/65433/statistics?limit=20&order=-rating&accumulation=total&fields=ownGoals&filters=position.in.G~D~M~F';
  const forward_urls_2: string[] = generateUrls(fwd_base_url_2, offsetIncrement, fwd_max_offset);
  
  const forward_urls: string[] = [...forward_urls_1, ...forward_urls_2];
  
  export { forward_urls };