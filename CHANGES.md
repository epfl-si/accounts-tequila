# Version 0.3.0

- Upgrade to Meteor version 1.8,
  [passport-tequila](https://www.npmjs.com/package/passport-tequila)
  version 0.1.15

Breaking changes:
- Use ES6 `import` style throughout. Client code that was previously assuming that a global
  `Tequila` symbol just appears, now need to import it explicitly i.e.<pre>
  import Tequila from 'meteor/epfl:accounts-tequila'</pre>
- Drop support for seldom-used parts of the API, such as the `Tequila.get()` reactive variable

New features:
- Upsert users into the `Meteor.users` collection once they authenticate, with little to no
  code in your Meteor app (but retain full flexibility)
- Full support (documented) for the fake Tequila server that comes with passport-tequila

# Version 0.2.0

A lot of server-side rewrite that ended up reverted in version 0.3.0

# Version 0.1.0

- First battle-tested version in a production application, the EPFL WordPress [source of truth](https://github.com/epfl-idevelop/wp-veritas)
- Upgrade to Meteor version 1.3, passport-tequila version 0.1.10
- Use [micromatch](https://www.npmjs.com/package/micromatch) to allow wildcards in the URL filters

# Version 0.0.1

First released version for Meteor v1.2, using
[passport-tequila](https://www.npmjs.com/package/passport-tequila) for
the client-side implementation of the Tequila protocol
