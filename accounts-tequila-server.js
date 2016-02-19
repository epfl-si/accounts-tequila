/**
 * Authenticate against EPFL's Tequila system
 */
var Protocol = Npm.require("passport-tequila/lib/passport-tequila/protocol.js"),
  debug = Npm.require("debug")("accounts-tequila"),
  Future = Meteor.npmRequire('fibers/future');

function tequilaRedirectHTTP(req, res, next, protocol) {
  if (req.query && req.query.key) {
    debug("Looks like user is back from Tequila, with key=" + req.query.key);
    // Do *NOT* resolve the key with the Tequila server just yet. That key is
    // single-use; and we'd rather associate the Tequila credentials with the
    // Meteor session, rather than the current one-shot HTTP query which will be
    // closed soon. Since the client is going to see the key in the URL anyway,
    // let it pass it back to us through a "tequila.authenticate" Meteor.call,
    // and we'll validate it then (see below).
    next();
  } else {
    var url = req.originalUrl;
    protocol.createrequest(req, res, function (err, results) {
      if (err) {
        next(err);
      } else {
        debug("Redirecting user to Tequila for " + url);
        protocol.requestauth(res, results);
      }
    });
  }
}

Tequila.start = function startServer() {
  var protocol = new Protocol();
  _.extend(protocol, Tequila.options);
  if (Tequila.options.fakeLocalServer) {
    setupFakeLocalServer(Tequila.options.fakeLocalServer, protocol);
  }

  var connect = Npm.require('connect')();
  _.each(Tequila.options.bypass, function (url) {
    connect.use(url, function (req, res, next) {
      req.tequila = {whitelisted: true};
      next();
    });
  });
  connect.use(Npm.require('connect-query')());
  _.each(Tequila.options.control, function (url) {
    connect.use(url, function (req, res, next) {
      if (req.tequila && req.tequila.whitelisted) {
        next();
        return;
      }
      tequilaRedirectHTTP(req, res, next, protocol);
    });
  });
  WebApp.rawConnectHandlers.use(connect);

  Accounts.registerLoginHandler(function(options) {
    var key = options.tequilaKey;
    if (! key) return undefined;
    debug("tequila.authenticate with key=" + key);
    try {
      function fetchattributes(cb) {
        return protocol.fetchattributes(key, cb);
      }
      var results = Meteor.wrapAsync(fetchattributes)();
    } catch (e) {
      debug("fetchattributes error:", e);
      return { error: e };
    }
    try {
      var userId = getIdFromResults(results);
      debug("tequila.authenticate successful, user ID is " + userId);
      return { userId: userId };
    } catch (e) {
      return { error: e };
    }
  });
};

function getIdFromResults(results) {
  var loggedInUser = Tequila.options.getUserId(results);
  if (loggedInUser.forEach) { // Cursor
    var returned = new Future;
    loggedInUser.forEach(function (error, value) {
      if (error) {
        if (! returned.isResolved()) {
          returned.throw(error);
        }
      } else {
        if (! returned.isResolved()) {
          returned.return(value);
        }
      }
    });
    return returned.wait();
  } else if (loggedInUser._id) {
    return loggedInUser._id;
  } else {
    return loggedInUser;
  }
}

function setupFakeLocalServer(configForFake, protocol) {
  var fakes = Npm.require("passport-tequila/test/fakes.js"),
    FakeTequilaServer = fakes.TequilaServer;
  if ("port" in configForFake) {
    var https = Npm.require("https");
    var port = configForFake.port;
    console.log("Using fake Tequila server already running at port "
      + port);
    protocol.tequila_host = "localhost";
    protocol.tequila_port = port;
    protocol.agent = new https.Agent({ca: fakes.certificate});
  } else if (configForFake === true) {
    // TODO: This doesn't actually work, because the devDependencies of
    // FakeTequilaServer are not available.
    var fakeTequilaServer = Tequila.fakeLocalServer =
      new FakeTequilaServer();
    Meteor.wrapAsync(fakeTequilaServer.start)();
    console.log("Fake Tequila server listening at " +
      "https://localhost:" + Tequila.fakeTequilaServer.port + "/");
    _.extend(protocol, fakeTequilaServer.getOptions());
  } else {
    throw new Error("setupFakeLocalServer: " +
      "unable to determine what to do for config " + configForFake);
  }
}
