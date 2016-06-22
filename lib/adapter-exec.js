'use strict';

var VError = require('verror');

/**
 * Generic function to execute adapter functions.
 *
 * Will attempt to handle exceptions that they might throw, or return an error
 * if the function is not implemented.
 *
 * @param  {Object}   adapter
 * @param  {String}   fn
 * @param  {Object}   params
 * @param  {Function} callback
 */
module.exports = function execAdapterFunction (adapter, fn, params, callback) {
  if (adapter[fn]) {
    try {
      adapter[fn](params, callback);
    } catch (e) {
      callback(
        new VError(
          e,
          'failed to exec adapter function %s with params %j',
          fn,
          params
        ),
        null
      );
    }
  } else {
    callback(
      new VError(
        'adapter has not implemented function %s',
        fn
      )
    );
  }
};
