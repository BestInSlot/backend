"use strict";
const fp = require("fastify-plugin");

function setupMail(fastify, opts, next) {
  if (!fastify.mail) {
    const _opts = {};

    const properties = [
      "apiKey",
      "publicApiKey",
      "domain",
      "mute",
      "proxy",
      "timeout",
      "host",
      "protocol",
      "port",
      "endpoint",
      "retry"
    ];

    properties.forEach(prop => {
      if (typeof opts[prop] !== undefined) {
        _opts[prop] = opts[prop];
      }
    });

    fastify.decorate("mail", () => {
      return require("mailgun-js")({
        ..._opts
      });
    });
  }
  next();
}

module.exports = fp(setupMail);
