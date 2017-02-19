/*
 * Authenticate against EPFL's Tequila system
 */
var os = Npm.require("os"),
  Protocol = Npm.require("passport-tequila/lib/passport-tequila/protocol.js"),
  debug = Npm.require("debug")("accounts-tequila");

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
        debug("Looks like user got redirected back from Tequila, with key=%s", req.query.key);
        return req.query.key;
      }
    },
    /**
     * Whether this url is powerless (non-secret, no side-effects on server)
     *
     * @param url A URL in the server's URL space
     * @returns {boolean}
     * @private
     */
    _urlIsPowerless: function(url) {
      var pathname = Npm.require('url').parse(url).pathname;
      // Special cases gleaned by reading meteor/packages/webapp/webapp_server.js
      if (pathname === "/favicon.ico" || pathname === "/robots.txt" ||
          pathname === "/app.manifest") {
        return true;
      } else if (WebAppInternals.staticFiles[pathname]) {
        return true;
      }
    },
    _validateKeyAsync: function(key, done) {
      if (_sessionCache[key]) {
        process.nextTick(function() {
          debug("Key %s: Session cache hit with %j", key, _sessionCache[key]);
          done.apply({}, _sessionCache[key]);
        });
      } else {
        debug("Key %s: Session cache miss", key);
        protocol.fetchattributes(key, function(err, tequilaResults) {
          if (err) {
            debug("Key %s: Tequila fetchattributes error %j", key, err);
            _sessionCache[key] = [err];
          } else {
            debug("Key %s: Tequila fetchattributes success → %j", key, tequilaResults);
            _sessionCache[key] = [null, tequilaResults];
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
          debug("Redirecting user to Tequila for %s", req.url);
          protocol.requestauth(res, results);
        }
      })
    },
    _connectMiddleware: function(req, res, next) {
      if (self._urlIsPowerless(req.url)) {
        // It makes no sense to insist on Tequila protection for the app's JS or CSS payload etc;
        // let this slide.
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

      var tequilaResults;
      try {
        tequilaResults = Meteor.wrapAsync(self._validateKeyAsync)(key);
        var userId = getIdFromResults(tequilaResults);
        if (! userId) {
          debug("Key %s: user unknown! (%j)", key, tequilaResults);
          return { error: TequilaUnknownUserError(tequilaResults) };
        } else {
          debug("Key %s: tequila.authenticate successful, user ID is %s", key, userId);
          return { userId: userId };
        }
      } catch (err) {
        debug("Key %s: meteorLoginHandler threw with %j", key, err);
        return { error: err };
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
