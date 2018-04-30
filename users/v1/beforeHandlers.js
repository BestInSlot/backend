"use strict";
const { promisify } = require("utils");
const Boom = require("boom");

module.exports = function(app) {
  const beforeRegister = async function(req, reply, done) {
    const asyncGet = promisify(app.redis.get).bind(app.redis);
    const key = `${credentials.username}:verify`;

    if (await asyncGet(key)) {
      return Boom.conflict("Your authentication key hasn't expired yet.");
    } else {
      done();
    }
  };

  return {
    beforeRegister
  }
};
