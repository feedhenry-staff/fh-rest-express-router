'use strict';

var assert = require('assert')
  , async = require('async')
  , isObject = require('is-object')
  , getLogger = require('./log')
  , Joi = require('joi')
  , _ = require('lodash');

/**
 * Validates list, update, and create operations using this middleware.
 * Performs validation using Joi, Joi schema(s), Joi validate option(s)
 * provided by developers.
 * @param  {Object}   opts
 * @return {Function}
 */
module.exports = function validateMiddleware (opts) {
  opts.validations = opts.validations || {};
  opts.joiValidateOptions = opts.joiValidateOptions || {};

  assert(
    isObject(opts.validations),
    'opts.validations must be an Object if provided'
  );

  ['update', 'create', 'list'].forEach(function (type) {
    assert(
      opts.validations[type] === undefined ||
      opts.validations[type] === null ||
      Array.isArray(opts.validations[type]),
      'opts.validations.' + type + ' must be an Array if provided'
    );

    if (opts.validations[type]) {
      opts.validations[type].forEach(function (v, idx) {
        assert.equal(
          v.isJoi,
          true,
          'opts.validations.' + type + '[' + idx + '] must be a Joi schema'
        );
      });
    }
  });

  assert(
    isObject(opts.joiValidateOptions),
    'opts.joiValidateOptions must be an Object if provided'
  );

  ['update', 'create', 'list'].forEach(function (type) {
    if(opts.joiValidateOptions[type]) {
      assert(
        isObject(opts.joiValidateOptions[type]) &&
        !Array.isArray(opts.joiValidateOptions[type]),
        'opts.joiValidateOptions.' + type + ' must be an Object if provided'
      );
    }
  });

  var log = getLogger(opts);

  var validations = opts.validations;

  // Used to map request types to validators
  var httpMap = {
    PUT: 'update',
    POST: 'create',
    GET: 'list'
  };

  return function validationMiddleware (req, res, next) {

    var type = httpMap[req.method.toUpperCase()];
    var data = (type === 'list') ? req.query : req.body;
    var joiValidateOpts = opts.joiValidateOptions[type] || {};

    if (validations[type]) {
      log.debug(
        'validate request "%s" %s %s - ',
        type,
        req.method,
        req.originalUrl,
        data
      );

      // Check all validations for the given request type
      async.mapSeries(
        validations[type],
        function(joiSchema, callback) {
          return Joi.validate(data, joiSchema, joiValidateOpts, callback);
        },
        function onValidated (err, joiedParams) {
          if (err) {
            log.warn(
              'validation failed for request %s %s with error %s. Data was - ',
              req.method,
              req.originalUrl,
              err,
              data
            );
            res.status(400).json({
              msg: 'Bad Request - ' + err.toString()
            });
          } else {
            // Assemble object from properties deemed valid from
            // all Joi schema validations.
            var validParams = _.assign.apply(_, joiedParams);

            // See if we removed any params, if so, log it.
            var removedParams = _.difference(_.keys(data), _.keys(validParams));
            if(removedParams.length > 0) {
              log.info(
                '%s params removed for "%s" during joi validation: %j. %s %s',
                (type === 'list') ? 'req.query' : 'req.body',
                type,
                removedParams,
                req.method,
                req.originalUrl
              );
            }

            // List operates on req.query, update and create operate on req.body
            if(type === 'list') {
              req.query = validParams;
            } else {
              req.body = validParams;
            }
            next();
          }
      });
    } else {
      log.debug(
        'no validation specified for request "%s", %s %s',
        type,
        req.method,
        req.originalUrl
      );

      next();
    }
  };
};
