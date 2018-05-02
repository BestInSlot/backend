'use strict';
const { Model } = require("objection");
module.exports = async function(app, model) {
    try {
        await app.ready();
        Model.knex(app.knex);
    }
    catch(err) {
        console.log(err);
        process.exit(1);
    }
}