"use strict";

const UserController = require("./UserController");
const {
  registerSchema,
  authSchema,
  userSchema,
  loginSchema,
  verifySchema
} = require("./schemas");

module.exports = function(app, opts, next) {
  const userController = new UserController();
  app.route({
    method: "POST",
    url: "/",
    schema: registerSchema,
    handler: userController.register
  });

  app.route({
    method: "POST",
    url: "/verify",
    schema: verifySchema,
    handler: userController.verify
  });

  app.route({
    method: "GET",
    url: "/",
    schema: {
      ...authSchema,
      ...userSchema
    },
    beforeHandler: app.auth,
    handler: userController.me
  });

  app.route({
    method: "POST",
    url: "/login",
    schema: loginSchema,
    handler: userController.login
  });

  next();
};
