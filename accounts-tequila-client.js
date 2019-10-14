import { ReactiveVar } from 'meteor/reactive-var'

var tequilaInfo = new ReactiveVar()

export function get () {
  return tequilaInfo.get()
}

function __(/* args */) {
  if (Package['tap-i18n']) {
    return TAPi18n.__.apply(TAPi18n, arguments);
  } else {
    return arguments[0];
  }
};

export function start () {
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

Accounts.onLoginFailure(function() {
  // We sent a Tequila key to the server and it told us that it was bad.
  // Confused we are. Reload the entire app.
  window.alert(__("Tequila login failure"))
  window.location.href = "/"
});
