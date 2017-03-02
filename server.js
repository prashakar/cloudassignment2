var express = require('express');
var stormpath = require('express-stormpath');
var request = require('request');

// use express for serving webpages
var app = express();

// database related tasks, setup
var sqlite3 = require('sqlite3').verbose();
// create userData db
var db = new sqlite3.Database('userData.db');
var check;
var stmt;
// used to store all img urls
var movieImages = [];

// if table doesnt exist, create it
db.serialize(function() {
  db.run("CREATE TABLE if not exists user_data (movie TEXT)")
  stmt = db.prepare("INSERT INTO user_data VALUES (?)");
});

app.set('views', './views');
app.set('view engine', 'jade');

// used for user login storage
app.use(stormpath.init(app, {
  expand: {
    customData: true
  }
}));

// main route
app.get('/', stormpath.getUser, function(req, res) {
  res.render('home', {
    title: 'Welcome'
  });
});

// profile route, only allow if auth
app.use('/profile', stormpath.authenticationRequired, require('./profile')());

// access to actual data, only allow if auth
app.use('/data', stormpath.authenticationRequired, function(req, res) {
  // prepare the url
  var url = "http://netflixroulette.net/api/api.php?actor=" +
  encodeURIComponent(req.user.customData.favActor);
  console.log(url)
  request(url, function(error, response, body) {
    // here is the response, parse it
    var dataJson = JSON.parse(body)
    // used to store all img urls
    var viewMovieImages = [];
    // check if response is empty
    if (dataJson.length > 0) {
      // iterate each movie and add to the storage
      for (var obj of dataJson) {
        viewMovieImages.push(obj.poster)
        movieImages.push(obj.poster)
        stmt.run(obj.poster);
      }
      heading = "Here are some movies"
      hasResults = true
    } else {
      // no movies found, enter another actor
      heading = "Sorry no results, update your profile!"
      hasResults = false
    }
    // render the html
    res.render('data', {
      title: 'Your results',
      hasResults: hasResults,
      heading: heading,
      allImages: viewMovieImages
    });
  });
});

// access to actual data, only allow if auth
app.use('/saved', stormpath.authenticationRequired, function(req, res) {

  db.each("SELECT rowid as id, movie FROM user_data", function(err, row) {
    console.log(row.id + " SAVED: " + row.movie);
  });
  console.log(movieImages)
  // check if any movies have been saved
  if (movieImages.length > 0) {
    heading = "Here your saved movies"
    hasResults = true
  } else {
    // no movies found, enter another actor
    heading = "Looks like you don't have any movies saved!"
    hasResults = false
  }
  // render the html
  res.render('saved', {
    title: 'Saved movies',
    hasResults: hasResults,
    heading: heading,
    allImages: movieImages
  });
});

// just log when stormath is ready
app.on('stormpath.ready',function(){
  console.log('Stormpath Ready')
});

// log when server is ready to go and listening
app.listen(process.env.PORT || 3000, function() {
  console.log('Server started!');
});
