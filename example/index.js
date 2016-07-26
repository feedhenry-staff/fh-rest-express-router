'use strict';

var express = require('express')
  , mbaasApi = require('fh-mbaas-api')
  , mbaasExpress = mbaasApi.mbaasExpress()
  , memoryRestAdapter = require('./adapter')
  , fhRestRouter = require('../lib/router')
  , app = module.exports = express()
  , log = require('fh-bunyan').getLogger(__filename);

log.info('starting application');

// Note: the order which we add middleware to Express here is important!
app.use('/sys', mbaasExpress.sys([]));
app.use('/mbaas', mbaasExpress.mbaas);

// Note: important that this is added just before your own Routes
app.use(mbaasExpress.fhmiddleware());

var usersRouter = fhRestRouter({
  name: 'users',
  validations: {
    create: [require('./validate-create')]
  },
  adapter: memoryRestAdapter()
});

// Add a /users route that's linked to an in memory store
app.use(
  '/users',
  usersRouter
);

var ordersRouter = fhRestRouter({
  name: 'orders',
  adapter: memoryRestAdapter()
});

ordersRouter.events.on('create-success', function (data) {
  log.info('created order, result is:', data);
});

usersRouter.events.on('create-success', function (data) {
  log.info('created user, result is:', data);
});

// Add an /orders route linked to an in memory store
app.use(
  '/orders',
  ordersRouter
);

// Important that this is last!
app.use(mbaasExpress.errorHandler());

var port = process.env.FH_PORT || process.env.VCAP_APP_PORT || 3001;
app.listen(port, function() {
  log.info('app started on port: %s', port);
});
