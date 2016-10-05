'use strict';

var getLogger = require('./log');

/**
 * Default error handler for API calls that encounter errors
 * @param  {Error}              err
 * @param  {IncomingRequest}    req
 * @param  {OutgoingResponse}   res
 * @param  {Function}           next
 */
module.exports = function getFhRestErrorHandler (opts) {
  var log = getLogger(opts);

  /*eslint no-unused-vars: ["error", { "argsIgnorePattern": "next" }]*/
  return function fhRestErrorHandler (err, req, res, next) {
    /*jshint unused: false*/
    var errData = {
      err: err
    };

    if (opts.verboseErrors) {
      // This will make debugging far easier, but is verbose
      errData = {
        err: err,
        method: req.method,
        url: req.originalUrl,
        body: req.body,
        query: req.query,
        headers: req.headers,
        fhRouterName: opts.name
      };
    }

    log.error(
      errData,
      'error processing request to router %s for %s %s',
      opts.name,
      req.method,
      req.originalUrl
    );

    res.status(500).json({
      msg: err.toString()
    });
  };

};
