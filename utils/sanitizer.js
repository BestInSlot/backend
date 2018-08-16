const sanitize = require("sanitize-html");
const fp = require("fastify-plugin");

function setupPlugin(fastify, opts, next) {
  try {
    const handler = sanitizer();
    fastify.decorate("sanitizer", handler);
    next();
  } catch (e) {
    next(e);
  }
}

function sanitizer() {
  return function options(opts) {
    return function(req, reply, next) {
      let request = req.body || req.query;
      request = recursiveSanitize(request, opts);
      next();
    };
  };
}

function recursiveSanitize(req, opts) {
  for (let key in req) {
    if (isObject(req[key])) {
      recursiveSanitize(req[key], opts);
    } else if (isString(req[key])) {
      req[key] = sanitize(req[key], opts)
        .replace(/\{\{[\s\S]*|[\s\S]*\}\}/gm, "")
        .trim();
    } else if (
      isBoolean(req[key]) ||
      isNumber(req[key]) ||
      (Array.isArray(req[key]) && opts.arrayIsSafe)
    ) {
      req[key] = req[key];
    }
  }
  return req;
}

function isObject(val) {
  return (
    typeof val === "object" &&
    typeof val !== "function" &&
    !Array.isArray(val) &&
    val !== null
  );
}

function isString(val) {
  return typeof val === "string";
}

function isNumber(val) {
  return !isNaN(val);
}

function isBoolean(val) {
  return typeof val === "boolean" || typeof val === typeof true;
}

module.exports = fp(setupPlugin);
