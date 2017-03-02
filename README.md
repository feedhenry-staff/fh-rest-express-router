# fh-rest-express-router

[![Circle CI](https://travis-ci.org/feedhenry-staff/fh-rest-express-router.svg?branch=master)](https://travis-ci.org/feedhenry-staff/fh-rest-express-router)
[![node](https://img.shields.io/node/v/gh-badges.svg?maxAge=2592000)](https://github.com/feedhenry-staff/fh-rest-express-router)

Spend less time writing repetitive integrations, and more time building awesome
mobile APIs!


## What?
Building RESTful APIs in node.js typically has many decisions involved that
aren't immediately apparent. For example, how do you plan to sanatise inputs
that might contain invalid querystring parameters? Should you use an existing
library to do this?
How can you achieve it in a DRY (don't repeat yourself) manner whilst retaining
flexility to add new rules in the future? A series of if/else statements? Sure
that works, but are you aware of how JavaScript handles _parseInt_,
the _Number_, and _NaN_ types? Do you want to unit test for all of those Number
type edge cases? What about your URL structure and use of HTTP verbs? Should you
use PUT or POST for updates?

It's a little overwhelming unless you're happy to invest a significant amount of
time and effort to figure these things out. Thankfully *fh-rest-express-router*
makes sensible decisions for you so you can save time on these details and do
the real integration work required to power your API.

Using microservices (MBaaS Services), built with *fh-rest*, running on the
Red Hat Mobile Application Platform MBaaS enables enterprises to create
lightweight, reusable APIs that meet the goals listed above and avoid the
pitfalls we discussed above. These APIs can then be leveraged as part of their
wider mobility strategy.


## How?
Red Hat Mobile Application Platform creates microservices using the express web
framework. Utilising the modular nature of node.js and express allowed us to
create *fh-rest-express-router*.

*fh-rest-express-router* creates a series of RESTful route handlers for a
_dataset_ identified with a *String:name*, and interfaces with an underlying
data store via an adapter/interface. Essentially this is a HTTP API that can be
used to perform CRUDL operations on the underlying dataset through the adapter.
Typically this dataset is a legacy SOAP system, Oracle Database, or some form of
ESB.

Your created can be called by a Cloud Application on RHMAP by using
*fh.service* and, as an added bonus, the created RESTful API can be utilised
by *fh-rest-sync-proxy* since the format exposed is compatible with the
FH.Sync SDK; this means you can synchronise backend data to mobile devices and
perform CRUDL operations with a ludicrously small amount of code. You can also
use cURL and Postman.


## Adapters
In the last section we mentioned that adapters perform the heavy lifting for
your RESTful API that is created by _fh-rest-express-router_, by performing
database calls, disk read/write, or other functions to support your RESTful API.
We currently have a number of adapters that can be used for common data stores.

* _fh-rest-mysql-adapter_ - reads and writes data to a table in MySQL
* _fh-rest-mongodb-adapter_ - reads and writes data to a MongoDB collection
* _fh-rest-memory-adapter_ - stores data in the node.js microservice memory,
this is volatile and therefore should not be used if data must be persisted

## Install

```
cd $YOUR_PROJECT_DIR
npm install fh-rest-express-router --save
npm install express@4.14 --save
```

## Usage

```js
'use strict';

/**
 * filename: application.js
 * The entry point of our RHAMP MBaaS Service
 */

const express = require('express')
const mbaasApi = require('fh-mbaas-api')
const mbaasExpress = mbaasApi.mbaasExpress()
const app = module.exports = express()
const log = require('fh-bunyan').getLogger(__filename);
const Joi = require('joi');

const port = process.env.FH_PORT || process.env.VCAP_APP_PORT || 8001;

log.info('starting application');

// Note: the order which we add middleware to Express here is important!
app.use('/sys', mbaasExpress.sys([]));
app.use('/mbaas', mbaasExpress.mbaas);

// Note: important that this is added just before your own Routes
app.use(mbaasExpress.fhmiddleware());

// Module used to create RESTful router instances
const fhRestExpressRouter = require('fh-rest-express-router');

// Module that RESTful router will use to retrieve data
// Note: this is not yet developed
const fhRestMemoryAdapter = require('fh-rest-memory-adapter');

// Creates a handler for incoming HTTP requests that want to perform CRUDL
// operations on the "orders" table in your MySQL database
const ordersRouter = fhRestExpressRouter({
  // The name of this router
  name: 'orders',

  // Joi schemas that validate the querystring/body is safe to pass to
  // an adapter instance. Only for list, create, update and read
  bodyAndQueryValidations: {
    'list': [{
      schema: require('./validate-list-schema.js'),
      options: {
        stripUnknown: true //Allow parameters not in Joi schema through
      }
    }],
    'create': [{
      schema: require('./validate-create-schema.js'),
      options: {
        allowUnknown: true // Remove parameters not in Joi schema
      }
    }],
    'update': [{
      schema: require('./validate-update-schema.js'),
      options: {
        noDefaults: true // Do not use default values set in Joi schema
      }
    })],
    'read': [{
      schema: require('./validate-read-schema.js'),
      options: {
        abortEarly: false // Run all validations and return any and all errors
      }
    }]
  },

  // Similar to the bodyAndQueryValidations, but operates on route params,
  // AKA the variable parts of a url, e.g in "/orders/:id" the "id" is variable
  routeParamValidations: {
    'read': [{
      schema: Joi.object().keys({
        // Verify the id in the URL is an integer, if it's not then the request
        // receives a "400 Bad Request" explaining this error
        id: Joi.number().required()
      }),
      options: { /* optional joi options */ }
    }]
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

app.listen(port, function() {
  log.info('app started on port: %s', port);
});
```

## API
This module is a factory function. Simply require it, then call it with
options to make it return preconfigured instances of _express.Router_ as shown
in the example above.

### Options
It supports being passed the following options:

* [Required] adapter - adapter instance that will handle CRUDL operations
* [Required] name - a name that will identify this adapter in logs
* [Optional] bodyAndQueryValidations - Array containing Joi schemas and Joi
options that will be used to validate data passed to create, update, and list
operations is safe.
* [Optional] routeParamValidations - Array containing Joi schemas and Joi
options that will be used to validate parameters in a route (URL) are valid.

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
/examples folder for more information.



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
  "group": "admin",
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

## Contributors
* @jimdillon
* @matzew

## Changelog

* 10.0.0
  * Querystrings with Joi validation support are available for read operations.

* 0.9.0
  * Update router events so that the signature has changed from fn(newData) to
  fn(newData, extraData). In an adapter function simply pass a third param to
  the callback and it will be the _extraData_ in the related router.event.

* 0.8.0
  * Expand on previous Joi additions by utilising these for validation of URL
  parameters. Take a look at the updated examples for usage since it has
  changed slightly from 0.7.0.

* 0.7.0
  * Support for Joi validate options to be used during Joi validations for
  create, update, and list operations.

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
