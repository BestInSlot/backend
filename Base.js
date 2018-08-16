const {Model} = require('objection');

class Base extends Model {
    $beforeInsert(context) {
        const currentDate = new Date();
        this.created_at = currentDate.toISOString();
        this.updated_at = this.created_at;
    }

    $beforeUpdate() {
        const currentDate = new Date();
        this.updated_at = currentDate.toISOString();
    }
}

module.exports = Base;