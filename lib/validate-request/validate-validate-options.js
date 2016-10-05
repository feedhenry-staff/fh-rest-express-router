'use strict';

const isObject = require('is-object');
const assert = require('assert');
const format = require('util').format;
const _ = require('lodash');

/**
 * Validate that a validation option meets our required structure. Valid keys
 * are "create", "read", "update", "delete", and "list". Each of these keys
 * must be an Array of Objects that contains a "schema" and an ptional
 * "options" object to alter the behavior of the validator
 *
 * {
 *   create: [{
 *     schema: <JoiSchema>
 *     options: <Object>
 *   }]
 * }
 *
 * @param  {Object} validations
 * @return {undefined}
 */
module.exports = function (validations, container) {
  assert(
    isObject(validations),
    'opts.routeParamValidations must be an Object'
  );

  _.each(['create', 'read', 'update', 'delete', 'list'], function (type) {
    if (validations[type]) {
      validateValidationOption(validations, container, type);
    }
  });
};


/**
 * Validate a validation object that is passed in a key, e.g "create"
 * @param  {Object} options
 * @param  {String} container
 * @param  {String} type
 * @return {undefined}
 */
function validateValidationOption (options, container, type) {
  assert(
    Array.isArray(options[type]),
    format('opts.%s.%s must be an Array', container, type)
  );

  _.each(options[type], function (entry, idx) {
    assert(
      isObject(entry),
      format('opts.%s.%s[%d] must be an Object', container, type, idx)
    );

    assert(
      isObject(entry.schema),
      format('opts.%s.%s[%d].schema must be an Object', container, type, idx)
    );

    assert.equal(
      entry.schema.isJoi,
      true,
      format('opts.%s.%s[%d].schema must be a Joi schema')
    );

    if (entry.options) {
      assert(
        isObject(entry.options) && !Array.isArray(entry.options),
        format('opts.%s.%s[%d].schema must be an Object')
      );
    }
  });
}
