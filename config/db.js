'use strict';
const knex = require('knex');
const fp = require('fastify-plugin');

module.exports = fp(function(fastify, opts, next) {
    try {
        const handler = knex(opts);
        fastify.decorate('knex', handler);
        next();
    }
    catch (e) {
        next(e);
    }
    
})