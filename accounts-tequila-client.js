/**
 * Authenticate against EPFL's Tequila system
 *
 * Authentication is best left to servers; here we just
 *
 * + remove the ?key= in the URL query fragment added by Tequila upon
 *   redirecting back;
 * + decode the Tequila authentication details from the ejson-tequila=
 *   attribute of the <html> node (it being the only channel through
 *   which the server can pass data to clients without DDP).
 *
 */

var tequilaInfo = new ReactiveVar();
Tequila.get = _.bind(tequilaInfo.get, tequilaInfo);

var __ = function(/* args */) {
  if (Package['tap-i18n']) {
    return TAPi18n.__.apply(TAPi18n, arguments);
  } else {
    return arguments[0];
  }
};

Tequila.start = function startClient() {
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
      methodArguments: [{tequilaKey: tequilaKey}],
      userCallback: function(result) {
        if (result instanceof Error) {
          if (result instanceof Meteor.Error) {
            alert(__(result.error));
          } else {
            alert(result);
          }
        }
      }
    });
  }
};

Accounts.onLoginFailure(function() {
  // We sent a Tequila key to the server and it told us that it was bad.
  // Confused we are. Reload the entire app.
  window.location.href = "/";
});
