const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const crypto = require('crypto');
const querystring = require("querystring")

const generateRandomString = (length) => {
    return crypto
    .randomBytes(60)
    .toString('hex')
    .slice(0, length);
  }


const BASE_URL = "https://api.spotify.com"
/**
 * Example Usage: 
 ```javascript
      const spotify = new SpotifyClient();
      const { url , state } = await spotify.getTokenRedirectURL()
      // user goes to url and completes sign in flow
      // ... 
      // is redirected to specified spotify redirect uri where 
      const {message, error} = await spotify.getTokenCallback(req,res) //middleware 
 ```
 */
class SpotifyClient {
    static state_key = "spotify_auth_state"
    #accessToken
    #refreshToken
    #headers
    #cache
    /**
     * 
     * @param {string?} accessToken 
     * @param {string?} refreshToken 
     */
    constructor(accessToken=undefined,refreshToken=undefined){
        if(!accessToken || !refreshToken) console.error("No token established. Must call getTokens before use!")
        this.#accessToken = accessToken
        this.#refreshToken = refreshToken
        this.#cache = new SpotifyCache();
        this.#headers = {
            "Authorization": "Bearer " + this.#accessToken
        }
        this.id = generateRandomString(10) //used for cache purposes
    }

    /**
     * @returns {Boolean} the readiness of the client (whether or not it has a current token pair)
     */
    isReady(){
        return !!this.#accessToken && !!this.#refreshToken && this.#headers.Authorization.startsWith("Bearer")
    }


    /**
     * @about Generates the redirect url and 'state' to start the spotify authorization code flow
     * @returns { url: string, state: string} the auth redirect 'url' and the expected cookie 'state' value
     */
    getTokenRedirectURL(){
        const state = generateRandomString(16)
        const url = `https://accounts.spotify.com/authorize?${querystring.stringify({
            response_type: 'code',
            client_id: process.env.SPOTIFY_CLIENT_ID,
            scope: "user-read-private user-read-email user-top-read",
            redirect_uri: `http://localhost:8888/callback`,
            state
        })}`
        console.log('Spotify Auth URL: ', url)
        return {url,state}
    }
    async getTokenCallback(req,res){
        try {
            //check validity of state
            const { state,code} = req.query 
            const storedState = req.cookies ? req.cookies[SpotifyClient.state_key] : null
            if(!state || state != storedState) {
                res.status(401).json({error: "[Invalid Request] State Mismatch"})
                console.error("State Mismatch Error!")
                return { error: "State Mismatch"}
            }

            //create request for auth token 
            const form = querystring.stringify({
                code,
                grant_type: "authorization_code", 
                redirect_uri: "http://localhost:8888/callback"
            })
            const authResponse = await fetch(`https://accounts.spotify.com/api/token`,{
                method: "POST",
                body: form, 
                headers: {
                    'content-type': 'application/x-www-form-urlencoded',
                    "Authorization": `Basic ${new Buffer.from(process.env.SPOTIFY_CLIENT_ID + ":" + process.env.SPOTIFY_SECRET).toString("base64") }`
                }
            })
            res.clearCookie(SpotifyClient.state_key)
    
            const body = await authResponse.json()
            console.log('authResponse Body: ',body)
            const { access_token , refresh_token } = body
            
            console.log({access_token,refresh_token})

            this.#accessToken = access_token
            this.#refreshToken = refresh_token
            this.#headers.Authorization = `Bearer ${this.#accessToken}`
            return { message: `Successfully obtained access and refresh tokens!`}
            
        } catch (error) {
            console.error(error)
            res.status(500).json({error})
            return { error }
        }

    }

    //get the top 'n' tracks of the currently logged in user (using spotify authorization-code grant type)
    async getTopTracks(n=10){
        try {
            const url = `${BASE_URL}/v1/me/top/tracks?limit=${n}`
            const cacheEntry = this.#cache.check(url,this.id)
            if(cacheEntry) return { items: cacheEntry}
            
            const response = await fetch(url,{
                method: "GET",
                headers: this.#headers
            })
            const{items} = await response.json()
            if(!items) throw new Error("Failed to fetch items")

            this.#cache.insert(url,this.id,items)

            return { items: items }
            
        } catch (error) {
            console.error(error)
            return { error }
        }
    }


    
    //get info including album name, album art, artist name(s) and release date given an array of track IDs
    async getSongInfo(ids){
        try {
            const IDS = ids.join(",")
            const url = `${BASE_URL}/v1/tracks?ids=${IDS}`
            const cacheEntry = this.#cache.check(url,this.id)
            if(cacheEntry) return { tracks: cacheEntry}

            const response = await fetch(url,{
                method: "GET",
                headers: this.#headers
            })
            const { tracks } = await response.json();
            const songs = tracks.map(track => ({
                id: track.id,
                name: track.name, 
                album: track.album.name,
                art: track.album.images,
                released: track.release_date, 
                artists: track.artists.map(artist=>artist.name)

            }))
            this.#cache.insert(url,this.id,songs)
            return { tracks: songs }
            
        } catch (error) {
            console.error(error);
            return { error }

        }
    }


    //aquire the detailed audio analysis information about a single track given its ID
    async getAudioAnalysis(songId){
        try {
            const url = `${BASE_URL}/v1/audio-analysis/${songId}`
            const entry = this.#cache.check(url,this.id)
            if(entry) return entry


            const response = await fetch(url,{
                headers: this.#headers
            })
            if(!response.ok) {
                console.error(await response.json())
                throw new Error("Failed to get response from spotify API")
            }
            const val = await response.json()
            this.#cache.insert(url,this.id, val)
            return val

        } catch (error) {
            console.error("failed to get audio-analysis: \n", error)
            return { error }
        }
    }
    

    //get the provided track's features (loudness,tempo,energy,etc...)
    async getTrackFeatures(ids){
        try {
            const IDS = ids.join(",")
            const url = `${BASE_URL}/v1/audio-features?ids=${IDS}`
            const entry = this.#cache.check(url,this.id)
            if(entry) return { features: entry}

            const response = await fetch(url,{
                method: "GET",
                headers: this.#headers
            })
            const { audio_features } = await response.json();
            const features = audio_features.map(ft=>({
                id: ft.id,
                acousticness: ft.acousticness,
                danceability: ft.danceability,
                energy: ft.energy,
                liveness: ft.liveness,
                loudness: ft.loudness,
                speechiness: ft.speechiness,
                instramentalness: ft.instramentalness,
                tempo: ft.tempo,
                valence: ft.valence
            }))
            this.#cache.insert(url,this.id,features)

            return { features }


        } catch (error) {
            console.error(error);
            return { error }
    
        }    
    }

    
    /**
     * @about attempts to aquire a new access-refresh token pair from spotify utilizing the current refresh token. On success it will update the clients private access/refresh_token and headers attributes 
     * @returns {Promise<boolean>} T -> successfully recieved new refresh and access token || F -> failed to get new token
     * 
     * Example: 
     * ```javascript
     *  const gotToken = await spotify.refresh()
     * 
     * ```
    */
    async refresh(){
        try {
            //request a new token pair
            const response = await fetch(`https://accounts.spotify.com/api/token`,{
                method: "POST",
                headers: {
                    "content-type": "application/x-www-form-urlencoded",
                    "Authorization": `Basic ${new Buffer.from(process.env.SPOTIFY_CLIENT_ID + ":" + process.env.SPOTIFY_SECRET).toString("base_64") }`
                }, 
                body: querystring.stringify({
                    grant_type: "refresh_token",
                    refresh_token: this.#refreshToken
                }),  
            })
            const {access_token, refresh_token} = await response.json();
            if(!access_token || !refresh_token) throw new Error("Did not recieve new token pair...")

            
            //update client tokens and headers
            this.#accessToken = access_token
            this.#refreshToken = refresh_token
            this.#headers.Authorization = `Bearer ${access_token}`
            this.#cache.clear(this.id)
            return true
            
        } catch (error) {
            console.error("Failed to refresh...\n",error)
            return false; 
        }
    }


}


class SpotifyCache { 
    #max_age //the length of time the cached value remains valid
    constructor(max_age=1_800_000){
        this.#max_age = max_age
        /**
         * @type {{[id:string]: Map<string,{expires:number, value: any}>}}
         */
        this.clients = {}
    }
    addClient(clientId){
        this.clients[clientId] = new Map()
    }

    check(url,clientId){
        const entry = this.clients[clientId]?.get(url)
        if(!entry) return null;
        
        if(entry.expires < Date.now()){
            this.clients[clientId].delete(url)
            return null
        }
        return entry.value
    }

    insert(url,clientId,value){
        if(!this.clients[clientId]) this.clients[clientId] = new Map();
        this.clients[clientId].set(url,{value, expires: Date.now() + this.#max_age})
    }

    clear(id){
        if(this.clients[id])
            this.clients[id].clear()
    }

}


module.exports = {SpotifyClient}