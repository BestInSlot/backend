"use strict";
const Model = require("@model/base");
const guid = require("objection-guid")();

class UserApplication extends guid(Model) {
  static get tableName() {
    return "user_applications";
  }

  // $beforeInsert(context) {
  //   super.$beforeInsert(context);
  // }

  // $beforeUpdate(context) {
  //   super.$beforeUpdate(context);
  // }

  static get jsonSchema() {
    return {
      type: "object",
      required: ["applicant_id", "fields"],
      properties: {
        id: { type: "string" },
        applicant_id: { type: "integer" },
        game: { type: "string" },
        fields: { type: "string" },
        accepted: { type: "boolean" },
        created_at: { type: "string" },
        updated_at: { type: "string" }
      }
    };
  }

  static get relationMappings() {
    const User = require("@models/users");
    const Comments = require("@models/comments");
    return {
      applicant: {
        relation: Model.BelongsToOneRelation,
        modelClass: User,
        join: {
          from: "user_applications.applicant_id",
          to: "users.id"
        }
      },

      comments: {
        relation: Model.ManyToManyRelation,
        modelClass: Comments,
        join: {
          from: "user_applications.id",
          through: {
            from: "application_comments.application_id",
            to: "application_comments.comments_id"
          },
          to: "comments.id"
        }
      }
    };
  }
}

module.exports = UserApplication