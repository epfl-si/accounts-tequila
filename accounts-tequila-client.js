/**
 * Authenticate against EPFL's Tequila system
 *
 * Not much here – Authentication is best left to servers.
 */
Tequila = { options: {} };

Meteor.startup(function() {
  if ($('html').attr('tequila-redirected')) {
    window.history.replaceState({}, window.title, window.location.pathname);
  }
});
