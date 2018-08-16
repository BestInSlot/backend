"use strict";
const { AdminUserController } = require("../AdminController");

module.exports = function(app, opts, next) {
  const adminUserController = new AdminUserController();
  const { auth, sanitizer } = app;

  app.route({
    method: "GET",
    url: "/",
    handler: adminUserController.fetch
  });

  app.route({
    method: "DELETE",
    url: "/",
    handler: adminUserController.delete
  });

  next();
};
