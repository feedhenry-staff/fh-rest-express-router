'use strict';

const expect = require('chai').expect;

describe(__filename, function () {

  var mod = require('./get-request-type');

  it('should return "read"', function () {
    var ret = mod({
      method: 'GET',
      params: {id:'123'}
    });

    expect(ret).to.equal('read');
  });

  it('should return "list"', function () {
    var ret = mod({
      method: 'GET',
      params: {}
    });

    expect(ret).to.equal('list');
  });
});
