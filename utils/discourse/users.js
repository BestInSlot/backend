module.exports = function() {
  "use strict";
  const self = this;
  return {
    findOne(username) {
      return self.get(`/users/${username}.json`);
    },

    find(flag, params = {}) {
      if (!flag) {
        new Exception(
          "Must have a flag: 'active', 'new', 'staff', 'suspended', 'blocked', 'suspect'"
        );
      }

      return self.get(`/admin/users/list/${flag}.json`, { params });
    },

    findOneByExternalId(id) {
      return self.get(`/users/by-external/${id}.json`);
    },

    uploadAvatar(params) {
      return self({
        method: "POST",
        url: "/uploads.json",
        headers: {
          "content-type": "multipart/form-data"
        },
        data: {
          ...params
        }
      });
    },

    updateAvatar(username, params = {}) {
      return self.put(`/users/${username}/preferences/pick`, { ...params });
    },

    updateEmail(username, email) {
      return self.put(`/users/${username}/preferences/email`, { email });
    },

    create(params) {
      //name, email, password, username, active, approved
      return self.post(`/users`, { ...params });
    },

    delete(id) {
      return self.delete(`/admin/users/${id}.json`);
    },

    logout(id) {
      return self.post(`/admin/users/${id}/log_out`);
    }
  };
};
