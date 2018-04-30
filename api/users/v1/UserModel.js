const Model = require('../../../Base');
const bcrypt = require('bcryptjs');
const SALT_ROUNDS = 10;

'use strict';

class User extends Model {

    static get tableName() {
        return 'users';
    }

    async $beforeInsert(context) {
        try {
            super.$beforeInsert(context);
            this.password = await this.protectPassword(this.password);
        }
        catch(e) {
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
            type: 'object',
            required: ['email', 'fullname', 'email', 'password'],

            properties: {
                id: { type: 'integer'},
                email: { type: 'string'},
                fullname: { type: 'string' },
                username: { type: 'string' },
                password: { type: 'string' },
                avatar: { type: 'string' },
                approved: { type: 'boolean' },
                active: { type: 'boolean' },
                authentication_key: { type: 'string', min: 20, max: 20 },
                authentication_key_ttl: { type: 'integer' },
                password_reset_key: { type: 'string' },
                password_reset_key_ttl: { type: 'integer' },
                login_attempts: { type: 'integer' }
            }
        }
    }

    static get relationMappings() {
        const Permissions = require('./Permissions');
        const Posts = require('./Group');
        return {
            group: {
                relation: Model.ManyToManyRelation,
                modelClass: User,
                join: {
                    from: 'users.id',
                    through: {
                        from: 'user_groups.user_id',
                        to: 'user_groups.group_id'
                    },
                    to: 'groups.id'
                }
            },
            posts: {
                relation: Model.HasManyRelation,
                modelClass: Posts,
                join: {
                    from: 'users.id',
                    to: 'posts.author_id'
                }
            }
        }

    }

    protectPassword(pwd) {
        return new Promise((resolve, reject) => {
            bcrypt.genSalt(SALT_ROUNDS, function (err, salt) {
                if (err) {
                    reject(err);
                }

                bcrypt.hash(pwd, salt, function (err, hash) {
                    if (err) {
                        reject(err);
                    }
                    resolve(hash);
                })
            })
        })
    }

    verifyPassword(guess) {
        return bcrypt.compare(guess, this.password);
    }
}

module.exports = User;