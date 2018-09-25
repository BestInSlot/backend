exports.up = function(knex, Promise) {
  return Promise.resolve(
    knex.schema.hasTable("posts").then(exists => {
      if (!exists) {
        return knex.schema.createTable("posts", function(t) {
          t
            .increments("id")
            .unsigned()
            .primary();
          t.integer("author_id").references("users.id");
          t.integer("forum_topic_id").nullable();          
          t.string("title");
          t.string("slug");
          t.string("featured_image_src").nullable();
          t.string("forum_ref").nullable();
          t.text("body");
          t.boolean("featured").default(false);
          t.boolean("draft").default(false);
          t.timestamps();
          t.unique("slug");
        });
      }
    })
  );
};

exports.down = function(knex, Promise) {
  return Promise.resolve(
    knex.schema.hasTable("posts").then(exists => {
      if (exists) {
        return knex.schema.dropTable("posts");
      }
    })
  );
};
