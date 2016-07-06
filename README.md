# fh-rest-express-router

[![Circle CI](https://circleci.com/gh/feedhenry-staff/fh-rest-express-router/tree/master.svg?style=svg)](https://circleci.com/gh/ffeedhenry-staff/fh-rest-express-router/tree/master)

Spend less time writing repetitive integrations, and more time building
mobile applications!

## What? Why? How?

### What?
A node.js module that simplifies RESTful HTTP API creation with the purpose of
exposing a backend data store with support for CRUDL operations.

### Why?
Exposing legacy data to mobile devices should be:

* Simple
* Secure
* Standardised

Using microservices (MBaaS Services), built with *fh-rest*, running on the
Red Hat Mobile Application Platform MBaaS enables enterprises to create
lightweight, reusable APIs that meet the goals listed above. These APIs can
then be leveraged as part of their mobility strategy.

### How?
Red Hat Mobile Application Platform creates microservices using the express web
framework. Utilising the modular nature of node.js and express allowed us to
create *fh-rest-express-router*. *fh-rest-express-router* creates a series of
RESTful route handlers for dataset identified with a *String:name*, and
interfaces with the underlying store using a set of adapters. This HTTP API can
then be used to perform CRUDL operations on the underlying dataset.

It can be called by a Cloud Application on RHMAP by using *fh.service* and, as
an added bonus, the created RESTful API can be utilised by *fh-rest-sync-proxy*
since the format exposed is compatible with the FH.Sync SDK; this means you can
synchronise backend data to mobile devices and perform CRUDL operations with a
ludicrously minimal amount of code.


## Install
Not currently published on npm, but you can still install from GitHub via npm:

(Only tested with npm 3)

```
npm install feedhenry-staff/fh-rest-express-router
```

## Usage

```js
'use strict';

/**
 * filename: application.js
 * The entry point of our RHAMP MBaaS Service
 */

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
var fhRestExpressRouter = require('fh-rest-express-router');

// Module that RESTful router will use to retrieve data
// Note: this is not yet developed
var fhRestMySqlAdapter = require('fh-rest-mysql-adapter');

// Creates a handler for incoming HTTP requests that want to perform CRUDL
// operations on the "orders" table in your MySQL database
var ordersRouter = fhRestExpressRouter({
  name: 'orders',
  adapter: fhRestMySqlAdapter({
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
    // Required to map entries to an fh.sync SDK friendly format
    pk: 'id'
  })
})

// Expose a RESTful API to orders data, e.g:
// GET /orders/12345
app.use(ordersRouter);

// Important that this is last!
app.use(mbaasExpress.errorHandler());

var port = process.env.FH_PORT || process.env.VCAP_APP_PORT || 8001;
app.listen(port, function() {
  log.info('app started on port: %s', port);
});
```



## RESTful API Definition
The example provided above exposes a RESTful API that uses JSON as the data
interchange format. Below we cover the routes exposed that will facilitate the
CRUDL operations discussed.

In the below examples *dataset-name* can be anything you like, e.g "orders"
from the example above, or "users" in the sample below.

#### Request Definition
Each incoming request should have the *Content-Type* header set to
*application/json*. If you plan to use our *fh.service* API then this will be
taken care of for you.

#### GET /dataset-name (LIST)
Generic list endpoint that returns an Object containing key value pairs based
on a querystring. Keys must be unique IDs and values must be Objects.

Sample URL: GET /users?group=admin

Sample response:

```json
{
  "02833": {
    "group": "admin",
    "firstname": "shadow",
    "lastname": "man"
  },
  "02834": {
    "group": "admin",
    "firstname": "red",
    "lastname": "hat"
  }
}
```

#### GET /dataset-name/:id (READ)
Returns an Object from the store based on the passed _id_.

Sample URL: GET /users/02834

Sample response:

```json
{
  "group": "admin",
  "firstname": "red",
  "lastname": "hat"
}
```

#### POST /dataset-name/ (CREATE)
Accepts an Object that contains data to create a new entry in the backend store.
Returns the created Object data and unique ID (uid).

Sample URL: POST /users

Sample response:

```json
{
  "uid": "02834",
  "data": {
    "group": "admin",
    "firstname": "red",
    "lastname": "hat"
  }
}
```

#### PUT /dataset-name/:id (UPDATE)
Accepts an Object that contains data to update an entry in the backend store.
Returns the updated Object.

Sample URL: PUT /users/02834

Sample response:

```json
{
  "firstname": "red",
  "lastname": "hatter"
}
```

#### DELETE - /dataset-name/:id (DELETE)
Deletes the data associated with the given _id_ from the backend store. Returns
the deleted data.

Sample URL: DELETE /users/02834

Sample response:

```json
{
  "group": "admin",
  "firstname": "red",
  "lastname": "hat"
}
```

## Changelog

* 0.2.0
  * Restructure codebase
  * Instead of multiple args, an options object is now expected
  * Place routing structure responsibility on developers (opts.name is not used
  to create the /routeName anymore)
  * Add 404 response for GET calls for specific resouce IDs that do not exist

* 0.1.0 - Initial realease
