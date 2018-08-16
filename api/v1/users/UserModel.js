"use strict";

const Model = require("@model/base");
const bcrypt = require("bcryptjs");
const SALT_ROUNDS = 10;

class User extends Model {
  static get tableName() {
    return "users";
  }

  async $beforeInsert(context) {
    try {
      super.$beforeInsert(context);
      this.password = await this.protectPassword(this.password);
    } catch (e) {
      console.log(e);
    }
  }

  async $beforeUpdate(context) {
    super.$beforeUpdate(context);
    if (this.password) {
      this.password = await this.protectPassword(this.password);
    }
  }

  static get jsonSchema() {
    return {
      type: "object",
      required: ["username", "first_name", "last_name", "email", "password"],

      properties: {
        id: { type: "integer" },
        email: { type: "string" },
        first_name: { type: "string" },
        last_name: { type: "string" },
        username: { type: "string" },
        password: { type: "string" },
        slug: { type: "string" },
        avatar: { type: "string" },
        approved: { type: "boolean" },
        login_attempts: { type: "integer" },
        last_login_attempt: { type: "string" },
        last_password_recovery_attempt: { type: "string" },
        is_admin: { type: "boolean" },
        is_curator: { type: "boolean" }
      }
    };
  }

  static get relationMappings() {
    const Post = require("@models/posts");
    return {
      posts: {
        relation: Model.HasManyRelation,
        modelClass: Post,
        join: {
          from: "users.id",
          to: "posts.author_id"
        }
      }
    };
  }

  async protectPassword(pwd) {
    try {
      let salt = await bcrypt.genSalt(10);
      let hashed = await bcrypt.hash(pwd, salt);
      return hashed;
    } catch (err) {
      throw new Error(err);
    }
  }

  verifyPassword(guess) {
    return bcrypt.compare(guess, this.password);
  }
}

module.exports = User;
