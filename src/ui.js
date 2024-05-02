
function largestImageUrl(images){
    let max = 0
    for(let i = 1; i < images.length; i++){
        if(images[i].width > images[max].width) max = i
    }
    return images[max].url
}


function TopTrackCard(track_and_features,i){

    const {  name, album, art, artists, released, 
            acousticness, danceability, energy, liveness,
            loudness, speechiness, tempo,valence
    } = track_and_features

    return /*html*/`<div class="top-track">
        <h2># ${i+1}</h2>
        <div class="album-art-container">
            <img src="${largestImageUrl(art)}" alt="${album} artwork"/>
        </div>
        <h3>${name} on ${album}</h3>
        <h4>By: ${artists.join(",")}</h4>
        <h4 class="track-released">Released: ${released||"N/A"}</h4>
        
        <div class='stats'>
            ${StatCard("Acousticness", acousticness, "violet")}
            ${StatCard("Danceability", danceability, "lime")}
            ${StatCard("Energy", energy, "cyan")}
            ${StatCard("Liveness", liveness, "gold")}
            ${StatCard("Loudness", loudness, "red")}
            ${StatCard("Speechiness", speechiness, "orange")}
            ${StatCard("Valence", valence, valence < 0.5 ? "#333" :"#fff")}
        </div>
    </div>`    



}


function FillBar( percent,fillColor){
    return /*html*/`
        <div class="bar">
            <div class="bar-inner" style="width: ${percent*100}%; background-color: ${fillColor}"></div>
        </div>
    `
}


function StatCard(label, percent, fillColor){
    return /*html*/`<div class="stat-card">
        <span class="stat-title">
            ${label}
        </span>
        ${FillBar(percent,fillColor)}
    </div>`

}




function TracksPage(tracksData){

    return /*html*/`<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Spotify Scanner | Analysis Results</title>
        <style>
            * { box-sizing: border-box; }
            body { 
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: flex-start;
                background-color: #010101;
                color: #fff;
            }

            .top-track { 
                width: 80vw;
                display: flex;
                flex-direction: column;
                margin-block: 3rem;
            }

            .album-art-container { 
                width: 300px;
                height: 300px
            }
            .album-art-container img { 
                width: 100%;
                height: 100%;
                border: 3px solid #999;
            }

            .bar { 
                width: 100%;
                display: flex;
                align-items: center;
                justify-content: flex-start;
                height: 20px;
                padding: 2px;
                border: 2px solid white
            }

            .bar .bar-inner { 
                height: 100%
            }
            .stat-title { 
                font-size: 1.2rem
            }




        
        </style>
    </head>
    <body>
        ${tracksData.map((track,i) => TopTrackCard(track,i)).join("\n")}    
    </body>

    </html>`




}

module.exports = {TracksPage}