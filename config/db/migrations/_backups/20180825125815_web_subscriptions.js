exports.up = function(knex, Promise) {
  return Promise.resolve(
    knex.schema.hasTable("web_subscriptions", function(exists) {
      if (!exists) {
        return knex.schema.createTable("web_subscriptions", function(t) {
          t.uuid("id").primary();
          t.integer("streamer_id").references("streams.stream_owner_id");
          t.string("starts");
          t.string("expires");
        });
      }
    })
  );
};

exports.down = function(knex, Promise) {
  return Promise.resolve(knex.schema.dropTable("web_subscriptions"));
};
