/**
 * Authenticate against EPFL's Tequila system
 *
 * Authentication is best left to servers; here we just remove the
 * ?key= in the URL query fragment added by Tequila upon redirecting
 * back, and pass it to Meteor's Accounts.callLoginMethod().
 */

var tequilaInfo = new ReactiveVar();
/**
 * Reactively obtain the current Tequila state
 *
 * @locus Client
 */
Tequila.get = _.bind(tequilaInfo.get, tequilaInfo);

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
    window.history.replaceState({}, window.title, locationWithoutTequilaKey);
    Accounts.callLoginMethod({
      methodArguments: [{tequilaKey: tequilaKey}],
      userCallback: function(result) {
        if (result instanceof Error) {
          if (Tequila.options.onClientError) {
            Tequila.options.onClientError(result);
          } else if (result instanceof Meteor.Error) {
            alert(result.message);
          } else {
            alert(result);
          }
        }
      }
    });
  }
};
