/*
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
/**
 * Reactively obtain the current Tequila state
 *
 * @locus Client
 */
Tequila.get = _.bind(tequilaInfo.get, tequilaInfo);

function defaultServerErrorHandler(error) {
  if (error instanceof Meteor.Error) {
    alert(error.message);
  } else {
    alert(error);
  }
}

/**
 * Start Tequila authentication
 *
 * Called automatically unless `Tequila.options.autoStart` is false.
 */
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
    window.History.replaceState({}, window.title, locationWithoutTequilaKey);
    Accounts.callLoginMethod({
      methodArguments: [{tequilaKey: tequilaKey}],
      userCallback: function(result) {
        if (result instanceof Error) {
          if (Tequila.options.onServerError) {
            Tequila.options.onServerError(result);
          } else {
            defaultServerErrorHandler(result);
          }
        }
      }
    });
  }
};
