'use strict';

var VError = require('verror')
  , assert = require('assert')
  , events = require('events')
  , bodyParser = require('body-parser')
  , getLogger = require('./log')
  , getErrorHandler = require('./error-handler')
  , express;

try {
  express = require('express');
} catch (e) {
  /* istanbul ignore next */
  throw new VError(
    e,
    'express module not found. please run ' +
    '"npm install express@4.X --save" in the project root'
  );
}


/**
 * Create an express.Router that exposes a backend store via an adapter
 * @param  {Object} adapter
 * @return {express.Router}
 */
module.exports = function fhRestExpressRouter (opts) {
  // jshint maxstatements:25
  // TODO: clean up size of this function

  assert.equal(
    typeof opts.name,
    'string',
    'opts.name must be a String'
  );

  if (opts.adapter) {
    assert.equal(
      typeof opts.adapter,
      'object',
      'opts.adapter must be an object with CRUDL methods'
    );
  } else {
    assert.equal(
      typeof opts.versions,
      'object',
      'opts.adapter must be an object with CRUDL methods'
    );

    var versions = Object.keys(opts.versions);

    assert.notEqual(
      versions,
      0,
      'you must supply at least one API version if using opts.versions'
    );

    assert(
      typeof opts.defaultVersion === 'string' && opts.defaultVersion.length > 0,
      'opts.defaultVersion is required and should be a string'
    );

    versions.forEach(function (v) {
      assert.equal(
        typeof opts.versions[v],
        'object',
        'opts.versions[' + v + '] must be an object'
      );

      assert.equal(
        typeof opts.versions[v].adapter,
        'object',
        'opts.versions[' + v + '].adapter must be an object'
      );
    });
  }

  var log = getLogger(opts);

  var router = express.Router({
    // We need to inherit properties in the app.use that a dev might define
    mergeParams: true
  });

  // Expose event emitter. TODO: consider making this part of adapters
  router.events = new events.EventEmitter();

  // Implementation of route logic
  var handlers = require('./handlers')(opts, router);

  // Verify that incoming requests meet formatting requirements
  var validateRequest = require('./validate')(opts);

  // Need to parse incoming JSON data; we can't assume people have added
  // body parser to their express application
  router.use(bodyParser.json(opts.bodyParser));

  // Binding our routes and their handlers
  router.get('/', validateRequest, handlers.list);
  router.get('/:id', handlers.read);
  router.put('/:id', validateRequest, handlers.update);
  router.post('/', validateRequest, handlers.create);
  router.delete('/:id', handlers.delete);

  // Error handler, returns errors in a JSON format
  router.use(getErrorHandler(opts));

  log.info('%s router created', opts.name);

  return router;
};
