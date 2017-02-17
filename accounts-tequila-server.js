/*
 * Authenticate against EPFL's Tequila system
 */
var os = require("os"),
  Protocol = require("passport-tequila/lib/passport-tequila/protocol.js"),
  debug = require("debug")("accounts-tequila"),
  Future = require('fibers/future');

const SESSION_CACHE_EXPIRY_MS = 30 * 1000;


Tequila.start = function startServer() {
  var tequilaServer = new TequilaServer();
  tequilaServer.installRawConnectHandler(WebApp.rawConnectHandlers);
  Accounts.registerLoginHandler(tequilaServer.meteorLoginHandler);
};


/**
 *
 * @returns TequilaServer object
 * @constructor
 */
function TequilaServer() {
  var protocol = new Protocol();
  _.extend(protocol, Tequila.options);
  if (Tequila.options.fakeLocalServer) {
    setupFakeLocalServer(Tequila.options.fakeLocalServer, protocol);
  }

  var _sessionCache = {};

  var self; self = {
    _getRequestKey: function(req) {
      if (req.query && req.query.key) {
        debug("Looks like user got redirected back from Tequila, with key=" + req.query.key);
        return req.query.key;
      }
      debugger;
      // TODO: also check referer
    },

    _isPrimaryRequest: function(req) {
      return req.originalUrl === "/";  // TODO XXX
    },
    _validateKeyAsync: function(key, done) {
      if (_sessionCache[key]) {
        process.nextTick(function() {
          debug("Session cache hit for key " + key);
          done.apply({}, _sessionCache[key]);
        });
      } else {
        debug("Session cache miss for key " + key);
        protocol.fetchattributes(key, function(err, tequilaResults) {
          if (err) {
            debug("Key " + key + ": Tequila error ", err);
            _sessionCache[key] = [err];
          } else {
            var userId = getIdFromResults(tequilaResults);
            if (! userId) {
              debug("Key " + key + ": User unknown!", tequilaResults);
              _sessionCache[key] = [TequilaUnknownUserError(tequilaResults)];
            } else {
              debug("Key " + key + ": tequila.authenticate successful, user ID is " + userId);
              _sessionCache[key] = [null, userId];
            }
          }
          setTimeout(function() {
            delete _sessionCache[key];
          }, SESSION_CACHE_EXPIRY_MS);
          done.apply({}, _sessionCache[key]);
        });
      }
    },
    _redirectToTequilaLoginPage: function(req, res, next) {
      protocol.createrequest(req, res, function (err, results) {
        if (err) {
          next(err);
        } else {
          debug("Redirecting user to Tequila for " + req.url);
          protocol.requestauth(res, results);
        }
      })
    },
    _connectMiddleware: function(req, res, next) {
      if (! self._isPrimaryRequest(req)) {
        // It makes no sense to redirect a secondary request (e.g. CSS, JS); so
        // we let it slide.
        // We are not protecting any secrets in the Express middleware; the Web
        // assets of the Meteor application are powerless, only DDP traffic
        // provides power to the client.
        next();
        return;
      }

      var key = self._getRequestKey(req);
      if (! key) {
        self._redirectToTequilaLoginPage(req, res, next);
      } else {
        self._validateKeyAsync(key, function(err, tequilaResults) {
          if (err) {
            self._handleTequilaErrorInMiddleware(req, res, next, err);
          } else {
            next();
          }
        });
      }
    },
    _handleTequilaErrorInMiddleware: function(req, res, next, err) {
      wantsTequilaRedirect = false;
      if (Tequila.options.onMiddlewareError) {
        Tequila.options.onMiddlewareError.call({redirectToTequila: function() {
          wantsTequilaRedirect = true;
        }}, req, err);
      }
      if (wantsTequilaRedirect) {
        self._redirectToTequilaLoginPage(req, res, next);
      } else {
        return next(err);
      }
    },
    installRawConnectHandler: function(rawConnectHandlers) {
      var connect = Npm.require('connect')();
      connect.use(Npm.require('connect-query')());
      connect.use(self._connectMiddleware);
      rawConnectHandlers.use(connect);
    },
    meteorLoginHandler: function(options) {
      var key = options.tequilaKey;  // Looped back to us by client
      if (! key) return undefined;

      var userId;
      try {
        userId = Meteor.wrapAsync(self._validateKeyAsync)(key);
        return { userId: userId };
      } catch (e) {
        return { error: e };
      }
    }
  };

  return self;
};

function getIdFromResults(tequilaResults) {
  var loggedInUser = Tequila.options.getUserId(tequilaResults);
  if (! loggedInUser) {
    return undefined;
  }
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
    var ip = getIpOfInterface(configForFake.networkInterface) || "localhost",
      port = configForFake.port;
    console.log("Using fake Tequila server on " + ip +
      " already running at port " + port);
    protocol.tequila_host = ip;
    protocol.tequila_port = port;
    protocol.agent = new https.Agent({ca: fakes.getCACert()});
  } else if (configForFake === true) {
    // TODO: This doesn't actually work, because the devDependencies of
    // FakeTequilaServer may not be available.
    var fakeTequilaServer = Tequila.fakeLocalServer =
      new FakeTequilaServer();
    Meteor.wrapAsync(fakeTequilaServer.start)();
    console.log("Will use fake Tequila server at " +
      "https://localhost:" + Tequila.fakeTequilaServer.port + "/");
    _.extend(protocol, fakeTequilaServer.getOptions());
  } else {
    throw new Error("setupFakeLocalServer: " +
      "unable to determine what to do for config " + configForFake);
  }
}

function getIpOfInterface(iface) {
  var ifaceDef =  os.networkInterfaces()[iface];
  var addressStruct = _.find(ifaceDef || [], function (addressStruct) {
    return addressStruct.family === "IPv4";
  });
  if (addressStruct) {
    return addressStruct.address;
  }
}

function TequilaUnknownUserError(tequilaResults) {
  var error = new Meteor.Error("TEQUILA_USER_UNKNOWN");
  _.extend(error, tequilaResults);
  return error;
}
