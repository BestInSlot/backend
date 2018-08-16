"use strict";
const { AdminPostController } = require("../AdminController");

module.exports = function(app, opts, next) {
  const adminPostController = new AdminPostController();
  const { auth, sanitizer } = app;

  app.route({
    method: "GET",
    url: "/",
    handler: adminPostController.fetch
  });

  app.route({
    method: "DELETE",
    url: "/",
    handler: adminPostController.delete
  });

  app.route({
    method: "GET",
    url: "/:id",
    handler: adminPostController.fetchPost
  })

  next();
};
