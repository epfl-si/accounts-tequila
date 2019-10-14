Control access to a Meteor Web app using EPFL's Tequila authentication system

Like the [passport-tequila npm](https://www.npmjs.com/package/passport-tequila), but for Meteor

# Usage

```
$ meteor add epfl:accounts-tequila
```

Then in `main.js`:

```
import Tequila from 'meteor/epfl:accounts-tequila'

Meteor.startup(function() {
  Tequila.start({
        upsert: false,
        fakeLocalServer: { host: "localhost", port: 3011 }
  })
})
```

# API Reference

<a name="start"></a>

## start(opts)
Enable Tequila with a redirect-based flow.

Accessing any of the app's HTML URLs will now redirect to Tequila,
unless a ?key= URL parameter is present (indicating we are back
from Tequila, in which case the key be passed as a Meteor login
method parameter over DDP - The JS and CSS URLs are not guarded in
this way, so that the app may initialize as normal).

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| opts | <code>Object</code> | Options |
| opts.client | <code>string</code> | Passed to `passport-tequila`'s `Protocol` object |
| opts.service | <code>string</code> | Passed to `passport-tequila`'s `Protocol` object |
| opts.request | <code>string</code> | Passed to `passport-tequila`'s `Protocol` object |
| opts.require | <code>string</code> | Passed to `passport-tequila`'s `Protocol` object |
| opts.tequila_host | <code>string</code> | Passed to `passport-tequila`'s `Protocol` object |
| opts.tequila_port | <code>string</code> | Passed to `passport-tequila`'s `Protocol` object |
| opts.bypass | <code>Array.&lt;string&gt;</code> | List of URL patterns that are *not* redirected                                  to Tequila |
| opts.control | <code>Array.&lt;string&gt;</code> | List of URL patterns that are redirected to                                  Tequila, subject to the exceptions stated above                                  (i.e. not matching `opts.bypass`, and not when a                                  ?key= URL parameter is present) |
| opts.getUserId | <code>function</code> | Function that takes the Tequila `fetchattributes`                                  RPC response fields, and returns either the Meteor                                  user ID to be used (which must be a string - See                                  https://stackoverflow.com/a/24972966/435004) or                                  a Promise of same. |

