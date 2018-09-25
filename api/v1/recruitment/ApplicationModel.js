const Model = require("@model/base");
const guid = require("objection-guid")();

class Application extends guid(Model) {
  static get tableName() {
    return "application_templates";
  }

  // $beforeInsert(context) {
  //   const date = new Date().toISOString();
  //   this.created_at = date;
  // }

  // $beforeUpdate(context) {
  //   const date = new Date().toISOString();
  //   this.updated_at = date;
  // }

  static get jsonSchema() {
    return {
      type: "object",
      required: ["author_id", "fields"],
      properties: {
        id: { type: "string" },
        author_id: { type: "integer" },
        title: { type: "string" },
        icon: { type: "string" },
        description: { type: "string" },
        fields: { type: "string" },
        accepted: { type: "boolean" },
        created_at: { type: "string" },
        updated_at: { type: "string" }
      }
    };
  }

  static get relationMappings() {
    const User = require("@models/users");
    const UserApps = require("@models/userapp");
    return {
      author: {
        relation: Model.BelongsToOneRelation,
        modelClass: User,
        join: {
          from: "application_templates.author_id",
          to: "users.id"
        }
      },
      applications: {
        relation: Model.ManyToManyRelation,
        modelClass: UserApps,
        join: {
          from: "application_templates.id",
          through: {
            from: "applications.application_template_id",
            to: "applications.user_application_id"
          },
          to: "user_applications.id"
        }
      }
    };
  }
}

module.exports = Application