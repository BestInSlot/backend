exports.up = function(knex, Promise) {
  return Promise.resolve(
    knex.schema.hasTable("users").then(exists => {
      if (!exists) {
        return knex.schema.createTable("users", function(t) {
          t.increments("id").primary();
          t.string("external_id").nullable();
          t.string("email");
          t.string("username");
          t.string("first_name");
          t.string("last_name");
          t.string("password");
          t.string("slug");
          t.string("avatar").default("http://localhost/assets/images/avatar-placeholder.png");
          t.boolean("approved").defaultTo(false);
          t.integer("login_attempts").default(5);
          t.string("activation_code").nullable();
          t.string("last_login_attempt");
          t.string("last_username_updated_at").nullable()
          t.string("last_password_recovery_attempt").nullable();
          t.boolean("show_notifications").default(false);
          t.boolean("is_admin").default(false);
          t.boolean("is_curator").default(false);
          t.dateTime("banned_at").nullable();
          t.timestamps();
          t.unique("email");
          t.unique("username");
        });
      }
    })
  );
};

exports.down = function(knex, Promise) {
  return Promise.resolve(knex.schema.dropTable("users"));
};
