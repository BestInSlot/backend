"use strict";
const knex = require("knex");
const fp = require("fastify-plugin");

function setup(fastify, opts, next) {
  try {
    const handler = knex(opts);
    fastify.decorate("knex", handler).addHook("onClose", close);
    next();
  } catch (e) {
    next(e);
  }
}

function close(fastify, done) {
  fastify.knex.destroy(done);
}

module.exports = fp(setup);
