'use strict';

var VError = require('verror')
  , assert = require('assert')
  , bodyParser = require('body-parser')
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
module.exports = function (dataset, adapter) {

  assert.equal(
    typeof dataset,
    'string',
    'first parameter, dataset, must be a string'
  );

  assert.equal(
    typeof adapter,
    'object',
    'second parameter, adapter, must be an object with CRUDL methods'
  );

  var log = require('fh-bunyan').getLogger(
    require('../package.json').name + ' - ' + dataset
  );

  var router = express.Router();

  log.info('creating sync router for dataset "%s"', dataset);

  // Need to parse incoming JSON data
  router.use(bodyParser.json());

  router.get('/' + dataset + '/', doList);          // Generic query endpoint
  router.get('/' + dataset + '/:id', doRead);       // Get specific item
  router.put('/' + dataset + '/:id', doUpdate);     // Update specific item
  router.post('/' + dataset + '/', doCreate);       // Create new entry
  router.delete('/' + dataset + '/:id', doDelete);  // Delete specific item

  // Error handler, returns errors in a JSON format
  router.use(function (err, req, res, next) {
    /*jshint unused: false*/
    log.error(err);

    // TODO: allow user to override this behaviour?
    res.status(500).json({
      msg: err.toString()
    });
  });

  /**
   * Generic response handler for adapter callbacks
   * @param  {OutgoingResponse}   res
   * @param  {Function}           next
   */
  function onAdapterExecComplete (fnName, res, next) {
    return function _execComplete (err, data) {
      if (err) {
        next(new VError(err, 'error executing adapter function "%s"', fnName));
      } else {
        res.json(data);
      }
    };
  }


  /**
   * Generic function to execute adapter functions.
   *
   * Will attempt to handle exceptions that they might throw, or return an error
   * if the function is not implemented.
   *
   * @param  {Object}   adapter
   * @param  {String}   fnName
   * @param  {Object}   params
   * @param  {Function} callback
   */
  function execAdapterFunction (adapter, fnName, params, callback) {
    if (adapter[fnName]) {
      try {
        adapter[fnName](params, callback);
      } catch (e) {
        callback(
          new VError(
            e,
            'failed to exec adapter function %s for "%s" with params %j',
            fnName,
            dataset,
            params
          ),
          null
        );
      }
    } else {
      callback(
        new VError(
          'adapter has not implemented function %s for dataset "%s"',
          fnName,
          dataset
        )
      );
    }
  }

  function doList (req, res, next) {
    log.debug('performing list with query %j', req.query);
    execAdapterFunction(
      adapter,
      'list',
      {
        query: req.query
      },
      onAdapterExecComplete('list', res, next)
    );
  }

  function doRead (req, res, next) {
    log.debug('performing read for %s', req.params.id);
    execAdapterFunction(
      adapter,
      'read',
      {
        id: req.params.id
      },
      onAdapterExecComplete('read', res, next)
    );
  }

  function doUpdate (req, res, next) {
    log.debug('performing update for %s with data %j', req.params.id, req.body);
    execAdapterFunction(
      adapter,
      'update',
      {
        id: req.params.id,
        data: req.body
      },
      onAdapterExecComplete('update', res, next)
    );
  }

  function doCreate (req, res, next) {
    log.debug('performing create with data %j', req.body);
    execAdapterFunction(
      adapter,
      'create',
      {
        data: req.body
      },
      onAdapterExecComplete('create', res, next)
    );
  }

  function doDelete (req, res, next) {
    log.debug('performing delete for %s', req.params.id);
    execAdapterFunction(
      adapter,
      'delete',
      {
        id: req.params.id
      },
      onAdapterExecComplete('delete', res, next)
    );
  }

  return router;
};
