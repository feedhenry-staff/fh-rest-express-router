'use strict';

const loggers = {};
const bunyan = require('fh-bunyan');
const pkgname = require('../package.json').name;

/**
 * Returns a logger instance with the name of the router it represents.
 * Uses a cache to return the same logger for subsequent calls.
 * @param  {Object} opts
 * @return {Logger}
 */
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
