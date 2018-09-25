exports.up = function(knex, Promise) {
  return Promise.all([
    knex.schema.hasTable("stream_subscriptions", exists => {
      if (exists) return;
      return knex.schema.createTable("stream_subscriptions", t => {
        t.integer("subscription_id");
        t.integer("stream_id");
      });
    }),
    knex.schema.hasTable("subscriptions", exists => {
      if (exists) return;
      return knex.schema.createTable("subscriptions", t => {
        t.uuid("id").primary();
        t.boolean("active").default(false);
        t.string("start");
        t.string("expires");
      });
    })
  ]);
};

exports.down = function(knex, Promise) {
  return Promise.all([
    knex.schema.dropTable("subscriptions"),
    knex.schema.dropTable("stream_subscriptions")
  ]);
};
