Tequila = {
  options: {
    client: "meteor-accounts-tequila",
    autoStart: true,
    request: ["displayname", "uniqueid"],
    getUserId: function(tequilaResponse) {
      return Meteor.users.findOne({sciper: tequilaResponse.uniqueid});
    },
    bypass: ["/app/", "/merged-stylesheets.css", "/packages/", "/lib/",
      "/tap-i18n/", "/error-stack-parser.min.js.map", "/favicon.ico"],
    control: ["/"],
    onServerError: undefined
  }
};

Meteor.startup(function() {
  Meteor.defer(function() {
    if (Tequila.options.autoStart) {
      Tequila.start();  // In client- or server-specific code
    }
  });
});
