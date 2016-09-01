'use strict';

module.exports = function (opts, router) {

  var _ = require('lodash')
    , VError = require('VError')
    , adapterExec = require('./adapter-exec')
    , log = require('./log')(opts);

  // Will be used to get an adapter for a given req
  var getApiVersionForReq = require('./select-version')(opts);

  // Verify that responses an adapter returns are formatted correctly
  var isValidAdapterResponse = require('./verify-adapter-response')(opts);

  // Definitions of routes and the params to pull from the req Object for them
  var paramDefinitions = {
    list: {
      routeParams: 'params',
      query: 'query'
    },
    read: {
      routeParams: 'params',
      id: 'params.id'
    },
    update: {
      routeParams: 'params',
      id: 'params.id',
      data: 'body'
    },
    create: {
      routeParams: 'params',
      data: 'body'
    },
    delete: {
      routeParams: 'params',
      id: 'params.id'
    }
  };

  // The name mappings from HTTP methods to CRUDL functions
  var verbMappings = {
    create: 'POST',
    read: 'GET',
    update: 'PUT',
    delete: 'DELETE',
    list: 'GET'
  };

  /**
   * Should a request try to use a HTTP verb that the adapter is not supporting
   * we need to return this header in the response
   *
   * Example result, "POST, GET, DELETE"
   *
   * @param  {Object} adapter
   * @return {String}
   */
  function generateAllowHeader (adapter) {
    return _.reduce(_.keys(verbMappings), function (sum, n) {
      if (adapter.hasOwnProperty(n)) {
        // If this is the first time adding a string, do not insert comma
        return sum ? (sum + ', ' + verbMappings[n]) : verbMappings[n];
      } else {
        return sum;
      }
    }, '');
  }


  /**
   * Generic response handler for adapter callbacks
   * @param  {String}             fnName
   * @param  {OutgoingResponse}   res
   * @param  {Function}           next
   */
  function onAdapterExecComplete (fnName, res, next) {
    return function _execComplete (err, data) {
      var e;

      if (err) {
        e = new VError(
          err,
          'error executing adapter function "%s"',
          fnName
        );

        router.events.emit(fnName + '-fail', e);

        next(e);
      } else if (data && !isValidAdapterResponse(fnName, data)) {
        e = new VError(
          'invalid response from adapter for "%s" call. response: %j',
          fnName,
          data
        );

        router.events.emit(fnName + '-fail', e);

        next(e);
      } else if (data) {
        router.events.emit(fnName + '-success', data);

        res.json(data);
      } else {
        res.status(404).json({
          msg: 'not found'
        });
      }
    };
  }


  /**
   * Pluck the required properties from a request
   * @param  {IncomingRequest} req
   * @param  {Object}          def
   * @return {Object}
   */
  function getRequestParams (req, def) {

    log.trace(
      'getting params from request %s %s and ',
      req.method,
      req.originalUrl,
      def
    );

    // Create a new Object with a subset of request properties as defined in
    // the definition for the type of request
    var ret = _.zipObject(
      _.keys(def),
      _.map(_.values(def), _.get.bind(_, req))
    );

    log.trace(
      'generated params from request %s %s as ',
      req.method,
      req.originalUrl,
      ret
    );

    return ret;
  }


  /**
   * Creates a function to handle incoming requests of a particular type
   * @param  {String} fnName Might be "create", etc.
   * @param  {Object} def    Details to extract from the request
   * @return {Function}
   */
  function genRequestHandlerForFunction (fnName, def) {
    return function _requestHandler (req, res, next) {
      log.debug(
        'getting adapter for request %s %s',
        req.method,
        req.originalUrl
      );
      getApiVersionForReq(req, function (err, version) {
        log.debug(
          'found adapter for request %s %s',
          req.method,
          req.originalUrl
        );

        var adapter = (version && version.adapter) ? version.adapter : version;

        if (err) {
          // Error was raised, propogate it
          next(new VError(err, 'failed to get adapter to serve request'));
        } else if (!adapter) {
          // No adapter found for api version requested, bad request
          res.status(400).json({
            msg: 'unsupported API version requested'
          });
        } else if (!adapter.hasOwnProperty(fnName)) {
          // Adapter does not support this operation, e.g PUT /users
          // but might support GET /users
          res.set('Allow', generateAllowHeader(adapter));

          // Return a 405 to note that the action is not supported
          res.status(405).json({
            msg: 'action not supported: ' + req.method + ' ' + req.originalUrl
          });
        } else {
          adapterExec(
            adapter,
            fnName,
            getRequestParams(req, def),
            onAdapterExecComplete(fnName, res, next)
          );
        }
      });

    };
  }

  var handlers = {};

  // Export each of the CRUDL functions
  _.each(paramDefinitions, function (def, fnName) {
    handlers[fnName] = genRequestHandlerForFunction(fnName, def);
  });

  return handlers;
};
