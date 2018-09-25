exports.up = function(knex, Promise) {
  return Promise.resolve(
    knex.schema.hasTable("streams").then(exists => {
      if (exists) return;
      return knex.schema.createTable("streams", function(t) {
        t.increments("id").primary();
        t.string("stream_owner");
        t.string("display_name");
        t.text("description");
        t.text("title");
        t.bigInteger("streamer_id")
        t.bigInteger("external_stream_id")               
        t.string("stream_address")
        t.string("thumbnail_url").nullable();
        t.string("profile_image_url").nullable();
        t.string("offline_image_url").nullable();
        t.boolean("live").default(false);        
        t.integer("submitter_id").references("users.id");
        t.timestamps();
        t.unique("stream_owner");
        t.unique("stream_address");
        t.unique("streamer_id");
        t.unique("external_stream_id");
      });
    })
  );
};

exports.down = function(knex, Promise) {
  return Promise.resolve(knex.schema.dropTable("streams"));
};
