'use strict';

var Joi = require('joi');

module.exports = Joi.object().keys({
  name: Joi.string().alphanum().min(5).max(18).required(),
  age: Joi.string().alphanum().min(1).max(3).required()
});
