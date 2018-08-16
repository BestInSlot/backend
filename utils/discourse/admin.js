module.exports = function() {
    const self = this;
    return {
        activate(id) {
            return self.put(`/admin/users/${id}/activate`);
        },
        block(id) {
            return self.put(`/admin/users/${id}/block`);
        },
        unblock(id) {
            return self.put(`/admin/users/${id}/unblock`);
        },
        anonymize(id) {
            return self.put(`/admin/users/${id}/anonymize`);
        },
        suspend(id, body = {}) {
            return self.put(`/admin/users/${id}/suspend`, body);
        },
        unsuspend(id) {
            return self.put(`/admin/users/${id}/unsuspend`);
        }
    }
}