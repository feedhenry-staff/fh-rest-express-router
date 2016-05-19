'use strict';

var VError = require('verror');

module.exports = {
  execAdapterFunction: execAdapterFunction,
  onAdapterExecComplete: onAdapterExecComplete
};

function execAdapterFunction (adapter, fnName, params, callback) {
  if (adapter[fnName]) {
    try {
      adapter[fnName](params, callback);
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
