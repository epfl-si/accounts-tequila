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
Tequila = {
  options: {},   // Options matter only on the server
  get: _.memoize(function() {
    var ejson = $('html').attr('ejson-tequila');
    return ejson ? EJSON.parse(ejson) : undefined;
  })
};

Meteor.startup(function() {
  if (Tequila.get() && Tequila.get().redirected) {
    var locationWithoutTequilaKey = window.location.pathname,
        queryString = window.location.search;
    if (queryString) {
      locationWithoutTequilaKey = locationWithoutTequilaKey +
        queryString.replace(/([?&])key=([^&]*)(&|$)/,
          function(matched, sep1, key, sep2) {
            return sep2 ? sep1 : "";   // Although in practice it looks like
                                       // the Tequila key is always last
          });
    }
    window.history.replaceState({}, window.title, locationWithoutTequilaKey);
  }
});
