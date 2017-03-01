'use strict';

var expect = require('chai').expect
  , sinon = require('sinon')
  , express = require('express')
  , supertest = require('supertest')
  , proxyquire = require('proxyquire')
  , Joi = require('joi')
  , bodyParser = require('body-parser');

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

    mod = proxyquire('./index.js', stubs);

    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({extended: true}));

    app.all('/items', mod({
      bodyAndQueryValidations: {
        list: [{
          schema: Joi.object().keys({
            name: Joi.string().alphanum().min(5).max(15).required()
          })
        }],
        create: [{
          schema: Joi.object().keys({
            name: Joi.string().alphanum().min(5).max(15).required()
          })
        }]
      }
    }), function (req, res) {
      res.json([]);
    });

    app.all('/gadgets', mod({
      bodyAndQueryValidations: {
        list: [{
          schema: Joi.object().keys({
            who: Joi.string().alphanum().min(2).max(15).default('you'),
            what: Joi.number()
          }),
          options: {
            stripUnknown: true,
            convert: true
          }
        }]
      }
    }), function (req, res) {
      res.json(req.query);
    });

    app.all('/gidgets', mod({
      bodyAndQueryValidations: {
        list: [{
          schema: Joi.object().keys({
            number: Joi.number()
          }),
          options: {
            convert: false
          }
        }],
        update: [{
          schema: Joi.object().keys({
            number: Joi.number()
          }),
          options: {
            stripUnknown: true,
            convert: false
          }
        }]
      }
    }), function (req, res) {
      res.json(req.body);
    });

  });

  describe('function', function () {
    it('should throw assertion error - bad validations type', function () {
      expect(function () {
        mod({
          bodyAndQueryValidations: 'hello'
        });
      }).to.throw('AssertionError');
    });

    it('should throw assertion error - bad validation', function () {
      expect(function () {
        mod({
          bodyAndQueryValidations: {
            create: {}
          }
        });
      }).to.throw('AssertionError');
    });

    it('should throw assertion error - bad validation', function () {
      expect(function () {
        mod({
          bodyAndQueryValidations: {
            create: [],
            update: {}
          }
        });
      }).to.throw('AssertionError');
    });

    it('should throw assertion error - bad validation', function () {
      expect(function () {
        mod({
          bodyAndQueryValidations: {
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
          bodyAndQueryValidations: {
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
        bodyAndQueryValidations: {
          create: [{
            schema: {
              isJoi: true
            }
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

    it('should throw assertion error - bad Joi Validate Option type', function () {
      expect(function () {
        mod({
          bodyAndQueryValidations: {
            create: [{
              shema: Joi.object().keys({
                id: Joi.number()
              }),
              options: 'hello'
            }]
          }
        });
      }).to.throw('AssertionError');
    });

    it('should throw assertion error - bad Joi Validate Option', function () {
      expect(function () {
        mod({
          bodyAndQueryValidations: {
            create: [{
              schema: Joi.object().keys({
                id: Joi.number()
              }),
              options: []
            }]
          }
        });
      }).to.throw('AssertionError');
    });

    it('should throw assertion error - bad Joi Validate Option', function () {
      expect(function () {
        mod({
          bodyAndQueryValidations: {
            create: {},
            update: {},
            list: []
          }
        });
      }).to.throw('AssertionError');
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

    it('should strip the where parameter and accept the list request', function (done) {
      request
        .get('/gadgets?who=Sue&where=there')
        .expect(200)
        .expect('content-type', /json/)
        .end(function (err, res) {
          expect(err).to.not.exist;
          expect(res.body).to.eql({who: 'Sue'});

          done();
        });
    });

    it('should use the default for who, you, and accept the list request', function (done) {
      request
        .get('/gadgets?what=123')
        .expect(200)
        .expect('content-type', /json/)
        .end(function (err, res) {
          expect(err).to.not.exist;
          expect(res.body).to.eql({what:123, who:'you'});

          done();
        });
    });

    it('should remove extraneous and accept the update request', function (done) {
      request
        .put('/gidgets')
        .set('Accept', 'application/json')
        .send({
          number: 123,
          extraneous: 'who me?'
        })
        .expect(200)
        .expect('content-type', /json/)
        .end(function (err, res) {
          expect(err).to.not.exist;
          expect(res.body).to.eql({number: 123});

          done();
        });
    });

    it('should reject the list request because, convert is set to false', function (done) {
      request
        .get('/gidgets?number=123')
        .expect(400)
        .expect('content-type', /json/)
        .end(function (err, res) {
          expect(err).to.not.exist;
          expect(res.body).to.be.an('object');
          expect(res.body.msg).to.contain(
            'child "number" fails because ["number" must be a number]'
          );

          done();
        });
    });

  });
});
