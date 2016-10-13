'use strict';

const async = require('async');
const Joi = require('joi');
const _ = require('lodash');

/**
 * Validates list, update, and create operations using this middleware.
 * Performs validation using Joi, Joi schema(s), Joi validate option(s)
 * provided by developers.
 * @param  {Object}   opts
 * @return {Function}
 */
module.exports = function validateMiddleware (/* opts */) {
  return function doValidate (validations, type, data, next) {
    if (validations[type]) {
      // Check all validations for the given request type
      async.mapSeries(
        validations[type],
        function (validateOption, callback) {
          Joi.validate(
            data,
            validateOption.schema,
            validateOption.options,
            callback
          );
        },
        function onValidated (err, joiedParams) {
          if (err) {
            // Return the plain Joi error since it is well formed
            next(err);
          } else {
            // Assemble object from properties deemed valid from all Joi schema
            // validations executed. Since we use mapSeries it returns an array
            // of "cleansed" input objects and we need to merge them
            var validParams = _.assign.apply(_, joiedParams);

            next(null, validParams);
          }
      });
    } else {
      // Ensure we carry on and return passed in data
      next(null, data);
    }
  };
};
