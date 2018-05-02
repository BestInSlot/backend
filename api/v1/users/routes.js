"use strict";

const UserController = require("./UserController");
const registerSchema = require("./schemas/registerSchema");
const authSchema = require("./schemas/authSchema");
const userSchema = require("./schemas/userSchema");
const loginSchema = require("./schemas/loginSchema");

module.exports = function(app, opts, next) {
  const userController = new UserController();
  app.route({
    method: "POST",
    url: "/",
    schema: registerSchema,
    handler: userController.register
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

  app.route({
    method: "GET",
    url: "/test",
    // beforeHandler: app.auth,
    handler: userController.test
  });

  next();
};
