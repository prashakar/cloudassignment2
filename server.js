var express = require('express');
var stormpath = require('express-stormpath');
var request = require('request');
var http = require('http');

// use express for serving webpages
var app = express();

var server = require('http').Server(app);

var io = require('socket.io')(server);

// database related tasks, setup
var sqlite3 = require('sqlite3').verbose();
// create userData db
var db = new sqlite3.Database('userData.db');
var check;
var stmt;
// used to store all img urls
var gifs = [];

// if table doesnt exist, create it
db.serialize(function() {
  db.run("CREATE TABLE if not exists user_data (gif TEXT)")
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

var srvSockets = io.sockets.sockets;

// access to actual data, only allow if auth
app.use('/data', stormpath.authenticationRequired, function(req, res) {

  io.on('connection', function(socket) {
    io.emit('test', { numClients: Object.keys(srvSockets).length });
    // socket.emit('test', { message: 'A new user has joined!' });
  });


  //
  // io.on('connection', function(socket) {
  //   numClients++;
  //   io.emit('test', { numClients: numClients });
  //
  //   console.log('Connected clients:', numClients);
  //
  //   socket.on('disconnect', function() {
  //     numClients--;
  //     io.emit('test', { numClients: numClients });
  //
  //     console.log('Connected clients:', numClients);
  //   });
  // });

  // prepare the url
  var url = "http://api.giphy.com/v1/gifs/search?q=" +
  encodeURIComponent(req.user.customData.gif) +
  "&api_key=dc6zaTOxFJmzC";

  console.log(url)
  request(url, function(error, response, body) {
    // here is the response, parse it
    var dataJson = JSON.parse(body).data
    // used to store all img urls
    var allGifs = [];
    // check if response is empty
    if (dataJson.length > 0) {
      // iterate each gif and add to the storage
      for (var obj of dataJson) {
        allGifs.push(obj.images.original.url)
        gifs.push(obj.images.original.url)
        stmt.run(obj.images.original.url);
        console.log(obj.images.original.url)
      }
      heading = "Check out these gifs related to your search"
      hasResults = true
    } else {
      // no gifs found, enter another actor
      heading = "Sorry no results, update your profile!"
      hasResults = false
    }
    // render the html
    res.render('data', {
      title: 'Your results',
      hasResults: hasResults,
      heading: heading,
      allImages: allGifs
    });
  });
});

// access to actual data, only allow if auth
app.use('/saved', stormpath.authenticationRequired, function(req, res) {

  // db.each("SELECT rowid as id, gif FROM user_data", function(err, row) {
  //   console.log(row.id + " SAVED: " + row.gif);
  // });
  console.log(gifs)
  // check if any gifs have been saved
  if (gifs.length > 0) {
    heading = "Here your saved gifs"
    hasResults = true
  } else {
    // no gifs found, enter another actor
    heading = "Looks like you don't have any gifs saved!"
    hasResults = false
  }
  // render the html
  res.render('saved', {
    title: 'Saved gifs',
    hasResults: hasResults,
    heading: heading,
    allImages: gifs
  });
});

// just log when stormath is ready
app.on('stormpath.ready',function(){
  console.log('Stormpath Ready')
});

// log when server is ready to go and listening
server.listen(process.env.PORT || 3000, function() {
  console.log('Server started!');
});
