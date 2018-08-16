const knex = require("knex");
const fp = require("fastify-plugin");

function setup(fastify, opts, next) {
    try {
        const handler = knex(opts);
        fastify.decorate("knex", handler);
        next();
    }
    catch (e) {
        next(e);
    }
}

module.exports = fp(setup);