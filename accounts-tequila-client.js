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

Tequila.start = function() {
  var queryString = window.location.search;
  if (! queryString) return;
  var sessionKey;
  var locationWithoutTequilaKey = window.location.pathname +
    queryString.replace(/([?&])key=([^&]*)(&|$)/,
      function(matched, sep1, key, sep2) {
        sessionKey = key;
        return sep2 ? sep1 : "";   // Although in practice it looks like
                                   // the Tequila key is always last
      });
  if (sessionKey) {
    window.history.replaceState({}, window.title, locationWithoutTequilaKey);
    tryAuthenticate(sessionKey);
  }
};

function tryAuthenticate(sessionKey) {
  Meteor.call("tequila.authenticate", sessionKey,
    function (error, teqStruct) {
      tequilaInfo.set(teqStruct)
    });
}
