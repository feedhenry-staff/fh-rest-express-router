'use strict';

var VError = require('verror')
  , bodyParser = require('body-parser')
  , util = require('./util')
  , express;

try {
  express = require('express');
} catch (e) {
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
module.exports = function (adapter) {
  var router = express.Router();

  // Need to parse incoming JSON data
  router.use(bodyParser.json());


  router.get('/', doList);          // Generic query endpoint
  router.get('/:id', doRead);       // Get specific item
  router.put('/:id', doUpdate);     // Update specific item
  router.post('/', doCreate);       // Create new entry
  router.delete('/:id', doDelete);  // Delete specific item


  function doList (req, res, next) {
    util.execAdapterFunction(
      adapter,
      'list',
      {
        query: req.query
      },
      util.onAdapterExecComplete(res, next)
    );
  }

  function doRead (req, res, next) {
    util.execAdapterFunction(
      adapter,
      'read',
      {
        id: req.params.id
      },
      util.onAdapterExecComplete(res, next)
    );
  }

  function doUpdate (req, res, next) {
    util.execAdapterFunction(
      adapter,
      'update',
      {
        id: req.params.id,
        data: req.body
      },
      util.onAdapterExecComplete(res, next)
    );
  }

  function doCreate (req, res, next) {
    util.execAdapterFunction(
      adapter,
      'create',
      {
        data: req.body
      },
      util.onAdapterExecComplete(res, next)
    );
  }

  function doDelete (req, res, next) {
    util.execAdapterFunction(
      adapter,
      'delete',
      {
        id: req.params.id
      },
      util.onAdapterExecComplete(res, next)
    );
  }

  return router;
};
