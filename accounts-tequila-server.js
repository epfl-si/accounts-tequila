import https from 'https'
import { Meteor } from 'meteor/meteor'
import { WebApp } from 'meteor/webapp'
import { Promise } from 'meteor/promise'
import { _ } from 'meteor/underscore'

import connect_ from 'connect'
import connectQuery from 'connect-query'

import Protocol from 'passport-tequila/lib/passport-tequila/protocol.js'

import debug_ from 'debug'
const debug = debug_('accounts-tequila')

/**
 * Authenticate against EPFL's Tequila system
 * @private
 */
function tequilaRedirectHTTP(req, res, next, protocol) {
  if (req.query && req.query.key) {
    debug("Looks like user is back from Tequila, with key=" + req.query.key)
    // Do *NOT* resolve the key with the Tequila server just yet. That key is
    // single-use; and we'd rather associate the Tequila credentials with the
    // Meteor session, rather than the current one-shot HTTP query which will be
    // closed soon. Since the client is going to see the key in the URL anyway,
    // let it pass it back to us through a "tequila.authenticate" Meteor.call,
    // and we'll validate it then (see below).
    next()
  } else {
    const url = req.originalUrl
    protocol.createrequest(req, res, function (err, results) {
      if (err) {
        next(err)
      } else {
        debug("Redirecting user to Tequila for " + url)
        protocol.requestauth(res, results)
      }
    })
  }
}

let fakeTequilaServer_

export const fakeTequilaServer = () => fakeTequilaServer_

export const defaultOptions = Object.freeze({
    client: "meteor-accounts-tequila",
    getUserId: (tequilaResponse) => Meteor.users.findOne({username: tequilaResponse.name}),
    bypass: ["/packages/", "/lib/", "/node_modules/", "/tap-i18n/", "/favicon.ico"],
    control: ["/"]
  })

/**
 * Enable Tequila with a redirect-based flow.
 *
 * Accessing any of the app's HTML URLs will now redirect to Tequila,
 * unless a ?key= URL parameter is present (indicating we are back
 * from Tequila, in which case the key be passed as a Meteor login
 * method parameter over DDP - The JS and CSS URLs are not guarded in
 * this way, so that the app may initialize as normal).
 *
 * @param {Object} opts Options
 * @param {string} opts.client Passed to `passport-tequila`'s `Protocol` object
 * @param {string} opts.service Passed to `passport-tequila`'s `Protocol` object
 * @param {string} opts.request Passed to `passport-tequila`'s `Protocol` object
 * @param {string} opts.require Passed to `passport-tequila`'s `Protocol` object
 * @param {string} opts.tequila_host Passed to `passport-tequila`'s `Protocol` object
 * @param {string} opts.tequila_port Passed to `passport-tequila`'s `Protocol` object
 * @param {string[]} opts.bypass    List of URL patterns that are *not* redirected
 *                                  to Tequila
 * @param {string[]} opts.control   List of URL patterns that are redirected to
 *                                  Tequila, subject to the exceptions stated above
 *                                  (i.e. not matching `opts.bypass`, and not when a
 *                                  ?key= URL parameter is present)
 * @param {boolean|Object} opts.fakeTequilaServer Either `{ port: portNumber }` to
 *                                  use a Tequila server already running out-of-process,
 *                                  or `true` for an in-process Tequila
 *                                  server on an ephemeral port
 * @param {function(tequilaAttributes)} opts.getUserId
 *                                  Function that takes the Tequila `fetchattributes`
 *                                  RPC response fields, and returns either the Meteor
 *                                  user ID to be used (which must be a string - See
 *                                  https://stackoverflow.com/a/24972966/435004) or
 *                                  a Promise of same.
 */
export function start (opts) {
  let options = _.extend({}, defaultOptions, opts)

  const protocol = new Protocol()
  _.extend(protocol, options)
  if (options.fakeLocalServer) {
    setupFakeLocalServer(options.fakeLocalServer, protocol).catch(console.error)
  }

  const connect = connect_()
  connect.use(connectQuery())
  _.each(options.bypass, function (url) {
    connect.use(url, function (req, res, next) {
      req.tequila = {whitelisted: true}
      next()
    })
  })
  _.each(options.control, function (url) {
    connect.use(url, function (req, res, next) {
      if (req.tequila && req.tequila.whitelisted) {
        next()
      } else {
        tequilaRedirectHTTP(req, res, next, protocol)
      }
    })
  })
  WebApp.connectHandlers.use(connect)

  Accounts.registerLoginHandler(async function(options) {
    const key = options.tequilaKey
    if (! key) return undefined
    debug("tequila.authenticate with key=" + key)
    try {
      function fetchattributes(cb) {
        return protocol.fetchattributes(key, cb)
      }
      const results = Meteor.wrapAsync(fetchattributes)()
    } catch (e) {
      debug("fetchattributes error:", e)
      return { error: e }
    }
    try {
      const userId = await getIdFromResults(results)
      if (! userId) {
        debug("User unknown!", results)
        return { error: new Meteor.Error("Tequila:user-unknown") }
      }
      debug("tequila.authenticate successful, user ID is " + userId)
      return { userId: userId }
    } catch (e) {
      return { error: e }
    }
  })
}

async function getIdFromResults(results) {
  return new Promise(function(resolve, reject) {
    (async function() {
      const loggedInUser = await options.getUserId(results)

      if (! loggedInUser) {
        return undefined
      }

      if (loggedInUser.forEach) { // Cursor
        loggedInUser.forEach(function (error, value) {
          if (error) {
            throw error
          } else {
            return value
          }
        })
    } else if (loggedInUser._id) {
      return loggedInUser._id
    } else {
      return loggedInUser
    }
  })().then(resolve).catch(reject)})
}

async function setupFakeLocalServer(configForFake, protocol) {
  let fakes
  try {
      fakes = require("passport-tequila/test/fakes.js")
  } catch (e) {
    throw diagnoseDependencies(e)
  }
  const port = configForFake.port
  if (port) {
    console.log("Using fake Tequila server already running at port "
      + port)
    protocol.tequila_host = "localhost"
    protocol.tequila_port = port
    protocol.agent = new https.Agent({ca: fakes.getCACert()})
  } else if (configForFake === true) {
    try {
      fakeTequilaServer_ = new fakes.TequilaServer()
      await promisify(fakeTequilaServer_, fakeTequilaServer_.start)()
    } catch (e) {
      throw diagnoseDependencies(e)
    }
    console.log("Fake Tequila server listening at " +
      "https://localhost:" + fakeTequilaServer_.port + "/")
    _.extend(protocol, fakeTequilaServer_.getOptions())
  } else {
    throw new Error("setupFakeLocalServer: " +
      "unable to determine what to do for config " + configForFake)
  }
}

async function diagnoseDependencies (e) {
  if (e.code !== 'MODULE_NOT_FOUND') {
    return e
  }

  console.error(e)

  const requirements = ["express", "pem", "ip", "fqdn"]
  return new Meteor.Error(
      'accounts-tequila-server:devDependencies',
     `In order to use the fake Tequila server, you need to install its<er dependencies.
Try

  meteor npm i --save-dev ${requirements.join(" ")}`
  )
}

function promisify(opt_that, f) {
  if (! f) {
    f = opt_that
    opt_that = {}
  }
  return function(/* args */) {
    const args = Array.prototype.slice.call(arguments)
    return new Promise(function(resolve, reject) {
      f.apply(opt_that, args.concat([function(error, result) {
        if (error) {
          reject(error)
        } else {
          resolve(result)
        }
      }]))
    })
  }
}
