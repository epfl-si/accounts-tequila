/**
 * Authenticate against EPFL's Tequila system
 */
var Protocol = Npm.require("passport-tequila/lib/passport-tequila/protocol.js"),
  debug = Npm.require("debug")("accounts-tequila");

Tequila = {
  options: {
    client: "meteor-accounts-tequila",
    autoStart: true,
    bypass: ["/app", "/merged-stylesheets.css", "/packages", "/favicon.ico"],
    control: ["/"]
  }
};

function tequilaRedirectOrAuthenticate(req, res, next, protocol) {
  if (req.query && req.query.key) {
    debug("Looks like user is back from Tequila, with key=" + req.query.key);
    protocol.fetchattributes(req.query.key, function (error, results) {
      if (error) {
        next(error);
        return;
      }
      // TODO: Meteor needs to be told about this somehow.
      req.tequila = results;
      next();
    });
  } else {
    var url = req.originalUrl;
    debug("Authenticating request to " + url);
    protocol.createrequest(req, res, function (err, results) {
      if (err) {
        next(err);
      } else {
        debug("Redirecting user to Tequila");
        protocol.requestauth(res, results);
      }
    });
  }
}

Tequila.start = function start() {
  var connect = Npm.require('connect')();
  _.each(Tequila.options.bypass, function(url) {
    connect.use(url, function(req, res, next) { 
      req.tequila = {whitelisted: true};
      next();
    });
  });
  var protocol = new Protocol();
  _.extend(protocol, Tequila.options);
  _.each(Tequila.options.control, function(url) {
    connect.use(url, function(req, res, next) {
      if (req.tequila && req.tequila.whitelisted) { next(); return; }
      tequilaRedirectOrAuthenticate(req, res, next, protocol);
    });
  });
  WebApp.rawConnectHandlers.use(connect);
};

Meteor.startup(function() {
  Meteor.defer(function() {
    if (Tequila.options.autoStart) {
      Tequila.start();
    }
  });
});


// TODO: Do Accounts.somethingsomething once user ID is known.
