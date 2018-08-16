"use strict";
const fp = require("fastify-plugin");
const Boom = require("boom");

function onError(err) {
  console.log(err);
  throw Boom.internal(err);
}

function setUp(fastify, opts, next) {
  let redis;

  opts = opts || {
    path: "/sockets",
    pingInterval: 10000,
    pingTimeout: 5000
  };

  if (fastify.redis) {
    redis = fastify.redis;
  } else {
    const err = new Error("Missing redis.");
    next(err);
  }

  try {

    const emitter = require("socket.io-emitter")(redis);
    emitter.redis.on("error", onError);
    fastify.decorateReply("io", emitter);
    
    
    const handler = require("socket.io")(fastify.server)
    fastify.decorate("io", handler).onClose(done => fastify.io.close(done));
    next();

  } catch (err) {
    next(err);
  }
}

module.exports = fp(setUp);
