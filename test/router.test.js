'use strict';

var expect = require('chai').expect
  , sinon = require('sinon')
  , express = require('express')
  , supertest = require('supertest');

describe(__filename, function () {
  var app, request, adapter;

  var dataset = 'orders';

  beforeEach(function () {
    adapter = {
      create: sinon.stub(),
      list: sinon.stub(),
      read: sinon.stub(),
      delete: sinon.stub(),
      update: sinon.stub()
    };

    app = express();

    app.use(require('../lib/router')(dataset, adapter));

    app.use(function (err, req, res, next) {
      /*jshint unused: false*/
      res.end(err.toString());
    });

    request = supertest(app);
  });

  describe('constructor', function () {
    it('should throw an assertion error, bad dataset name', function () {
      expect(function () {
        require('../lib/router')(123, {});
      }).to.throw('AssertionError');
    });

    it('should throw an assertion error, bad adapter', function () {
      expect(function () {
        require('../lib/router')('orders', 123);
      }).to.throw('AssertionError');
    });
  });

  describe('#GET /', function () {
    it('should return 200 plus data', function (done) {
      var listRes = {
        0: {
          key: 'val'
        },
        1: {
          key: 'val'
        }
      };

      adapter.list.yields(null, listRes);

      request
        .get('/orders/?group=admin')
        .expect(200)
        .expect('content-type', /json/)
        .end(function (err, res) {
          expect(res.body).to.deep.equal(listRes);
          expect(adapter.list.getCall(0).args[0]).to.deep.equal({
            query: {
              group: 'admin'
            }
          });
          done();
        });
    });

    it('should return a 500 error', function (done) {
      adapter.list.yields(new Error('list error'), null);

      request
        .get('/orders/?group=admin')
        .expect(500)
        .end(function (err, res) {
          expect(res.body.msg).to.exist;
          expect(res.body.msg).to.contain(
            'error executing adapter function "list": list error'
          );
          expect(adapter.list.getCall(0).args[0]).to.deep.equal({
            query: {
              group: 'admin'
            }
          });

          done();
        });
    });

    it('should return a 500 error due to adapter exception', function (done) {
      adapter.list.throws(new Error('list exception'), null);

      request
        .get('/orders/?group=admin')
        .expect(500)
        .end(function (err, res) {
          expect(res.body.msg).to.exist;
          expect(res.body.msg).to.contain(
            'error executing adapter function "list": failed to exec adapter ' +
            'function list for "orders" with params'
          );
          expect(adapter.list.getCall(0).args[0]).to.deep.equal({
            query: {
              group: 'admin'
            }
          });

          done();
        });
    });

    it('should return a 500 error due to missing implementation', function (done) {
      delete adapter.list;

      request
        .get('/orders/?group=admin')
        .expect(500)
        .end(function (err, res) {
          expect(res.text).to.exist;
          expect(res.text).to.contain(
            'adapter has not implemented function list'
          );

          done();
        });
    });
  });

  describe('#GET /:id', function () {
    it('should return 200 plus data', function (done) {
      var readRes = {
        key: 'val'
      };

      adapter.read.yields(null, readRes);

      request
        .get('/orders/1234')
        .expect(200)
        .expect('content-type', /json/)
        .end(function (err, res) {
          expect(res.body).to.deep.equal(readRes);
          expect(adapter.read.getCall(0).args[0]).to.deep.equal({
            id: '1234'
          });

          done();
        });
    });
  });

  describe('#PUT /:id', function () {
    it('should return 200 plus data', function (done) {
      var updateRes = {
        key: 'val'
      };

      adapter.update.yields(null, updateRes);

      request
        .put('/orders/1234')
        .send(updateRes)
        .expect(200)
        .expect('content-type', /json/)
        .end(function (err, res) {
          expect(res.body).to.deep.equal(updateRes);
          expect(adapter.update.getCall(0).args[0]).to.deep.equal({
            id: '1234',
            data: updateRes
          });

          done();
        });
    });
  });

  describe('#POST', function () {
    it('should return 200 plus data', function (done) {
      var createRes = {
        key: 'val'
      };

      adapter.create.yields(null, createRes);

      request
        .post('/orders/')
        .send(createRes)
        .expect(200)
        .expect('content-type', /json/)
        .end(function (err, res) {
          expect(res.body).to.deep.equal(createRes);
          expect(adapter.create.getCall(0).args[0]).to.deep.equal({
            data: createRes
          });

          done();
        });
    });
  });

  describe('#DELETE /:id', function () {
    it('should return 200 plus data', function (done) {
      var deleteRes = {
        key: 'val'
      };

      adapter.delete.yields(null, deleteRes);

      request
        .del('/orders/111')
        .expect(200)
        .expect('content-type', /json/)
        .end(function (err, res) {
          expect(res.body).to.deep.equal(deleteRes);
          expect(adapter.delete.getCall(0).args[0]).to.deep.equal({
            id: '111'
          });

          done();
        });
    });
  });


});
