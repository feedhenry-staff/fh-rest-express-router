'use strict';

const methodMappings = require('lodash').invert(
  require('./http-methods')
);

/**
 * We cannot use the HTTP method alone to determine the difference between
 * a "read" and "list" operation, this check does the trick.
 * @param  {IncomingRequest} req
 * @return {String}
 */
module.exports = function getRequestType(req) {
  if (req.method === 'GET' && req.params && req.params.id) {
    return 'read';
  } else {
    return methodMappings[req.method];
  }
};
