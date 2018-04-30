const jwt = require("express-jwt");
const fp = require("fastify-plugin");

module.exports = fp(function(fastify, opts, next) {
  if (!fastify.auth) {
    if (!opts.secret) {
      next(new Error("Secret not supplied."));
    }

    fastify.decorate("auth", require("express-jwt")(opts));
  }

  const hasPermissions =
    typeof opts.reqPermissions === undefined ? true : opts.reqPermissions;

  if (fastify.auth && !fastify.guard && hasPermissions) {
    const { requestProperty } = opts;
    const _opts = Object.assign(
      {},
      { requestProperty, permissionsProperty: "permissions" }
    );

    fastify.decorate("guard", require("express-jwt-permissions")(_opts));
  }
  next();
});
