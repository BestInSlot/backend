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
    return {
      applicant: {
        relation: Model.BelongsToOneRelation,
        modelClass: User,
        join: {
          from: "user_applications.applicant_id",
          to: "users.id"
        }
      }
    };
  }
}

module.exports = UserApplication