'use strict';

const getRequestType = require('../get-request-type');
const validateValidationOptions = require('./validate-validate-options');

module.exports = function (opts) {

  // Throws if any validations are malformed
  validateValidationOptions(
    opts.routeParamValidations,
    'routeParamValidations'
  );

  const log = require('../log')(opts);
  const validator = require('./validate')(opts);
  const validations = opts.routeParamValidations;

  /**
   * Middleware that will execute route param validations
   * @param  {IncomingRequest}    req
   * @param  {OutgoingResponse}   res
   * @param  {Function}           next
   * @return {undefined}
   */
  return function _routeParamsMiddleware (req, res, next) {
    const requestType = getRequestType(req);

    log.debug(
      'validating route params for request %s %s',
      req.method,
      req.originalUrl
    );

    validator(validations, requestType, req.params, function (err, params) {
      if (err) {
        next(err);
      } else {
        // Bump out old params
        // TODO should we check for added/removed keys since this would in
        // theory be impossible since it means modifying the "route" called
        req.params = params;
        next();
      }
    });
  };
};
