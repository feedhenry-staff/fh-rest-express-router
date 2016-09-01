'use strict';

module.exports = function getVersionImplementation (opts) {
  var log = require('./log')(opts)
    , defaultVersion = opts.defaultVersion;

  return function _getAdapterForRequest (req, callback) {
    var reqVersion = req.headers['x-fh-rest-api-version'];

    if (opts.adapter) {
      log.trace(
        'opts.adapter provided, not performing lookup for api version unless ' +
        'opts.versions is supplied'
      );

      callback(null, opts.adapter);
    } else if (reqVersion && opts.versions[reqVersion]) {
      log.trace('serving request as api version %s', reqVersion);

      callback(null, opts.versions[reqVersion]);
    } else if (reqVersion && !opts.versions[reqVersion]) {
      log.warn('received request for unsupported api version %s', reqVersion);

      callback(null, null);
    } else {
      log.trace('using default adapter version - %s', defaultVersion);
      callback(null, opts.versions[defaultVersion]);
    }
  };
};
