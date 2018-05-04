const fp = require("fastify-plugin");
const expressJwt = require("express-jwt");
const UnauthorizedError = require("../node_modules/express-jwt/lib/errors/UnauthorizedError.js");
const guard = require("express-jwt-permissions");

module.exports = fp(function(fastify, opts, next) {
  try {
    const _opts = ({
      secret,
      audience,
      issuer,
      requestProperty,
      resultProperty,
      credentialsRequired,
      getToken,
      isRevoked
    } = opts);

    fastify
      .decorate("auth", expressJwt(_opts))
      .setErrorHandler(function(err, req, reply) {
        if (err && err instanceof UnauthorizedError) {
          if (err.message === "token_expired") {
            return reply.code(401).send({ token_expired: true });
          } else {
            return { message: "invalid_token..." };
          }
        }
      });
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
