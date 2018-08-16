"use strict";
const PostController = require("./PostController");

module.exports = function(app, opts, next) {
  const postController = new PostController();

  const { auth, sanitizer } = app;

  app.route({
    method: "POST",
    url: "/",
    beforeHandler: [auth, sanitizer()],
    handler: postController.create
  });

  app.route({
    method: "GET",
    url: "/",
    handler: postController.index
  });

  app.route({
    method: "GET",
    url: "/:id",
    handler: postController.fetchPost
  });

  app.route({
    method: "PUT",
    url: "/:id",
    beforeHandler: [auth, sanitizer()],
    handler: postController.edit
  });

  app.route({
    method: "DELETE",
    url: "/:id",
    beforeHandler: auth,
    handler: postController.delete
  });

  app.route({
    method: "GET",
    url: "/test",
    handler: function(req, reply) {
      return { message: "This is just a test" };
    }
  })

  next();
};
