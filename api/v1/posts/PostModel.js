"use strict";
const Model = require("@model/base");

class Post extends Model {
    $beforeInsert(context) {
        super.$beforeInsert(context);
    }

    $beforeUpdate(context) {
        super.$beforeUpdate(context);
    }

    static get tableName() {
        return 'posts';
    }

    static get jsonSchema() {
        return {
            type: "object",
            required: ["title", "slug", "body"],
            properties: {
                id: { type: "integer" },
                author_id: { type: "integer" },
                title: { type: "string" },
                slug: { type: "string" },
                body: { type: "string" },
                forum_ref: { type: "string" },
                featured_image_src: { type: "string" },
                featured: { type: "boolean" },
                public: { type: "boolean"}
            }
        }
    }

    static get relationMappings() {
        const User = require("@models/users");
        return {
            author: {
                relation: Model.BelongsToOneRelation,
                modelClass: User,
                join: {
                    from: 'posts.author_id',
                    to: 'users.id'
                }
            }
        }
    }
}

module.exports = Post;