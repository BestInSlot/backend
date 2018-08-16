module.exports = function() {
    const self = this;

    return {
        create(params) {
            return self.post("/posts.json", params);
        },
        delete(id) {
            return self.delete(`/t/${id}.json`);
        },
        edit(slug, id, params = {}) {
            return self.put(`/t/-/${id}.json`, params)
        }
    }
}