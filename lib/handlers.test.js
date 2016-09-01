'use strict';

module.exports = function (opts, router) {

  var _ = require('lodash')
    , VError = require('VError')
    , adapterExec = require('./adapter-exec')
    , log = require('./log')(opts);

  // Verify that responses an adapter returns are formatted correctly
  var isValidAdapterResponse = require('./verify-adapter-response')(opts);

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
      return adapter.hasOwnProperty(n) ? sum + ', ' + verbMappings[n] : sum;
    }, '');
  }


  /**
   * Generic response handler for adapter callbacks
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
    // Create a new Object with a subset of request properties as defined in
    // the definition for the type of request
    return _.zip(
      _.keys(def),
      _.map(_.values(def), _.get.bind(_, req))
    );
  }


  /**
   * Creates a function to handle incoming requests of a particular type
   * @param  {String} fnName Might be "create", etc.
   * @param  {Object} def    Details to extract from the request
   * @return {Function}
   */
  function genRequestHandlerForFunction (fnName, def) {
    return function _requestHandler (adapter, req, res, next) {
      if (!adapter.hasOwnProperty(fnName)) {
        res.set('Allow', generateAllowHeader(adapter));
        res.status(405).json({
          msg: 'action not supported'
        });
      } else {
        log.debug('performing %s', fnName);
        adapterExec(
          adapter,
          'delete',
          getRequestParams(req, def),
          onAdapterExecComplete('delete', res, next)
        );
      }
    };
  }


  // Export each of the CRUDL functions
  _.each(paramDefinitions, function (fnName, def) {
    exports[fnName] = genRequestHandlerForFunction(fnName, def);
  });
};
