'use strict';

var loggers = {}
  , bunyan = require('fh-bunyan')
  , pkgname = require('../package.json').name;

module.exports = function getFhRestLogger (opts) {
  if (loggers[opts.name]) {
    return loggers[opts.name];
  } else {
    loggers[opts.name] = bunyan.getLogger(
      pkgname + '(router: ' + opts.name + ')'
    );

    return loggers[opts.name];
  }
};
