'use strict';

/**
 * Sample adapter for our fh-rest-express-router. Simply provides an in memory
 * data store with an incrementing "id" field.
 */

module.exports = function () {
  var id = 0
    , data = {};

  return {
    create: function (params, done) {
      id++;

      data[id] = params.data;

      // Return data in our custom format to keep things standardised and
      // compatible with the feedhenry sync framework
      done(null, {
        uid: id,
        data: data
      });
    },

    read: function (params, done) {
      done(null, data[params.id]);
    },

    update: function (params, done) {
      if (data[params.id]) {
        var oldData = data[params.id];
        data[params.id] = params.data;
        done(null, params.data, oldData);
      } else {
        // Doesn't exist. Will cause a 404 to be returned
        done(null, null);
      }
    },

    list: function (params, done) {
      // Return all of our data, this adapter does not support querystring
      // use for filtering data as it's a simple example
      done(null, data);
    },

    delete: function (params, done) {
      const d = data[params.id];

      if (!d) {
        // Cannot delete something that doesn't exist. Will return a 404
        done(null, null);
      } else {
        delete data[params.id];

        done(null, d);
      }
    }
  };
};
