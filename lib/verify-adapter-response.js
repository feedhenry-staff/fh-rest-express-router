'use strict';

var getLogger = require('./log');

module.exports = function isValidResponse (opts) {
  var log = getLogger(opts);

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
}

var validators = {
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
