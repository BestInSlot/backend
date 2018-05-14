const Model = require('../../../Base');

class Group extends Model {
    $beforeInsert(context) {
        super.$beforeInsert(context);
    }

    $beforeUpdate(context) {
        super.$beforeUpdate(context);
    }

    static get tableName() {
        return 'groups';
    }

    static get jsonSchema() {
        return {
            type: 'object',
            properties: {
                id: { type: 'integer' },
                group_name: { type: 'string'},
                can_read: {type: 'boolean'},
                can_write: {type: 'boolean'},
                can_edit_others: {type: 'boolean'},
                can_edit_self: {type: 'boolean'},
                can_upload: {type: 'boolean'},
                can_submit_stream: {type: 'boolean'},
                can_delete: {type: 'boolean'},
                can_ban: {type: 'boolean'},
                is_admin: {type: 'boolean'}
            }
        }
    }

    static get relationMappings() {
        const User = require('./UserModel');
        return {
            users: {
                relation: Model.ManyToManyRelation,
                modelClass: User,
                join: {
                    from: 'groups.id',
                    through: {
                        from: 'user_groups.group_id',
                        to: 'user_groups.user_id'
                    },
                    to: 'users.id'
                }
            }
        }
    }
}

module.exports = Group