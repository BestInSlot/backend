exports.up = function(knex, Promise) {
  return Promise.resolve(
    knex.schema.hasTable("users").then(exists => {
      if (!exists) {
        return knex.schema.createTable("posts", function(t) {
          t
            .increments("id")
            .unsigned()
            .primary();
          t.integer("author_id").references("users.id");
          t.string("title");
          t.string("slug");
          t.string("featured_image_src").nullable();
          t.string("forum_slug");
          t.text("body");
          t.boolean("featured").default(false);
          t.timestamps();
          t.unique("slug");
        });
      }
    })
  );
};

exports.down = function(knex, Promise) {
  return Promise.resolve(knex.schema.dropTable("posts"));
};
