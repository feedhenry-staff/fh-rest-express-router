'use strict';

const validators = {
  create: function validateCreate (res) {
    // Verify a plain object was returned
    return (
      isObject(res) &&
      res.hasOwnProperty('uid') &&
      res.hasOwnProperty('data')
    );
  },

  read: function validateRead (res) {
    return isObject(res);
  },

  update: function validateUpdate (res) {
    return isObject(res);
  },

  delete: function validateDelete (res) {
    return isObject(res);
  },

  list: function validateList (res) {
    return isObject(res);
  }
};

/**
 * Validates that the response returned by an adapater conforms to the expected
 * format. This means it should always be an Object and contain certain keys.
 * @param  {[type]} opts [description]
 * @return {[type]}      [description]
 */
module.exports = function isValidResponse (opts) {
  const log = require('./log')(opts);

  return function _validateResponse (type, response) {
    log.debug(
      'validating response for "%s" call. response is:', type, response
    );

    return validators[type](response);
  };
};

function isObject (val) {
  return (
    typeof val === 'object' &&
    val !== null &&
    !Array.isArray(val)
  );
};
