'use strict';

var expect = require('chai').expect
  , sinon = require('sinon')
  , express = require('express')
  , supertest = require('supertest')
  , proxyquire = require('proxyquire');

describe(__filename, function () {
  var app, request, adapter, vStub, validator, evtSpy, router, routerOpts;

  var dataset = 'orders';

  beforeEach(function () {
    require('clear-require').all();

    adapter = {
      create: sinon.stub(),
      list: sinon.stub(),
      read: sinon.stub(),
      delete: sinon.stub(),
      update: sinon.stub()
    };

    app = express();

    validator = sinon.stub();
    validator.yields(null);

    vStub = sinon.stub();
    vStub.returns(validator);

    evtSpy = sinon.spy();

    routerOpts = {
      name: dataset,
      adapter: adapter,
      emitOldDataOnUpdate: false
    };

    router = proxyquire('./router', {
      './validate-request': vStub
    })(routerOpts);

    app.use(router);

    request = supertest(app);
  });

  describe('constructor', function () {
    it('should throw an assertion error, bad dataset name', function () {
      expect(function () {
        require('./router')(123, {});
      }).to.throw('AssertionError');
    });

    it('should throw an assertion error, bad adapter', function () {
      expect(function () {
        require('./router')('orders', 123);
      }).to.throw('AssertionError');
    });
  });

  describe('inherited params', function () {
    it('should get inhertied route params', function (done) {
      var app = require('express')();

      app.use('/:inheritThis', require('./router')({
        name: dataset,
        adapter: adapter
      }));

      adapter.list.yields(null, {});

      request = supertest(app);

      request
        .get('/things/?group=admin')
        .expect(200)
        .expect('content-type', /json/)
        .end(function (err, res) {
          expect(err).to.not.exist;
          expect(res.body).to.be.an('object');
          expect(
            adapter.list.getCall(0).args[0].routeParams
          ).to.have.key('inheritThis');
          expect(
            adapter.list.getCall(0).args[0].routeParams.inheritThis
          ).to.equal('things');

          done();
        });
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

      router.events.on('list-success', evtSpy);

      adapter.list.yields(null, listRes);

      request
        .get('/?group=admin')
        .expect(200)
        .expect('content-type', /json/)
        .end(function (err, res) {
          expect(res.body).to.deep.equal(listRes);
          expect(adapter.list.getCall(0).args[0]).to.deep.equal({
            query: {
              group: 'admin'
            },
            routeParams: {}
          });

          expect(evtSpy.calledOnce).to.be.true;

          done();
        });
    });

    it('should return a 500 error due to async error', function (done) {
      adapter.list.yields(new Error('list error'), null);

      router.events.on('list-fail', evtSpy);

      request
        .get('/?group=admin')
        .expect(500)
        .end(function (err, res) {
          expect(res.body.msg).to.exist;
          expect(res.body.msg).to.contain(
            'error executing adapter function "list": list error'
          );
          expect(adapter.list.getCall(0).args[0]).to.deep.equal({
            query: {
              group: 'admin'
            },
            routeParams: {}
          });

          expect(evtSpy.calledOnce).to.be.true;

          done();
        });
    });

    it('should retur 500 due to adapter exception thrown', function (done) {
      adapter.list.throws(new Error('list exception'), null);

      request
        .get('/?group=admin')
        .expect(500)
        .end(function (err, res) {
          expect(res.body.msg).to.exist;
          expect(res.body.msg).to.contain(
            'error executing adapter function "list": failed to exec adapter' +
            ' function list with params'
          );
          expect(adapter.list.getCall(0).args[0]).to.deep.equal({
            query: {
              group: 'admin'
            },
            routeParams: {}
          });

          done();
        });
    });

    it('should return 500 due to missing implementation', function (done) {
      delete adapter.list;

      request
        .get('/?group=admin')
        .expect(500)
        .end(function (err, res) {
          expect(res.text).to.exist;
          expect(res.text).to.contain(
            '{"msg":"action not supported: GET /?group=admin"}'
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
        .get('/1234?group=admin')
        .expect(200)
        .expect('content-type', /json/)
        .end(function (err, res) {
          expect(res.body).to.deep.equal(readRes);
          expect(adapter.read.getCall(0).args[0]).to.deep.equal({
            id: '1234',
            query: {
              group: 'admin'
            },
            routeParams: {
              id: '1234'
            }
          });

          done();
        });
    });

    it('should return 404', function (done) {
      var readRes = null;

      adapter.read.yields(null, readRes);

      request
        .get('/1234')
        .expect(404)
        .expect('content-type', /json/)
        .end(function (err, res) {
          expect(res.body.msg).to.equal('not found');
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
        .put('/1234')
        .send(updateRes)
        .expect(200)
        .expect('content-type', /json/)
        .end(function (err, res) {
          expect(res.body).to.deep.equal(updateRes);
          expect(adapter.update.getCall(0).args[0]).to.deep.equal({
            id: '1234',
            data: updateRes,
            routeParams: {
              id: '1234'
            }
          });

          done();
        });
    });

    it('should emit the success event with new and old data', function (done) {
      var updateRes = {
        key: 'val'
      };

      var readRes = {
        key: 'oldVal'
      };

      // Need to emit old data now so update options with this
      routerOpts.emitOldDataOnUpdate = true;

      router.events.on('update-success', evtSpy);

      adapter.read.yields(null, readRes);
      adapter.update.yields(null, updateRes);

      request
        .put('/1234')
        .send(updateRes)
        .expect(200)
        .expect('content-type', /json/)
        .end(function (err, res) {
          expect(res.body).to.deep.equal(updateRes);
          expect(adapter.update.getCall(0).args[0]).to.deep.equal({
            id: '1234',
            data: updateRes,
            routeParams: {
              id: '1234'
            }
          });
          expect(adapter.read.calledWith({
            id: '1234'
          }));
          expect(evtSpy.getCall(0).args[0]).to.deep.equal(updateRes);
          expect(evtSpy.getCall(0).args[1]).to.deep.equal(readRes);

          done();
        });
    });

    it('should fail (500) to update due to "read" failure', function (done) {
      var updateRes = {
        key: 'val'
      };

      // Need to emit old data now so update options with this
      routerOpts.emitOldDataOnUpdate = true;

      router.events.on('update-fail', evtSpy);

      adapter.read.yields(new Error('ouch...'), null);

      request
        .put('/1234')
        .send(updateRes)
        .expect(500)
        .expect('content-type', /json/)
        .end(function () {
          expect(evtSpy.called).to.be.true;
          done();
        });
    });

    it('should fail (400) to update due to no existing data', function (done) {
      var updateRes = {
        key: 'val'
      };

      // Need to emit old data now so update options with this
      routerOpts.emitOldDataOnUpdate = true;

      adapter.read.yields(null, null);

      request
        .put('/1234')
        .send(updateRes)
        .expect(404)
        .expect('content-type', /json/)
        .end(done);
    });
  });

  describe('#POST', function () {
    it('should return 200 plus data', function (done) {
      var createRes = {
        uid: '1234',
        data: {}
      };

      adapter.create.yields(null, createRes);

      request
        .post('/')
        .send(createRes)
        .expect(200)
        .expect('content-type', /json/)
        .end(function (err, res) {
          expect(res.body).to.deep.equal(createRes);
          expect(adapter.create.getCall(0).args[0]).to.deep.equal({
            data: createRes,
            routeParams: {}
          });

          done();
        });
    });

    it('should return a 500 - bad adapter response', function (done) {
      var createRes = {
        nope: 'not-valid'
      };

      adapter.create.yields(null, createRes);

      request
        .post('/')
        .send(createRes)
        .expect(500)
        .expect('content-type', /json/)
        .end(function (err, res) {
          expect(res.body.msg).to.contain(
            'invalid response from adapter for "create" call'
          );

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
        .del('/111')
        .expect(200)
        .expect('content-type', /json/)
        .end(function (err, res) {
          expect(res.body).to.deep.equal(deleteRes);
          expect(adapter.delete.getCall(0).args[0]).to.deep.equal({
            id: '111',
            routeParams: {
              id: '111'
            },
            data: {},
            query: {}
          });

          done();
        });
    });
    it('should return 200 plus data with a body and a query', function (done) {
      var deleteRes = {
        key: 'val'
      };
      var deleteReq = {
        key: 'other'
      };

      adapter.delete.yields(null, deleteRes);

      request
        .del('/111?foo=bar')
        .send(deleteReq)
        .expect(200)
        .expect('content-type', /json/)
        .end(function (err, res) {
          expect(res.body).to.deep.equal(deleteRes);
          expect(adapter.delete.getCall(0).args[0]).to.deep.equal({
            id: '111',
            routeParams: {
              id: '111'
            },
            data: {
              key: 'other'
            },
            query: {
              foo: 'bar'
            }
          });

          done();
        });
    });
  });

});
