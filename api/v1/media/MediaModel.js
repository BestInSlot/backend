"use strict";
const Model = require("@model/base");

class Streams extends Model {
  static get tableName() {
    return "streams";
  }

  $beforeInsert(context) {
    super.$beforeInsert(context);
  }

  $beforeUpdate(context) {
    super.$beforeUpdate(context);
  }

  static get jsonSchema() {
    return {
      type: "object",
      required: ["login_name", "streamer_id", "submitter_id"],

      properties: {
        id: { type: "integer" },
        login_name: { type: "string" },
        display_name: { type: "string" },
        streamer_id: { type: "string" },
        live: { type: "boolean" },
        profile_image_url: { type: "string " },
        offline_image_url: { type: "string" },
        submitter_id: { type: "integer" },
        created_at: { type: "string" },
        updated_at: { type: "string" }
      }
    };
  }

  static get relationalMappings() {
    const User = require("@/models/users");
    const Subscriptions = require("@/models/subscriptions");
    return {
      submitter: {
        relation: Model.BelongsToOneRelation,
        modelClass: User,
        join: {
          from: "streams.submitter_id",
          to: "users.id"
        }
      },

      subscription: {
        relation: Model.HasOneThroughRelation,
        modelClass: Subscriptions,
        join: {
          from: "streams.id",
          through: {
            from: "streams_subscriptions.stream_id",
            to: "streams_subscriptions.subscription_id"
          },
          to: "subscriptions.id"
        }
      }
    };
  }
}

module.exports = Streams;
