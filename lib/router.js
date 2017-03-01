'use strict';

const VError = require('verror');
const assert = require('assert');
const events = require('events');
const bodyParser = require('body-parser');
const getLogger = require('./log');
const getErrorHandler = require('./error-handler');
const adapterExec = require('./adapter-exec');

var express;

try {
  express = require('express');
} catch (e) {
  /* istanbul ignore next */
  throw new VError(
    e,
    'express module not found. please run ' +
    '"npm install express@4.14 --save" in the project root'
  );
}


/**
 * Create an express.Router that exposes a backend store via an adapter
 * @param  {Object} adapter
 * @return {express.Router}
 */
module.exports = function fhRestExpressRouter (opts) {

  assert.equal(
    typeof opts.name,
    'string',
    'opts.name must be a String'
  );

  assert.equal(
    typeof opts.adapter,
    'object',
    'opts.adapter must be an object with CRUDL methods'
  );

  var log = getLogger(opts);

  var router = express.Router({
    // We need to inherit properties in the app.use that a dev might define
    mergeParams: true
  });

  // Expose event emitter. TODO: consider making this part of adapters
  router.events = new events.EventEmitter();

  // Verify that responses an adapter returns are formatted correctly
  var isValidAdapterResponse = require('./verify-adapter-response')(opts);

  // Verify that incoming requests meet formatting requirements
  var validateRequest = require('./validate-request')(opts);

  // Middleware that determines if an endpoint is supported
  var isSupported = require('./endpoint-support')(opts);

  // Need to parse incoming JSON data; we can't assume people have added
  // body parser to their express application
  router.use(bodyParser.json(opts.bodyParser));

  router.get('/', isSupported('list'), validateRequest, doList);
  router.get('/:id', isSupported('read'), validateRequest, doRead);
  router.put('/:id', isSupported('update'), validateRequest, doUpdate);
  router.post('/', isSupported('create'), validateRequest, doCreate);
  router.delete('/:id', isSupported('delete'), validateRequest, doDelete);

  // Error handler, returns errors in a JSON format
  router.use(getErrorHandler(opts));

  /**
   * Generic response handler for adapter callbacks
   * @param  {OutgoingResponse}   res
   * @param  {Function}           next
   */
  function onAdapterExecComplete (fnName, res, next) {
    return function _execComplete (err, newData, extraData) {
      var e;

      if (err) {
        e = new VError(
          err,
          'error executing adapter function "%s"',
          fnName
        );

        router.events.emit(fnName + '-fail', e);

        next(e);
      } else if (newData && !isValidAdapterResponse(fnName, newData)) {
        e = new VError(
          'invalid response from adapter for "%s" call. response: %j',
          fnName,
          newData
        );

        router.events.emit(fnName + '-fail', e);

        next(e);
      } else if (newData) {
        router.events.emit(fnName + '-success', newData, extraData);

        res.json(newData);
      } else {
        res.status(404).json({
          msg: 'not found'
        });
      }
    };
  }

  function doList (req, res, next) {
    log.debug('performing list with query %j', req.query);
    adapterExec(
      opts.adapter,
      'list',
      {
        routeParams: req.params,
        query: req.query
      },
      onAdapterExecComplete('list', res, next)
    );
  }

  function doRead (req, res, next) {
    log.debug('performing read for id %s', req.params.id);
    adapterExec(
      opts.adapter,
      'read',
      {
        routeParams: req.params,
        query: req.query,
        id: req.params.id
      },
      onAdapterExecComplete('read', res, next)
    );
  }

  function doUpdate (req, res, next) {
    log.debug(
      'performing update for id %s with data %j',
      req.params.id,
      req.body
    );

    var exec = function (done) {
      adapterExec(
        opts.adapter,
        'update',
        {
          routeParams: req.params,
          id: req.params.id,
          data: req.body
        },
        done
      );
    };

    var cb = onAdapterExecComplete('update', res, next);

    if (opts.emitOldDataOnUpdate) {
      opts.adapter.read({
        id: req.params.id
      }, function (err, oldData) {
        if (err) {
          cb(err);
        } else if (!oldData) {
          cb(null, null);
        } else {
          exec(function (err, newData) {
            cb(err, newData, oldData);
          });
        }
      });
    } else {
      exec(cb);
    }
  }

  function doCreate (req, res, next) {
    log.debug('performing create with data %j', req.body);
    adapterExec(
      opts.adapter,
      'create',
      {
        routeParams: req.params,
        data: req.body
      },
      onAdapterExecComplete('create', res, next)
    );
  }

  function doDelete (req, res, next) {
    log.debug('performing delete for id %s', req.params.id);
    adapterExec(
      opts.adapter,
      'delete',
      {
        routeParams: req.params,
        id: req.params.id
      },
      onAdapterExecComplete('delete', res, next)
    );
  }

  log.info('%s router created', opts.name);

  return router;
};
