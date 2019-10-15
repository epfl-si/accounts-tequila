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
import { ReactiveVar } from 'meteor/reactive-var'

export default {
  get,
  start
}
var tequilaInfo = new ReactiveVar()

function get () {
  return tequilaInfo.get()
}

function __(/* args */) {
  if (Package['tap-i18n']) {
    return TAPi18n.__.apply(TAPi18n, arguments);
  } else {
    return arguments[0];
  }
};

// Documented in accounts-tequila-server.js
function start () {
  var queryString = window.location.search;
  if (! queryString) return;
  var tequilaKey;
  var locationWithoutTequilaKey = window.location.pathname +
    queryString.replace(/([?&])key=([^&]*)(&|$)/,
      function(matched, sep1, key, sep2) {
        tequilaKey = key;
        return sep2 ? sep1 : "";   // Although in practice it looks like
                                   // the Tequila key is always last
      });
  if (tequilaKey) {
    window.history.replaceState({}, window.title, locationWithoutTequilaKey);
    Accounts.callLoginMethod({
      methodArguments: [{tequilaKey: tequilaKey}]
    });
  }
};

Accounts.onLoginFailure(function(error) {
  // We sent a Tequila key to the server and it told us that it was bad.
  // Confused we are. Reload the entire app.
  window.alert(__("Tequila login failure: " + error.error.message))
  window.location.href = "/"
});
