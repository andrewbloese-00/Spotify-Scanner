//requires env variable (see .env.example)
require("dotenv").config()

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');

// Custom Spotify API Library
const { SpotifyClient } = require("./spotify");

const port = process.env.PORT || 8888
const spotify = new SpotifyClient() //use custom spotify library

const app = express();
app.use(express.static(__dirname + '/public'))
   .use(cors())
   .use(cookieParser());


//generates and redirects user to the spotify authorization code flow url
app.get('/', function(req, res) {
  const {url,state} = spotify.getTokenRedirectURL()
  res.cookie(SpotifyClient.state_key, state);
  res.redirect(url)
});


//on successful callback from spotify auth flow, redirect user to the analyze page otherwise responds with error code (in library)
app.get('/callback', async function(req, res) {
  const { message , error } = await spotify.getTokenCallback(req,res)
  if(error) return  //handles error response inside of callback
  console.log('[Auth Success]: ',message)
  res.redirect("/analyze")
});



//perform an analysis of the signed in user's top 'n' [default 5] tracks on spotify
// returns an array of track info with audio features
app.get("/analyze", async (req,res)=>{

  //check readiness of spotify client
  if(!spotify.isReady()) {
    console.log("Client not ready, redirecting to home...")
    return res.redirect(401,"/")
  }

  //get top songs
  const { items, error:topErr} = await spotify.getTopTracks(req.query.n || 5)
  console.log('top-songs:',items)
  if(topErr){
    console.error("Failed to get top tracks....")
    res.status(400).json({error: topErr})
    return  {error:topErr}
  }
  const songIds = items.map(({id})=>id)

  //get song data and features for each top song
  const pool = [
    spotify.getSongInfo(songIds),
    spotify.getTrackFeatures(songIds)
  ]

  //pool requests
  const [ 
    {tracks,error:songDataErr},
    {features,error:featuresErr}
  ] = await Promise.all(pool)


  if(songDataErr || featuresErr) {
    res.status(400).json({errors: [
      songDataErr,featuresErr
    ]})
    return {error: "Failed to get songs and features"}
  }


  //combine 
  for(let t = 0; t < tracks.length; t++){
    for(const key in features[t]){
      tracks[t][key] = features[t][key]
    }
  }
  return res.status(200).json({tracks_and_features: tracks})

})


app.get('/refresh_token', async function(req, res) {
  const refreshed = await spotify.refresh()
  if(!refreshed) return res.status(401).json({error: "Invalid refresh token, could not get new token pair."})
});




//start the server on specified port
app.listen(port, ()=>{
  console.log(`Spotify Application Listenting on:\n > http://localhost:${port}`)
});

