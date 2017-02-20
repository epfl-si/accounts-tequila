Package.describe({
  name: 'epfl:accounts-tequila',
  version: '0.2.0',
  summary: 'Log in to Web apps using EPFL\'s [Tequila](http://tequila.epfl.ch/)',
  git: 'https://github.com/epfl-sti/accounts-tequila',
  documentation: 'README.md'
});

Package.onUse(function(api) {
  api.versionsFrom('METEOR@1.3');
  api.use('accounts-base');
  api.use('underscore');
  api.use('webapp', 'server');
  api.use('reactive-var', 'client');
  api.use('tmeasday:html5-history-api@4.1.2');
  api.addFiles('accounts-tequila-common.js');
  api.addFiles('accounts-tequila-client.js', ['client']);
  api.addFiles('accounts-tequila-server.js', ['server']);
  api.export("Tequila");
});

Package.onTest(function(api) {
  api.use('ecmascript');
  api.use('tinytest');
  api.addFiles('accounts-tequila-tests.js');
});

Npm.depends({
  "connect": "3.6.0",
  "connect-query": "0.2.0",
  "url": "0.11.0",
  "debug": "2.6.1",
  "passport-tequila": "0.1.12"
});
