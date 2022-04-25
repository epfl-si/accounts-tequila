/**
 * Authenticate against EPFL's Tequila system
 *
 * Authentication is best left to servers; here we just
 *
 * + remove the `?key=` in the URL query fragment added by Tequila upon
 *   redirecting back;
 * + send the key through the `Accounts.callLoginMethod` method
 *
 * @see https://github.com/meteor/meteor/search?utf8=✓&q=Accounts.callLoginMethod
 *
 */

import { Accounts } from 'meteor/accounts-base'

export default {
  start
}

function __(/* args */) {
  if (Package['tap-i18n']) {
    return TAPi18n.__.apply(TAPi18n, arguments)
  } else {
    return arguments[0]
  }
}

// Documented in accounts-tequila-server.js
function start (opts) {
  if (! opts) opts = {}

  const queryString = new URLSearchParams(window.location.search);

  if (! queryString) return

  const tequilaKey = queryString.get('key')
  const authCheckKey = queryString.get('auth_check')

  if (tequilaKey && authCheckKey) {
    queryString.delete('key')
    queryString.delete('auth_check')
    window.history.replaceState({}, window.title, `${location.pathname}${queryString.toString() ? '?' + queryString.toString() : ''}`)
    Accounts.callLoginMethod({ methodArguments: [ {tequilaKey: tequilaKey, authCheckKey: authCheckKey} ] })
  }

  Accounts.onLoginFailure(opts.onLoginFailure || defaultLoginFailureHandler)
}

function defaultLoginFailureHandler(error) {
  // We sent a Tequila key to the server and it told us that it was bad.
  // Confused we are. Reload the entire app.
  window.alert(__("Tequila login failure: " + error.error.message))
  window.location.href = "/"
}
