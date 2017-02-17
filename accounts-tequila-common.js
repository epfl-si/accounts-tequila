/** @class */
Tequila = {
  /**
   * Options applied by {@link #Tequila.start}
   */
  options: {
    /**
     * The client name, as seen on the Tequila login page
     */
    client: "meteor-accounts-tequila",
    /**
     * Whether the app demands that users log in. If true, all
     * users must log in before using the app. If false, logged-out
     * users may access the app.
     */
    exclusive: true,
    /**
     * What information is requested from the Tequila server upon
     * successful authentication.
     */
    request: ["displayname", "uniqueid"],
    /**
     * Overridable function to look up the proper user in Meteor.users
     * from a successful Tequila response.
     *
     * @param tequilaResponse
     * @returns Meteor.users entry
     */
    getUserId: function(tequilaResponse) {
      return Meteor.users.findOne({sciper: tequilaResponse.uniqueid});
    },
    /**
     * What to do on the client if the server throws an exception.
     *
     * The default behavior is to alert(). Setting this on the server has no effect.
     *
     * @param {Error} error
     */
    onClientError: undefined,
    /**
     * What to do on the server in case of error during an HTTP Tequila key check.
     *
     * Makes no difference to the control flow during Accounts.callLoginMethod(), only
     * for HTTP pages or assets.
     *
     * The default behavior is to crash (serve a 503), unless the custom handler calls
     * this.redirectToTequila() synchronously (i.e. before returning).
     *
     * @param {Object} req  The Connect request object
     * @param {Error} error Either a Meteor.Error with {@attr message} equal to
     *                     "TEQUILA_USER_UNKNOWN", or an exception raised by
     *                      the accounts-tequila NPM package
     */
    onMiddlewareError: undefined
  }
};

Meteor.startup(function() {
  Meteor.defer(function() {
      Tequila.start();  // See accounts-tequila-server.js resp. accounts-tequila-client.js
  });
});
