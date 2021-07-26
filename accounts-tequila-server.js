import https from 'https'
import { Meteor } from 'meteor/meteor'
import { WebApp } from 'meteor/webapp'
import { Promise } from 'meteor/promise'
import { _ } from 'meteor/underscore'

import connect_ from 'connect'
import connectQuery from 'connect-query'
import micromatch from 'micromatch'

import Protocol from 'passport-tequila/lib/passport-tequila/protocol.js'

import debug_ from 'debug'
const debug = debug_('accounts-tequila')

/**
 * Authenticate against EPFL's Tequila system
 * @private
 */
function handleTequilaProtectedResource(req, res, next, protocol) {
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
    getUserId: (tequila) => tequila.uniqueid || tequila.user,
    upsert: (tequila) => ({ $set: { tequila: filterPersistentAttributes(tequila) }}),
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
 *                                  a Promise of same. Also, If opts.upsert is not
 *                                  `false`, non-existent users will be auto-created
 *                                  with the return value as their Meteor user ID;
 *                                  see opts.upsert for details. The default behavior
 *                                  is to return either `tequilaAttributes.uniqueid`
 *                                  if it exists, or `tequilaAttributes.user`
 *                                  otherwise.
 * @param {function(tequilaAttributes)} opts.upsert
 *                                  Function that takes the Tequila `fetchattributes`
 *                                  RPC response fields, and returns either the things
 *                                  that should be upserted in this user's `Meteor.user`
 *                                  record (the one whose ID is the return value of
 *                                  opts.getUserId) or a Promise for same. The default
 *                                  implementation returns
 *                                  `{ $set: { tequila: tequilaAttributes }}`.
 *                                  Set opts.upsert to `false` if you don't want
 *                                  accounts-tequila to perform automatic upsertion
 *                                  for you (in which case you may program
 *                                  `opts.getUserId` to auto-create users before
 *                                  completing its Promise). If neither your code
 *                                  (in `opts.getUserId`) nor accounts-tequila (with
 *                                  `opts.upsert`) auto-creates users, then users
 *                                  without a pre-existent entry in the Meteor.user
 *                                  collection get a `Tequila:user-unknown` exception
 *                                  to their `login` method call.
 * @param {function(error)} opts.onLoginFailure
 *                                  (Ignored server-side) What to do on the client if
 *                                  login fails.
 */
export function start (opts) {
  let startOptions = _.extend({}, defaultOptions, opts)

  const protocol = new Protocol()
  _.extend(protocol, startOptions)
  if (startOptions.fakeLocalServer) {
    setupFakeLocalServer(startOptions.fakeLocalServer, protocol).catch(console.error)
  }

  function maybeAddWildcard(url) {
    if (url.endsWith('/')) {
      return url + '**'
    } else {
      return url
    }
  }
  const bypass = startOptions.bypass.map(maybeAddWildcard),
      control = startOptions.control.map(maybeAddWildcard)

  const connect = connect_()
  connect.use(connectQuery())
  connect.use(function(req, res, next) {
    if ((! micromatch.isMatch(req.url, bypass)) &&
        micromatch.isMatch(req.url, control)) {
      handleTequilaProtectedResource(req, res, next, protocol)
    } else {
      next()
    }
  })
  WebApp.connectHandlers.use(connect)

  // Meteor login handlers (still) cannot be async functions:
  Accounts.registerLoginHandler((params) => Promise.await(tequilaLogin(
    startOptions, protocol, params.tequilaKey)))
}

async function tequilaLogin (opts, protocol, key) {
  if (! key) { return undefined }

  debug("tequila.authenticate with key=" + key)

  const tequilaAttributes = await promisify(protocol, protocol.fetchattributes)(key)
  const userId = await opts.getUserId(tequilaAttributes)
  if (! userId) {
    return { error: new Meteor.Error("Tequila:user-unknown") }
  } else if (typeof(userId) != 'string') {
    throw new Error("Your Meteor.user scheme must use strings as _id's; see https://stackoverflow.com/a/24972966/435004")
  } else {
    debug("tequila.authenticate successful, user ID is " + userId)
  }

  if (opts.upsert) {
    upsertUser(userId, await opts.upsert(tequilaAttributes))
  } else {
    // Give a client-side clue to nonexistent users.
    // If we return a nonexistent user ID here, Meteor will accept
    // it and attempt to persist a newly-minted session token (which
    // will be a MongoDB update with 0 objects changed, since the
    // user ID doesn't exist). The Meteor server will then send the
    // session token to the client, which immediately uses it to
    // effect a session restore method call (as a precaution against
    // precisely this kind of bugs). Obviously the session will be
    // unknown server-side, resulting in an absconse and abrubt
    // session termination client-side.
    if (! Meteor.users.findOne({_id: userId})) {
      return { error: new Meteor.Error("Tequila:user-unknown") }
    }
  }

  return { userId }
}

async function setupFakeLocalServer(configForFake, protocol) {
  const fakes = require("passport-tequila/test/fakes.js")

  if (configForFake) {
    if (configForFake.port) {
      console.log("Using fake Tequila server already running at port "
        + configForFake.port)
      setupFakeTequilaServer(protocol, "localhost", configForFake.port)
    } else {
      const fakeTequilaServer_ = new fakes.TequilaServer(configForFake)
      await promisify(fakeTequilaServer_, fakeTequilaServer_.start)()
      console.log("Fake Tequila server listening at " +
        "https://localhost:" + fakeTequilaServer_.port + "/")
      setupFakeTequilaServer(protocol, "localhost", fakeTequilaServer.port)
    }
  }

  function setupFakeTequilaServer(protocol, hostname, port) {
    protocol.tequila_host = hostname
    protocol.tequila_port = port
    protocol.agent = new https.Agent({ca: fakes.getCACert()})
 }
}

/**
 * Upsert (update or insert) a record in Meteor.users
 *
 * Newly created users must have an _id that is a string (see
 * https://stackoverflow.com/a/24972966/435004). We use either
 * `tequila.uniqueid` (i.e. the person's SCIPER number) or
 * `tequila.user` (i.e. the person's GASPAR user name), in this order
 * of preference, depending on which is defined.
 *
 * @param {string} id The Meteor.user ID to upsert as - Must be a
 *                  string as per
 *                  https://stackoverflow.com/a/24972966/435004
 *
 * @param {Object} setAttributes A standard MongoDB upsert payload, e.g.
 *                 { $set: { foo: "bar" }}
 *
 * @return Promise Resolves to the Meteor.user record when upsertion completes
 */
function upsertUser(id, setAttributes) {
  // https://stackoverflow.com/a/16362833/435004
  const c = Meteor.users.rawCollection()
  return promisify(c, c.findAndModify)(
    // https://stackoverflow.com/a/22672586/435004
    { _id: id },
    [],   // sort
    setAttributes,
    { new: true, upsert: true }
  )
}

function filterPersistentAttributes (a) {
  a = {...a}  // Shallow copy
  for (let volatileAttribute of ["status", "host", "key", "requestkey", "requesthost",
                                 "version", "authorig", "authstrength"]) {
    delete a[volatileAttribute]
  }
  return a
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
