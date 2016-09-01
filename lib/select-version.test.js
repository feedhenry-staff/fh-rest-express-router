'use strict';

var expect = require('chai').expect;

describe(__filename, function () {

  var mod, adapter;

  beforeEach(function () {
    require('clear-require').all();


    adapter = {};
    mod = require('./select-version.js');
  });

  it('should use the default adapater version if unspecified', function () {
    var selector = mod({
      defaultVersion: 1,
      versions: {
        1: {
          adapter: adapter,
          validations: {}
        }
      }
    });

    var req = {
      headers: {}
    };

    selector(req, function (err, a) {
      expect(err).to.not.exist;
      expect(a).to.exist;
      expect(a.adapter).to.exist;
    });
  });

  it('should use the correct adapter if specified and available', function () {
    var selector = mod({
      versions: {
        12: {
          adapter: adapter
        }
      }
    });

    var req = {
      headers: {
        'x-fh-rest-api-version': 12
      }
    };

    selector(req, function (err, a) {
      expect(err).to.not.exist;
      expect(a).to.exist;
      expect(a.adapter).to.exist;
    });
  });

  it('should handle an invalid adapter version', function () {
    var selector = mod({
      versions: {
        1: {
          adapter: adapter
        }
      }
    });

    var req = {
      headers: {
        'x-fh-rest-api-version': 2
      }
    };

    selector(req, function (err, adapter) {
      expect(adapter).to.not.exist;
      expect(err).to.not.exist;
    });
  });

  it('should support the choice to not use versions', function () {
    var selector = mod({
      adapter: adapter
    });

    var req = {
      headers: {}
    };

    selector(req, function (err, adapter) {
      expect(err).to.not.exist;
      expect(adapter).to.exist;
    });
  });
});
