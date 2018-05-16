exports.up = function(knex, Promise) {
  return Promise.all([
    knex.schema.hasTable("users").then(exists => {
      if (!exists) {
        return knex.schema.createTable("users", function(t) {
          t.increments("id").primary();
          t.string("email");
          t.string("username");
          t.string("fullname");
          t.string("password");
          t.string("slug");
          t.string("avatar").default("/assets/images/avatar-placeholder.png");
          t.boolean("approved").defaultTo(false);
          t.integer("login_attempts").default(5);
          t.string("last_login_attempt");
          t.string("last_password_recovery_attempt");
          t.timestamps();
          t.unique("email");
          t.unique("username");
        });
      }
    }),
    knex.schema.hasTable("user_groups").then(exists => {
      if (!exists) {
        return knex.schema.createTable("user_groups", function(t) {
          t.integer("user_id").references("users.id");
          t.integer("group_id").references("groups.id");
        });
      }
    }),
    knex.schema.hasTable("groups").then(exists => {
      if (!exists) {
        return knex.schema.createTable("groups", function(t) {
          t.increments("id").primary();
          t.string("group_name");
          t.boolean("can_read").default(true);
          t.boolean("can_write").default(false);
          t.boolean("can_edit_others").default(false);
          t.boolean("can_edit_self").default(true);
          t.boolean("can_upload").default(false);
          t.boolean("can_submit_stream").default(false);
          t.boolean("can_delete").default(false);
          t.boolean("can_ban").default(true);
          t.boolean("is_admin").default(false);
          t.unique("group_name");
          t.timestamps();
        });
      }
    })
  ]);
};

exports.down = function(knex, Promise) {
  return Promise.all([
    knex.schema.dropTable("user_groups"),
    knex.schema.dropTable("users"),
    knex.schema.dropTable("groups")
  ]);
};
