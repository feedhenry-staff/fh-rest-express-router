'use strict';

const express = require('express');
const mbaasApi = require('fh-mbaas-api');
const mbaasExpress = mbaasApi.mbaasExpress();
const memoryRestAdapter = require('./adapter');
const fhRestRouter = require('../lib/router');
const app = module.exports = express();
const log = require('fh-bunyan').getLogger(__filename);
const Joi = require('Joi');

log.info('starting application');

// Note: the order which we add middleware to Express here is important!
app.use('/sys', mbaasExpress.sys([]));
app.use('/mbaas', mbaasExpress.mbaas);

// Note: important that this is added just before your own Routes
app.use(mbaasExpress.fhmiddleware());

var usersRouter = fhRestRouter({
  name: 'users',

  // Joi validations to be run for incoming CRUDL requests
  bodyAndQueryValidations: {
    create: [{
      schema: require('./validate-create'),
      options: {
        // Strip any parameters from req.body of a POST to /users that are not
        // specified in the Joi schema provided in validate-create.js
        stripUnknown: true
      }
    }]
  },

  // Inline Joi schema that ensures the ID passed into a read is valid. This is
  // a valuable way to avoid sending garbage/unsafe queries to legacy systems
  routeParamValidations: {
    read: [{
      schema: Joi.object().keys({
        id: Joi.number()
      }),
      options: {
        convert: true
      }
    }]
  },

  // We'll be storing data in process memory since it's easy for this example
  adapter: memoryRestAdapter()
});

// Add a /users route that's linked to an in memory store
app.use(
  '/users',
  usersRouter
);

const ordersRouter = fhRestRouter({
  name: 'orders',
  adapter: memoryRestAdapter()
});

ordersRouter.events.on('create-success', function (data) {
  log.info('created order, result is:', data);
});

usersRouter.events.on('create-success', function (data) {
  log.info('created user, result is:', data);
});

usersRouter.events.on('update-success', function (data, oldData) {
  log.info('updated user, result is %j, and old data was %j', data, oldData);
});

// Add an /orders route linked to an in memory store
app.use(
  '/orders',
  ordersRouter
);

// Important that this is last!
app.use(mbaasExpress.errorHandler());

const port = process.env.FH_PORT || process.env.VCAP_APP_PORT || 3001;
app.listen(port, function() {
  log.info('app started on port: %s', port);
});
