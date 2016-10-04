Package.describe({
  name: 'epfl:accounts-tequila',
  version: '0.1.0',
  summary: 'Log in to Web apps using EPFL\'s [Tequila](http://tequila.epfl.ch/)',
  git: 'https://github.com/epfl-sti/accounts-tequila',
  documentation: 'README.md'
});

Package.onUse(function(api) {
  api.versionsFrom('METEOR@1.2.1');
  api.use('ecmascript');
  api.use('ejson');
  api.use('accounts-base');
  api.use('underscore');
  api.use('webapp');
  api.use('reactive-var');
  api.use('jquery-history@1.0.2');
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
  "connect": "3.4.1",
  "connect-query": "0.2.0",
  "debug": "2.2.0",
  "passport-tequila": "0.1.10",
  "micromatch": "2.3.11"
});
