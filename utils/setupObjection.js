"use strict";

module.exports = async function(app) {
    try {
        await app.ready();
        Model.knex(app.knex);
    }
    catch(err) {
        console.log(err);
        process.exit(1);
    }
}
