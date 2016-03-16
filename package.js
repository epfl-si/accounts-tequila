Package.describe({
  name: 'epfl:accounts-tequila',
  version: '0.0.1',
  // Brief, one-line summary of the package.
  summary: 'Log in to Web apps using EPFL\'s [Tequila](http://tequila.epfl.ch/)',
  // URL to the Git repository containing the source code for this package.
  git: 'https://github.com/epfl-sti/accounts-tequila',
  // By default, Meteor will default to using README.md for documentation.
  // To avoid submitting documentation, set this field to null.
  documentation: 'README.md'
});

Package.onUse(function(api) {
  api.versionsFrom('1.2.1');
  api.use('ecmascript');
  api.use('ejson');
  api.use('accounts-base');
  api.use('underscore');
  api.use('webapp');
  api.use('reactive-var');
  api.use('tomwasd:history-polyfill');
  api.addFiles('accounts-tequila-common.js');
  api.addFiles('accounts-tequila-client.js', ['client']);
  api.addFiles('accounts-tequila-server.js', ['server']);
  api.export("Tequila");
});

Package.onTest(function(api) {
  api.use('ecmascript');
  api.use('tinytest');
  api.use('epfl:accounts-tequila');
  api.addFiles('accounts-tequila-tests.js');
});

Npm.depends({
  "connect": "3.4.1",
  "connect-query": "0.2.0",
  "debug": "2.2.0",
  "fibers": "1.0.7",
  "passport-tequila": "https://codeload.github.com/epfl-sti/passport-tequila/tar.gz/c3eaae77c9dc702801431815ee9d059b4c4994cf"
});