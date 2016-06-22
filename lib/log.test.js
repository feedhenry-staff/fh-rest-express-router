'use strict';

var proxyquire = require('proxyquire')
  , expect = require('chai').expect
  , sinon = require('sinon');

describe(__filename, function () {

  var mod, stubs;

  beforeEach(function () {
    stubs = {
      'fh-bunyan': {
        getLogger: sinon.stub()
      }
    };

    mod = proxyquire('./log.js', stubs);
  });

  it('should return a logger', function () {
    stubs['fh-bunyan'].getLogger.returns({});

    var log = mod({
      name: 'test'
    });

    expect(log).to.be.an('object');
    expect(stubs['fh-bunyan'].getLogger.called).to.be.true;
    expect(stubs['fh-bunyan'].getLogger.getCall(0).args[0]).to.equal(
      'fh-rest-express-router(router: test)'
    );
  });

  it('should return the same logger from previous calls', function () {
    stubs['fh-bunyan'].getLogger.returns({});

    var l1 = mod({
      name: 'test'
    });

    var l2 = mod({
      name: 'test'
    });

    expect(l1).to.equal(l2);
  });
});
