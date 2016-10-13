'use strict';

const async = require('async');

/**
 * Generates a middleware function that will validate incoming requests.
 * Validation consits of two stages:
 *   1. Validate url params
 *   2. Validate body or querystring
 *
 * @param  {Object}   opts
 * @return {Function}
 */
module.exports = function (opts) {
  opts.bodyAndQueryValidations = opts.bodyAndQueryValidations || {};
  opts.routeParamValidations = opts.routeParamValidations || {};

  const log = require('../log')(opts);
  const routeParamValidator = require('./validate-route-params')(opts);
  const bodyAndQueryValidator = require('./validate-body-or-query')(opts);

  return function validateMiddleware (req, res, next) {

    log.debug(
      'validate request %s %s',
      req.method,
      req.originalUrl
    );

    function validateRouteParams (done) {
      log.debug(
        'validate route params for request %s %s',
        req.method,
        req.originalUrl
      );
      routeParamValidator(req, res, done);
    }

    function validateBodyOrQuery (done) {
      log.debug(
        'validate body/query for request %s %s',
        req.method,
        req.originalUrl
      );
      bodyAndQueryValidator(req, res, done);
    }

    async.series([
      validateRouteParams,
      validateBodyOrQuery
    ], function (err) {
      if (err) {
        log.warn(
          'validation failed for request %s %s with error: %s',
          req.method,
          req.originalUrl,
          err.toString()
        );

        res.status(400).json({
          msg: 'Bad Request - ' + err.toString()
        });
      } else {
        log.debug(
          'validate success for request %s %s',
          req.method,
          req.originalUrl
        );

        next();
      }
    });
  };

};
