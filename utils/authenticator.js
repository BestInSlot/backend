const fp = require("fastify-plugin");
const expressJwt = require("express-jwt");
const UnauthorizedError = require("express-jwt/errors/UnauthorizedError");
const guard = require("express-jwt-permissions");
const pick = require('lodash/pick');

module.exports = fp(function(fastify, opts, next) {
  // if (!fastify.auth) {
  //   if (!opts.secret) {
  //     next(new Error("Secret not supplied."));
  //   }

  //   fastify.decorate("auth", require("express-jwt")(opts));
  // }

  // const hasPermissions =
  //   typeof opts.reqPermissions === undefined ? true : opts.reqPermissions;

  // if (fastify.auth && !fastify.guard && hasPermissions) {
  //   const { requestProperty } = opts;
  //   const _opts = Object.assign(
  //     {},
  //     { requestProperty, permissionsProperty: "permissions" }
  //   );

  //   fastify.decorate("guard", require("express-jwt-permissions")(_opts));
  // }
  // next();

  try {
    const properties = [
      "secret",
      "audience",
      "issuer",
      "requestProperty",
      "resultProperty",
      "credentialsRequired",
      "getToken",
      "isRevoked"
    ];

    pick(opts, properties);

    fastify.decorate("auth", expressJwt(opts));
    fastify.setErrorHandler(function(err, req, reply) {
      if (err && err instanceof UnauthorizedError) {
        if (err.message === 'token_expired') {
          return reply.code(401).send({ token_expired: true });
        } else {
          return { message: 'invalid_token...'};
        }
      }
    });
  } catch (err) {
    next(err);
  }

  const hasPermissions =
    typeof opts.reqPermissions === undefined ? true : opts.reqPermissions;

  if (fastify.auth && hasPermissions) {
    const _opts = ({ requestProperty, permissionsProperty } = opts);
    try {
      fastify.decorate("guard", guard(_opts));
    } catch (err) {
      next(err);
    }
  }

  next();
});
