# fh-rest-express-router

[![Circle CI](https://travis-ci.org/feedhenry-staff/fh-rest-express-router.svg?branch=master)](https://travis-ci.org/feedhenry-staff/fh-rest-express-router)

Spend less time writing repetitive integrations, and more time building
mobile applications!

## What? Why? How?

### What?
A node.js module that simplifies and standardises the creation of RESTful HTTP
APIs for a mobility development team.

### Why?
Exposing data to mobile devices should be:

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
create *fh-rest-express-router*.

*fh-rest-express-router* creates a series of RESTful route handlers for a
dataset identified with a *String:name*, and interfaces with an underlying
data store via an adapter. This HTTP API can then be used to perform CRUDL
operations on the underlying dataset through the adapter.

It can be called by a Cloud Application on RHMAP by using *fh.service* and, as
an added bonus, the created RESTful API can be utilised by *fh-rest-sync-proxy*
since the format exposed is compatible with the FH.Sync SDK; this means you can
synchronise backend data to mobile devices and perform CRUDL operations with a
ludicrously small amount of code.


## Adapters
In the last section we mentioned that adapters perform the heavy lifting for
your RESTful API that is created by _fh-rest-express-router_. We currently have
a number of adapters that can be used for common data stores.

* _fh-rest-mysql-adapter_ - reads and writes data to a table in MySQL
* _fh-rest-mongodb-adapter_ - reads and writes data to a MongoDB collection
* _fh-rest-memory-adapter_ - stores data in the node.js microservice memory,
this is volatile and therefore should not be used if data must be persisted

## Install

```
npm install fh-rest-express-router --save
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
var fhRestMemoryAdapter = require('fh-rest-memory-adapter');

// Creates a handler for incoming HTTP requests that want to perform CRUDL
// operations on the "orders" table in your MySQL database
var ordersRouter = fhRestExpressRouter({
  // The name of this router
  name: 'orders',

  // Joi schemas that validate the querystring/body is safe to pass to
  // an adapter instance. Only for list, create, and update
  validations: {
    'list': [require('./validate-list')],
    'create': [require('./validate-create')],
    'update': [require('./validate-update')]
  },

  // The adapter that performs CRUDL functions on your behalf
  adapter: fhRestMemoryAdapter()
});

ordersRouter.events.on('create-success', function (data) {
  // Do something with the data
  console.log('created order with data', data);
});

ordersRouter.events.on('create-fail', function (data) {
  // Take an action to handle the error, e.g report it somewhere
});

// Expose a RESTful API to orders data, e.g:
// GET /orders/12345
app.use('/orders', ordersRouter);

// Important that this is last!
app.use(mbaasExpress.errorHandler());

var port = process.env.FH_PORT || process.env.VCAP_APP_PORT || 8001;
app.listen(port, function() {
  log.info('app started on port: %s', port);
});
```

## API
This module is a simple factory function. Simply require it, then call it with
options to make it return preconfigured instances of _express.Router_.

### Options
It supports being passed the following options:

* [Required] adapter - adapter instance that will handle CRUDL operations
* [Required] name - a name that will identify this adapter in logs
* [Optional] validations - Array containing Joi schemas that will be used to
validate data passed to create, update, and list operations is safe.

### Events
Events can be accessed using the *router.events* which is an EventEmitter
instance. It emits the following events:

* create-fail
* read-fail
* update-fail
* delete-fail
* list-fail
* create-success
* read-success
* update-success
* delete-success
* list-success

Success event callbacks are passed the response the adapter generated. Error
events are passed the _Error_ instance that has been generated. Check the
examples for more information.



## RESTful (HTTP) API Definition
The example provided above exposes a RESTful API that uses JSON as the data
interchange format. Below we cover the routes it exposes that will facilitate
the CRUDL operations discussed.

In the below examples *dataset-name* can be anything you like, e.g "orders"
from the example above, or "users" in the sample below.

#### Try it Out
If all this talk of RESTful APIs and routes has you confused, fear not. We've
included a sample server and set of requests to help.

To run the server type `npm install` inside this folder, followed by
`npm run example` when that has completed. Congratulations you're now running
a RESTful API locally.

To hit your local server try using the *postman_collection* file included.
Download Postman, then use *Collections => Import* to load the sample requests
file included, *fh-rest-express-router.json.postman_collection*. After doing
this you can use Postman to make CRUDL calls to the local server. Take note of
the ID (uid) returned from create operations so you can update URLs accordingly
in Postman, i.e change "1" to whatever uid was returned by create or list calls.

Note: You can use cURL or any other HTTP client to hit the example server, but
Postman is a nice cross platform tool for doing so.

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

* 0.6.0
  * Now return a 405 for CRUDL functions that are missing; was a 500 error
  previously
  * Reduce package size using "files" in package.json

* 0.5.0
  * Add events for "success" and "fail" on on CRUDL calls. This might change to
  be emitted by adapters in the future.

* 0.4.1 - 0.4.3
  * Struggles with peerDependencies. Ultimately we will retain this config

* 0.4.0
  * Support for Joi validations on incoming request body and querystrings for
  create, update, and list operations
  * Add Apache Licence (thanks @matzew)
  * Update example code
  * Include Postman file for demonstration of requests
  * Only support node.js 4.0 and above (due to inclusion of Joi)

* 0.3.0 - 0.3.1
  * Return 404 if adapter returns a null result (for delete or read)
  * Pass route params that developers define on their app.use
  * Support nested APIs (thanks @jimdillon)
  * Adapter responses are validated to ensure compliance with FH.Sync Object
  format

* 0.2.0
  * Restructure codebase
  * Instead of multiple args, an options object is now expected
  * Place routing structure responsibility on developers (opts.name is not used
  to create the /routeName anymore)
  * Add 404 response for GET calls for specific resouce IDs that do not exist

* 0.1.0 - Initial realease
