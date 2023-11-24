const express = require('express');
const axios = require("axios")
const uuid = require("uuid");
const e = require('express');
const cron = require('node-cron');
const router = express.Router();

let games = [];

router.post('/start', (req, res) => {
  axios.get("https://huxley2.azurewebsites.net/crs").then(function (response) {
    let station = response.data[Math.floor(Math.random()*response.data.length)]
    let gameData = {
      id: uuid.v4(),
      crs: station.crsCode.toLowerCase(),
      name: station.stationName,
      guesses: [],
      lastEdited: Date.now(),
      lastKeepAlive: Date.now(),
      rawGuesses: []
    }
    games.push(gameData)
    res.send(gameData)
  })
});

router.get('/list', (req,res) => {
  res.send(games)
})

router.get('/show/:id', (req,res) => {
  let gameDeleted = false;
  const result = games.find(game => game.id === req.params.id);
  res.send(result || {error: "Game not found"})
})

router.patch('/guess/:id', async (req,res) => {
  const game = games.find(game => game.id === req.params.id)
  const gameIndex = games.findIndex(game => game.id === game.id);
  let gameDeleted = false;
  try {
  // CHECK IF THE CRS IS ACTUALLY VALID
  axios.get("https://huxley2.azurewebsites.net/crs").then(function (response) {
    const crs = response.data.find(e => e.crsCode.toLowerCase() == req.query.guess.toLowerCase()) || "Unknown CRS"
    if(crs == "Unknown CRS") {
    res.json({failed: true, error: "Invalid CRS."})
    gameDeleted = true;
    return false;
    }
  })

  if(gameDeleted == false) {

  game.lastEdited = Date.now()
  const guess = req.query.guess || "No guess"
  if(!game) return res.status(404).json({error: "Unknown Game", failed: true})
  if(guess == "No guess") return res.status(400).json({failed: true, error: "No guess provided"})
  let result = []
  if(game.guesses.length > 6) {
    res.json({message: "You have run out of guesses.", stationName: game.name, crs: game.crs, gameOver: true, win: false, failed: false}) 
    games.splice(gameIndex, 1) // delete the game
    gameDeleted = true
  }
  if(game.rawGuesses.includes(guess)) return res.status(400).json({error: "You have already provided this guess.", failed: true})
  for (let i = 0; i < game.crs.length; i++) {
    if (guess[i].toLowerCase() === game.crs[i].toLowerCase()) {
      await new Promise(resolve => setTimeout(resolve, 100));
      result.push({letter: guess[i], color: "green"});
    } else if (game.crs.toLowerCase().includes(guess[i].toLowerCase())) {
      await new Promise(resolve => setTimeout(resolve, 100));
      result.push({letter: guess[i], color: "yellow"});
    } else {
      await new Promise(resolve => setTimeout(resolve, 100));
      result.push({letter: guess[i], color: "red"});
    }
  }
  if (!gameDeleted) {
  game.guesses.push({guess: guess, result: result})
  game.rawGuesses.push(guess)
  }
  if(guess.toLowerCase() == game.crs.toLowerCase()) {
    res.json({failed: false, correct: true, guessesC: game.guesses.length, gameOver: true, win: true, result: result, guesses: game.guesses, station: game.name})
    games.splice(gameIndex, 1);
  } else {
    res.json({failed: false, correct: false, guessesC: game.guesses.length, gameOver: false, win: false, result: result, guesses: game.guesses, station: game.name, crs: game.crs})
  }
}
  } catch(err) {
    //the error is pointless - i do NOT care about it. it can die in a ditch. it is
    // unloved and incompitent.
  }
})


module.exports = router;
