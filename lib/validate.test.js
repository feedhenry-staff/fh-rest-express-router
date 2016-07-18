'use strict';

var expect = require('chai').expect
  , sinon = require('sinon')
  , express = require('express')
  , supertest = require('supertest')
  , proxyquire = require('proxyquire')
  , Joi = require('Joi');

describe(__filename, function () {
  var app, request, mod, stubs;

  beforeEach(function () {
    require('clear-require').all();

    app = express();

    request = supertest(app);

    stubs = {
      Joi: {
        validate: sinon.stub()
      }
    };

    mod = proxyquire('./validate', stubs);

    app.all('/items', mod({
      validations: {
        list: [Joi.object().keys({
          name: Joi.string().alphanum().min(5).max(15).required()
        })],
        create: [Joi.object().keys({
          name: Joi.string().alphanum().min(5).max(15).required()
        })]
      }
    }), function (req, res) {
      res.json([]);
    });
  });

  describe('function', function () {
    it('should throw assertion error - bad validations type', function () {
      expect(function () {
        mod({
          validations: 'hello'
        });
      }).to.throw('AssertionError');
    });

    it('should throw assertion error - bad validation', function () {
      expect(function () {
        mod({
          validations: {
            create: {}
          }
        });
      }).to.throw('AssertionError');
    });

    it('should throw assertion error - bad validation', function () {
      expect(function () {
        mod({
          validations: {
            create: [],
            update: {}
          }
        });
      }).to.throw('AssertionError');
    });

    it('should throw assertion error - bad validation', function () {
      expect(function () {
        mod({
          validations: {
            create: [],
            update: [],
            list: {}
          }
        });
      }).to.throw('AssertionError');
    });

    it('should throw assertion error - bad validation', function () {
      expect(function () {
        mod({
          validations: {
            create: [{
              isJoi: false
            }],
            update: [],
            list: []
          }
        });
      }).to.throw('AssertionError');
    });

    it('should create a middleware', function () {
      var ret = mod({
        validations: {
          create: [{
            isJoi: true
          }],
          update: [],
          list: []
        }
      });

      expect(ret).to.be.a('function');
    });

    it('should create a middleware without validations', function () {
      var ret = mod({});

      expect(ret).to.be.a('function');
    });
  });

  describe('middleware', function () {
    it('should reject the list request', function (done) {
      request
        .get('/items/?name=a')
        .expect(400)
        .expect('content-type', /json/)
        .end(function (err, res) {
          expect(err).to.not.exist;
          expect(res.body).to.be.an('object');
          expect(res.body.msg).to.contain(
            '"name" length must be at least 5 characters long]'
          );

          done();
        });
    });

    it('should accept the create request', function (done) {
      request
        .post('/items')
        .send({
          name: 'hello'
        })
        .expect(200)
        .expect('content-type', /json/)
        .end(function (err, res) {
          expect(err).to.not.exist;
          expect(res.body).to.be.an('array');
          expect(res.body).to.have.length(0);

          done();
        });
    });

    it('should accept the update request', function (done) {
      request
        .put('/items')
        .send({
          name: 'hello'
        })
        .expect(200)
        .expect('content-type', /json/)
        .end(function (err, res) {
          expect(err).to.not.exist;
          expect(res.body).to.be.an('array');
          expect(res.body).to.have.length(0);

          done();
        });
    });
  });
});
