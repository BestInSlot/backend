exports.up = function(knex, Promise) {
  return Promise.all([
    knex.schema.hasTable("comments").then(exists => {
      if (exists) return;
      return knex.schema.createTable("comments", t => {
        t.increments("id").primary();
        t.integer("author_id").references("users.id");
        t.text("body");
        t.timestamps();
      });
    }),
    knex.schema.hasTable("application_comments").then(exists => {
      if (exists) return;
      knex.schema.createTable("application_comments", t => {
        t.integer("comment_id").references("comments.id");
        t.string("application_id").references("user_applications.id");
      });
    }),
    knex.schema.hasTable("application_score").then(exists => {
      if (exists) return;
      knex.schema.createTable("application_scores", t => {
        t.increments("id").primary();
        t.string("application_id").references("user_applications.id");
        t.integer("voter_id").references("users.id");
        t.integer("vote").default(0);
        t.timestamps();
      });
    })
  ]);
};

exports.down = function(knex, Promise) {
  return Promise.all([
    knex.schema.dropTable("application_comments"),
    knex.schema.dropTable("application_score"),
    knex.schema.dropTable("comments")
  ]);
};
