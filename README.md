# Spotify Scanner

The following project consists of a Custom Spotify Web API Wrapper that enables easy to use, programmatic access to spotify Web API endpoints with authentication, as well as an example implementation of a Top Songs Analyzer that grabs the logged in spotify user's top 'n' tracks along with its 'audio features' and album artwork. 


## Usage

### Prerequisites
- Spotify Developer Account and App with `client_id` and `client_secret` at the ready. 
- Node JS installed

### Installation 
1. Navigate to a memorable directory on your machine and run git clone for this repository
```bash 
    git clone https://github.com/andrewbloese-00/Spotify-Scanner.git
```

2. It should download into a folder Spotify-Scanner, navigate into that directory and install dependencies with npm (or whatever package manager you prefer). 
```bash 
    cd Spotify-Scanner && npm install 

```

3. Configure your .env ( take a look at the given `env.example` to create your own `.env` with your spotify app credentials)
``` text
SPOTIFY_CLIENT_ID="<spotify client id>"
SPOTIFY_SECRET="<spotify client secret>"
PORT=8888
```

4. Start the server
```bash
   npm start
```
OR
```bash
  node index.js
```

you should see a similar output in your command line after starting the server

![Example Terminal Output on Launch](https://firebasestorage.googleapis.com/v0/b/storeshit.appspot.com/o/Spotify-Scanner%2Fstartup-terminal-output.png?alt=media&token=41a7d1dd-76c0-4d21-9359-b4e86bcc128f)

5. Login With Spotify: on server launch you will recieve a localhost address to open in your browser of choice. Follow the spotify login instructions and you will be automatically redirected to analyse page which will display your Spotify profile's Top 'n' songs along with various associated metadata and audio features. 

## File Descriptions
### src/spotify.js
This file contains the functions of the spotify api wrapper. Includes a time limited cache to prevent spam requests. 

### index.js
A node.js server that contains endpoints to sign in a user with Spotify and access their top 'n' songs with audio features. 










