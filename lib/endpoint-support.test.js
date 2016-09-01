'use strict';

var proxyquire = require('proxyquire')
  , expect = require('chai').expect
  , sinon = require('sinon');

describe(__filename, function () {

  var mod;

  beforeEach(function () {
    mod = require('./endpoint-support')({
      adapter: {
        create: sinon.spy()
      }
    });
  });

  it('should return a 405 and allow header', function (done) {
    var mw = mod('update');

    var next = sinon.spy();

    var req = {
      method: 'PUT',
      originalUrl: '/order/12345'
    };

    var res = {
      set: sinon.spy(function (name, val) {
        expect(name).to.equal('Allow');
        expect(val).to.equal('POST');
        return res;
      }),
      status: sinon.spy(function (code) {
        expect(code).to.equal(405);
        return res;
      }),
      json: sinon.spy(function (data) {
        expect(data).to.deep.equal({
          msg: 'action not supported: PUT ' + req.originalUrl
        });

        done();
      })
    };

    mw(req, res, next);
  });

  it('should call the "next" callback', function (done) {
    var mw = mod('create');

    var req = {
      method: 'POST',
      originalUrl: '/order/12345'
    };

    var res = {};

    mw(req, res, done);
  });
});
