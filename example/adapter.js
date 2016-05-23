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

      done(null, {
        uid: id,
        data: data
      });
    },

    read: function (params, done) {
      done(null, data[params.id]);
    },

    update: function (params, done) {
      data[params.id] = params.data;

      done(null, params.data);
    },

    list: function (params, done) {
      done(null, data);
    },

    delete: function (params, done) {
      var d = data[params.id];

      if (!d) {
        done(new Error('invalid id passed to delete'));
      } else {
        delete data[params.id];

        done(null, d);
      }
    }
  };
};
