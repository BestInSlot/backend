"use strict";

const UserController = require("./UserController");
const {
  registerSchema,
  authSchema,
  userSchema,
  loginSchema,
  verifySchema,
  verifyPasswordChangeSchema
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
    method: "POST",
    url: "/verify",
    schema: verifySchema,
    handler: userController.verify
  });

  app.route({
    method: "POST",
    url: "/verify/resend",
    handler: userController.resendVerification
  });

  app.route({
    method: "PUT",
    url: "/change-password",
    schema: {
      ...authSchema
    },
    beforeHandler: app.auth,
    handler: userController.changePassword
  });

  app.route({
    method: "PUT",
    url: "/change-password/verify",
    schema: {
      ...authSchema,
      ...verifyPasswordChangeSchema
    },
    beforeHandler: app.auth,
    handler: userController.verifyPasswordChange
  });

  next();
};
