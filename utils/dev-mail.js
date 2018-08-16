'use strict';
const fp = require("fastify-plugin");
const nodemailer = require("nodemailer");
const {
  createTestAccount,
  createTransport,
  getTestMessageUrl
} = nodemailer;

function fastifyTestMail(fastify, opts, next) {

  try {
    fastify
      .decorate("nodemailer", {
        messenger: createTransport(opts),
        getTestMessageUrl
      })
      .addHook("onClose", close);
  } catch (err) {
    return next(err);
  }

  next();
}

function close(fastify, done) {
  fastify.nodemailer.close(done);
}


module.exports = fp(fastifyTestMail);