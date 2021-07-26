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
        ...
  })
})
```

# Fake Tequila server

This package is attuned to
[passport-tequila](https://www.npmjs.com/package/passport-tequila)'s
fake Tequila server. To use it:

1. Run the following command in your Meteor project: <pre>meteor npm i --save-dev express pem ip fqdn</pre>
1. Pass <pre>Tequila.start({..., fakeLocalServer: true })</pre><b>OR</b>
1. Do this outside of your Meteor project: <pre>git clone git@gitlab.com:epfl-sti/passport-tequila.git

</pre>
1. Pass <pre>Tequila.start({..., fakeLocalServer: { port: 3011 } })</pre>

# API Reference

## Functions

<dl>
<dt><a href="#start">start(opts)</a></dt>
<dd><p>Enable Tequila with a redirect-based flow.</p>
<p>Accessing any of the app&#39;s HTML URLs will now redirect to Tequila,
unless a ?key= URL parameter is present (indicating we are back
from Tequila, in which case the key be passed as a Meteor login
method parameter over DDP - The JS and CSS URLs are not guarded in
this way, so that the app may initialize as normal).</p>
</dd>
<dt><a href="#upsertUser">upsertUser(id, setAttributes)</a> ⇒</dt>
<dd><p>Upsert (update or insert) a record in Meteor.users</p>
<p>Newly created users must have an _id that is a string (see
<a href="https://stackoverflow.com/a/24972966/435004">https://stackoverflow.com/a/24972966/435004</a>). We use either
<code>tequila.uniqueid</code> (i.e. the person&#39;s SCIPER number) or
<code>tequila.user</code> (i.e. the person&#39;s GASPAR user name), in this order
of preference, depending on which is defined.</p>
</dd>
</dl>

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
| opts.fakeLocalServer | <code>boolean</code> \| <code>Object</code> | Either `{ port: portNumber }` to                                  use a Tequila server already running out-of-process,                                  or `true` for an in-process Tequila                                  server on an ephemeral port |
| opts.getUserId | <code>function</code> | Function that takes the Tequila `fetchattributes`                                  RPC response fields, and returns either the Meteor                                  user ID to be used (which must be a string - See                                  https://stackoverflow.com/a/24972966/435004) or                                  a Promise of same. Also, If opts.upsert is not                                  `false`, non-existent users will be auto-created                                  with the return value as their Meteor user ID;                                  see opts.upsert for details. The default behavior                                  is to return either `tequilaAttributes.uniqueid`                                  if it exists, or `tequilaAttributes.user`                                  otherwise. |
| opts.upsert | <code>function</code> | Function that takes the Tequila `fetchattributes`                                  RPC response fields, and returns either the things                                  that should be upserted in this user's `Meteor.user`                                  record (the one whose ID is the return value of                                  opts.getUserId) or a Promise for same. The default                                  implementation returns                                  `{ $set: { tequila: tequilaAttributes }}`.                                  Set opts.upsert to `false` if you don't want                                  accounts-tequila to perform automatic upsertion                                  for you (in which case you may program                                  `opts.getUserId` to auto-create users before                                  completing its Promise). If neither your code                                  (in `opts.getUserId`) nor accounts-tequila (with                                  `opts.upsert`) auto-creates users, then users                                  without a pre-existent entry in the Meteor.user                                  collection get a `Tequila:user-unknown` exception                                  to their `login` method call. |

<a name="upsertUser"></a>

## upsertUser(id, setAttributes) ⇒
Upsert (update or insert) a record in Meteor.users

Newly created users must have an _id that is a string (see
https://stackoverflow.com/a/24972966/435004). We use either
`tequila.uniqueid` (i.e. the person's SCIPER number) or
`tequila.user` (i.e. the person's GASPAR user name), in this order
of preference, depending on which is defined.

**Kind**: global function
**Returns**: Promise Resolves to the Meteor.user record when upsertion completes

| Param | Type | Description |
| --- | --- | --- |
| id | <code>string</code> | The Meteor.user ID to upsert as - Must be a                  string as per                  https://stackoverflow.com/a/24972966/435004 |
| setAttributes | <code>Object</code> | A standard MongoDB upsert payload, e.g.                 { $set: { foo: "bar" }} |

