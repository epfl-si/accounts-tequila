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
    control: ["/"]
  }
};

if (this.Iron) {
  Iron.Router.plugins.tequila = function (router, options) {
    router.onBeforeAction(function() {
      if (!Meteor.userId()) {
        this.render('tequila.login');  // TODO: Find a way to just do a redirect
                                       // without doing any templating in the
                                       // tequila package
        return pause();
      }
    }, options);
  };
}

Meteor.startup(function() {
  Meteor.defer(function() {
    if (Tequila.options.autoStart) {
      Tequila.start();  // In client- or server-specific code
    }
  });
});
