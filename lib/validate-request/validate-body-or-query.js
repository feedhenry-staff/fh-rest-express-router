'use strict';

const _ = require('lodash');
const getRequestType = require('../get-request-type');
const validateValidationOptions = require('./validate-validate-options');

module.exports = function (opts) {

  // Throws if any validations are malformed
  validateValidationOptions(
    opts.bodyAndQueryValidations,
    'bodyAndQueryValidations'
  );

  const log = require('../log')(opts);
  const validator = require('./validate')(opts);
  const validations = opts.bodyAndQueryValidations;

  /**
   * Middleware that will execute body or querystring validations
   * @param  {IncomingRequest}    req
   * @param  {OutgoingResponse}   res
   * @param  {Function}           next
   * @return {undefined}
   */
  return function _routeParamsMiddleware (req, res, next) {
    const requestType = getRequestType(req);
    const data = requestType === 'list' || requestType === 'read' ? req.query : req.body;

    log.debug(
      'validating route params for request %s %s, with type "%s"',
      req.method,
      req.originalUrl,
      requestType
    );

    validator(validations, requestType, data, function (err, validParams) {
      if (err) {
        next(err);
      } else {
        var removedParams = _.difference(_.keys(data), _.keys(validParams));

        if (removedParams.length > 0) {
          log.info(
            '%s params removed for "%s" during joi validation: %j. %s %s',
            requestType === 'list' || requestType === 'read' ? 'req.query' : 'req.body',
            requestType,
            removedParams,
            req.method,
            req.originalUrl
          );
        }

        // List ond read operate on req.query, update and create operate on req.body
        if (requestType === 'list' || requestType === 'read') {
          req.query = validParams;
        } else {
          req.body = validParams;
        }
        next();
      }
    });
  };
};
