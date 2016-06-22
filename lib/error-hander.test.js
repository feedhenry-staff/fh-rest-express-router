'use strict';

var proxyquire = require('proxyquire')
  , expect = require('chai').expect
  , sinon = require('sinon');

describe(__filename, function () {

  var mod, stubs, loggerStub;

  beforeEach(function () {
    loggerStub = {
      error: sinon.stub()
    };

    stubs = {
      './log': sinon.spy(function () {
        return loggerStub;
      })
    };

    mod = proxyquire('./error-handler.js', stubs);
  });

  it('should return an error handler', function () {
    expect(mod({})).to.be.a('function');
  });

  it('should log the error with basic details', function () {
    var handleErr = mod({});
    var nextSpy = sinon.spy();
    var req = {};
    var res = {
      status: sinon.stub(),
      json: sinon.spy()
    };
    var e = new Error('oops');

    res.status.returns(res);

    handleErr(e, req, res, nextSpy);

    expect(res.status.calledOnce).to.be.true;
    expect(res.status.getCall(0).args[0]).to.equal(500);
    expect(res.json.calledOnce).to.be.true;
    expect(res.json.getCall(0).args[0]).to.deep.equal({
      msg: 'Error: oops'
    });
    expect(loggerStub.error.getCall(0).args[0]).to.deep.equal({
      err: e
    });
  });

  it('should log the error with verbose details', function () {
    var handleErr = mod({
      verboseErrors: true,
      name: 'ok'
    });
    var nextSpy = sinon.spy();
    var req = {
      method: 'GET',
      originalUrl: '/test',
      body: 'body',
      query: {key: 'val'},
      headers: {}
    };
    var res = {
      status: sinon.stub(),
      json: sinon.spy()
    };
    var e = new Error('oops');

    res.status.returns(res);

    handleErr(e, req, res, nextSpy);

    expect(res.status.calledOnce).to.be.true;
    expect(res.status.getCall(0).args[0]).to.equal(500);
    expect(res.json.calledOnce).to.be.true;
    expect(res.json.getCall(0).args[0]).to.deep.equal({
      msg: 'Error: oops'
    });
    expect(loggerStub.error.getCall(0).args[0]).to.deep.equal({
      err: e,
      method: 'GET',
      url: '/test',
      body: 'body',
      query: {key: 'val'},
      headers: {},
      fhRouterName: 'ok'
    });
  });
});
