"use strict";
const { Model } = require("objection");
class Comments extends Model {
  static get tableName() {
    return "application_comments";
  }

  static get jsonSchema() {
    return {
      type: "object",
      required: ["author_id", "body"],
      properties: {
        id: { type: "string" },
        author_id: { type: "number" },
        body: { type: "string" },
        created_at: { type: "string" },
        updated_at: { type: "string" }
      }
    };
  }

  static get relationMappings() {
    const User = require("@models/user");
    return {
      author: {
        relation: Model.BelongsToOneRelation,
        modelClass: User,
        join: {
          from: "application_comments.author_id",
          to: "users.id"
        }
      }
    };
  }
}

module.exports = Comments;