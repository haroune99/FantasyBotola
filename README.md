# FantasyBotola
Fantasy Botola Pro App

The backend implementation is in the src folder:

1) routes folder is just the implementation of the routes as the name suggests
2) app.ts gather all the routes in one small file to avoid having a big routes file
3) data.ts is the logic to extract the data from sofascore
4) database.ts log the data in mangodb
5) incrementTransfer.ts allow the user to have one more transfer every gameweek (up to 2)
6) score.ts is the logic to calculate the scores of the players every gameweek (same logic as FPL)
7) startingEleven.ts to save your starting eleven
8) team.ts is the 15 players squad selection
9) transfer.ts is the script to make a transfer in a gameweek
10) urls are just sofascore urls
11) valueplayer.ts is the logic behind the fixed (for now) value of the players from transfermarket and the conversion to an Fantasy price
