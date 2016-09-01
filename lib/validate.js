'use strict';

var assert = require('assert')
  , async = require('async')
  , VError = require('verror')
  , isObject = require('is-object')
  , getLogger = require('./log')
  , selectApiVersion = require('./select-version')
  , Joi = require('joi');

/**
 * Validates list, update, and create operations using this middleware.
 * Runs validation using Joi, and Joi schema(s) provided by developers
 * @param  {Object}   opts
 * @return {Function}
 */
module.exports = function validateMiddleware (opts) {
  opts.validations = opts.validations || {};

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

  var log = getLogger(opts);

  // Used to map request types to validators
  var httpMap = {
    PUT: 'update',
    POST: 'create',
    GET: 'list'
  };

  return function validationMiddleware (req, res, next) {
    selectApiVersion(req, function (err, version) {
      if (err) {
        next(new VError(err, 'failed to get adapter to serve request'));
      } else {
        _doValidate(version || {
          adapter: opts.adapter,
          validations: opts.validations
        });
      }
    });

    function _doValidate (version) {

      var type = httpMap[req.method.toUpperCase()];
      var data = (type === 'list') ? req.query : req.body;
      var validations = version.validations;

      if (validations && validations[type]) {
        log.debug(
          'validate request "%s" %s %s - ',
          type,
          req.method,
          req.originalUrl,
          data
        );

        // Check all validations for the given request type
        async.eachSeries(
          validations[type],
          Joi.validate.bind(Joi, data),
          function onValidated (err) {
            if (err) {
              log.warn(
                'validation failed for request %s %s with error %s. Data - ',
                req.method,
                req.originalUrl,
                err,
                data
              );
              res.status(400).json({
                msg: 'Bad Request - ' + err.toString()
              });
            } else {
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
    }

  };
};
