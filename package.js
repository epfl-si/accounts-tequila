Package.describe({
  name: 'epfl:accounts-tequila',
  version: '0.3.1',
  summary: 'Log in to Web apps using EPFL\'s [Tequila](http://tequila.epfl.ch/)',
  git: 'https://github.com/epfl-si/accounts-tequila',
  documentation: 'README.md'
})

Package.onUse((api) => {
  api.versionsFrom('METEOR@1.8.1')
  api.use('modules')
  api.use('promise')
  api.use('ecmascript')
  api.use('ejson')
  api.use('accounts-base')
  api.use('underscore')
  api.use('webapp')
  api.use('tomwasd:history-polyfill@0.0.1')
  api.use('tap:i18n@1.0.0 || 0.0.0', {weak: true})
  api.mainModule('accounts-tequila-client.js', 'client')
  api.mainModule('accounts-tequila-server.js', 'server')
})

Npm.depends({
  "connect": "3.7.0",
  "connect-query": "1.0.0",
  "debug": "4.1.1",
  "express": "4.17.1",
  "fqdn": "0.0.3",
  "ip": "1.1.5",
  "pem": "1.14.4",
  "passport-tequila": "0.2.0",
  "request": "2.88.2",
  "micromatch": "4.0.2",
  "@types/micromatch": "3.1.0",
})
