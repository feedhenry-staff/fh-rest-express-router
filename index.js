'use strict';

var VError = require('verror')
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

  function execAdapterFunction (fnName, param, callback) {
    if (adapter[fnName]) {
      try {
        adapter[fnName](param, callback);
      } catch (e) {
        callback(
          new VError(e, 'failed to execute adapter function "%s"', fnName),
          null
        );
      }
    } else {
      callback(new VError('adapter has not implemented function "%s"', fnName));
    }
  }

  function onAdapterExecComplete (res, next) {
    return function _execComplete (err, data) {
      if (err) {
        next(err);
      } else {
        res.json(data);
      }
    };
  }

  router.get('/', function doList (req, res, next) {
    execAdapterFunction(
      'list',
      req.query,
      onAdapterExecComplete(res, next)
    );
  });

  router.get('/:id', function doRead (req, res, next) {
    execAdapterFunction(
      'read',
      req.params.id,
      onAdapterExecComplete(res, next)
    );
  });

  router.put('/:id', function doUpdate (req, res, next) {
    execAdapterFunction(
      'update',
      req.params.id,
      onAdapterExecComplete(res, next)
    );
  });

  router.post('/', function doCreate (req, res, next) {
    execAdapterFunction(
      'create',
      req.body,
      onAdapterExecComplete(res, next)
    );
  });

  router.delete('/:id', function doDelete (req, res, next) {
    execAdapterFunction(
      'delete',
      req.params.id,
      onAdapterExecComplete(res, next)
    );
  });

  return router;
};
