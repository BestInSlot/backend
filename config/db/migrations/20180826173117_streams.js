exports.up = function(knex, Promise) {
  return Promise.all([
    knex.schema.hasTable("streams").then(exists => {
      if (exists) return;
      return knex.schema.createTable("streams", t => {
        t.increments("id").primary();
        t.string("login_name");
        t.string("display_name");
        t.string("streamer_id");
        t.string("title");
        t.boolean("live").default(false);
        t.string("profile_image_url").nullable();
        t.string("offline_image_url").nullable();
        t.integer("submitter_id").references("users.id");
        t.timestamps();
        t.unique("streamer_id");
        t.unique("login_name");
      });
    }),
    knex.schema.hasTable("application_templates").then(exists => {
      if (exists) return;
      return knex.schema.createTable("application_templates", t => {
        t.uuid("id").primary();
        t.integer("author_id").references("users.id");
        t.string("title");
        t.string("background").nullable();
        t.string("icon").nullable();
        t.text("description").nullable();
        t.jsonb("fields");
        t.timestamps();
      });
    }),
    knex.schema.hasTable("applications").then(exists => {
      if (exists) return;
      return knex.schema.createTable("applications", t => {
        t.uuid("application_template_id").references("application_templates.id");
        t.uuid("user_application_id").references("user_applications.id");
      })
    }),
    knex.schema.hasTable("user_applications").then(exists => {
      if (exists) return;
      return knex.schema.createTable("user_applications", t => {
        t.uuid("id").primary();
        t.integer("applicant_id").references("users.id");
        t.jsonb("fields");
        t.integer("score");
        t.boolean("approved").default(false);
        t.boolean("rejected").default(false);
        t.boolean("pending").default(true);
        t.timestamps();
      });
    })
  ]);
};

exports.down = function(knex, Promise) {
  return Promise.all([
    knex.schema.dropTable("streams"),
    knex.schema.dropTable("applications"),
    knex.schema.dropTable("application_templates"),
    knex.schema.dropTable("user_applications")
  ]);
};
