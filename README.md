# fh-sync-express-router

Create an express.Router that exposes a backend store in a *fh-sync-mbaas-proxy*
friendly format through the use of an *fh-sync-{name}-adapter*.

## Install
Not currently published on npm, but you can install from GitHub via npm CLI:

```
npm install feedhenry-staff/fh-sync-express-router
```

## Usage

```js
'use strict';

var express = require('express')
  , mbaasApi = require('fh-mbaas-api')
  , mbaasExpress = mbaasApi.mbaasExpress()
  , app = module.exports = express()
  , log = require('fh-bunyan').getLogger(__filename);

log.info('starting application');

// Note: the order which we add middleware to Express here is important!
app.use('/sys', mbaasExpress.sys([]));
app.use('/mbaas', mbaasExpress.mbaas);

// Note: important that this is added just before your own Routes
app.use(mbaasExpress.fhmiddleware());

// Module used to create RESTful router instances
var fhSyncExpressRouter = require('fh-sync-express-router');

// Module that RESTful router will use to retrieve data
// Note: this is not yet developed
var fhSyncMySqlAdapter = require('fh-sync-mysql-adapter');

// Expose a RESTful API to orders data, e.g:
// GET /orders/12345
app.use(fhSyncExpressRouter(
  'orders',
  fhSyncMySqlAdapter({
    dbOpts: {
      // See: https://github.com/felixge/node-mysql
      host: 'localhost',
      user: 'shadowman',
      password: 'redhat',
      database: 'mobile'
    },

    // Database table to expose
    table: 'orders',

    // Primary key for items in the "orders" table.
    // Required to map entries to an fh.sync friendly format
    pk: 'id'
  })
));

// Important that this is last!
app.use(mbaasExpress.errorHandler());

var port = process.env.FH_PORT || process.env.VCAP_APP_PORT || 8001;
app.listen(port, function() {
  log.info('app started on port: %s', port);
});
```
