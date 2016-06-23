'use strict';

var VError = require('verror')
  , assert = require('assert')
  , bodyParser = require('body-parser')
  , getLogger = require('./log')
  , getErrorHandler = require('./error-handler')
  , adapterExec = require('./adapter-exec')
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
  var router = express.Router();

  // Need to parse incoming JSON data; we can't assume people have added
  // body parser to their express application
  router.use(bodyParser.json());

  router.get('/', doList);          // Generic query endpoint
  router.get('/:id', doRead);       // Get specific item
  router.put('/:id', doUpdate);     // Update specific item
  router.post('/', doCreate);       // Create new entry
  router.delete('/:id', doDelete);  // Delete specific item

  // Error handler, returns errors in a JSON format
  router.use(getErrorHandler(opts));

  /**
   * Generic response handler for adapter callbacks
   * @param  {OutgoingResponse}   res
   * @param  {Function}           next
   */
  function onAdapterExecComplete (fnName, res, next) {
    return function _execComplete (err, data) {
      if (err) {
        next(
          new VError(
            err,
            'error executing adapter function "%s"',
            fnName
          )
        );
      } else if (data) {
        res.json(data);
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
    adapterExec(
      opts.adapter,
      'update',
      {
        routeParams: req.params,
        id: req.params.id,
        data: req.body
      },
      onAdapterExecComplete('update', res, next)
    );
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
