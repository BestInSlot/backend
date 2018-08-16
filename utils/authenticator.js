"use strict";
const fp = require("fastify-plugin");
const pick = require("lodash/pick");
const expressJwt = require("express-jwt");
const guard = require("express-jwt-permissions");

module.exports = fp(function(fastify, opts, next) {
  try {
    const _opts = pick(opts, [
      "secret",
      "aduience",
      "isssuer",
      "requestProperty",
      "resultProperty",
      "credentialsRequired",
      "getToken",
      "isRevoked"
    ]);
    fastify.decorate("auth", expressJwt(_opts));
  } catch (err) {
    return next(err);
  }

  const hasPermissions =
    typeof opts.reqPermissions === undefined ? true : opts.reqPermissions;

  if (fastify.auth && hasPermissions) {
    const _opts = ({ requestProperty, permissionsProperty } = opts);
    try {
      fastify.decorate("guard", guard(_opts));
    } catch (err) {
      return next(err);
    }
  }

  next();
});
