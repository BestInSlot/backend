module.exports = async function(app, model) {
    try {
        await app.ready();
        model.knex(app.knex);
    }
    catch(err) {
        console.log(err);
        process.exit(1);
    }
}