"use strict";
const fp = require("fastify-plugin");

function setupMail(fastify, opts, next) {
  if (!fastify.mail) {
    const required = ["apiKey", "domain"];

    required.forEach(prop => {
      if (typeof opts[prop] === undefined) {
        next(new Error(`missing required properties: '${opts[prop]}'`));
      }
    });

    fastify.decorate("mail", require("mailgun-js")(opts));
  }
  next();
}

module.exports = fp(setupMail);
