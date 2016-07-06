'use strict';

var expect = require('chai').expect;

describe(__filename, function () {

  var mod;
  var opts = {
    name: 'test',
    adapter: {}
  };

  beforeEach(function () {
    mod = require('./verify-adapter-response.js');
  });

  it('should return a validator function', function () {
    expect(mod(opts)).to.be.a('function');
  });

  it('should return true - create', function () {
    var ret = mod(opts)('create', {
      uid: '1234',
      data: {}
    });

    expect(ret).to.be.true;
  });

  it('should return false - create', function () {
    var ret = mod(opts)('create', {
      uid: '1234'
    });

    expect(ret).to.be.false;
  });

  it('should return false - create', function () {
    var ret = mod(opts)('create', {
      data: {}
    });

    expect(ret).to.be.false;
  });

  it('should return false - create', function () {
    var ret = mod(opts)('create', {});

    expect(ret).to.be.false;
  });

  it('should return false - create', function () {
    var ret = mod(opts)('create', null);

    expect(ret).to.be.false;
  });

  it('should return false - create', function () {
    var ret = mod(opts)('create', []);

    expect(ret).to.be.false;
  });

  ['read', 'update', 'delete', 'list'].forEach(function (type) {
    it('should return true - ' + type, function () {
      var ret = mod(opts)(type, {});

      expect(ret).to.be.true;
    });

    it('should return false - ' + type, function () {
      var ret = mod(opts)(type, []);

      expect(ret).to.be.false;
    });
  });
});
