"use strict";
const UserController = require("./UserController");
const User = new UserController();
const {
  registerSchema,
  authSchema,
  userSchema,
  loginSchema,
  verifySchema,
  updateAvatarSchema,
  verifyPasswordChangeSchema,
  ssoSchema
} = require("./schemas");

module.exports = function(app, opts, next) {
  const { auth, sanitizer } = app;
  app.route({
    method: "POST",
    url: "/",
    // schema: registerSchema,
    beforeHandler: sanitizer({ allowedTags: [], allowedAttributes: [] }),
    handler: User.register
  });

  app.route({
    method: "GET",
    url: "/userDetails",
    schema: {
      ...authSchema,
      ...userSchema
    },
    beforeHandler: auth,
    handler: User.userDetails
  });

  app.route({
    method: "POST",
    url: "/login",
    schema: loginSchema,
    beforeHandler: sanitizer({ allowedTags: [], allowedAttributes: [] }),
    handler: User.login
  });

  app.route({
    method: "POST",
    url: "/logout",
    beforeHandler: auth,
    handler: User.logout
  });

  app.route({
    method: "PUT",
    url: "/verify",
    schema: verifySchema,
    handler: User.verify
  });

  app.route({
    method: "POST",
    url: "/verify/resend",
    handler: User.resendVerification
  });

  app.route({
    method: "POST",
    url: "/reset-password",
    beforeHandler: sanitizer,
    handler: User.resetPassword
  });

  app.route({
    method: "POST",
    url: "/update/password",
    schema: {
      ...authSchema
    },
    beforeHandler: [
      auth,
      sanitizer({ allowedTags: [], allowedAttributes: [] })
    ],
    handler: User.updatePassword
  });

  app.route({
    method: "PUT",
    url: "/update/password",
    schema: {
      ...verifyPasswordChangeSchema
    },
    handler: User.verifyPasswordUpdate
  });

  app.route({
    method: "POST",
    url: "/validate",
    beforeHandler: [
      auth,
      sanitizer({ allowedAttributes: [], allowedTags: [] })
    ],
    handler: User.check
  });

  app.route({
    method: "POST",
    url: "/check",
    beforeHandler: sanitizer({ allowedAttributes: [], allowedTags: [] }),
    handler: User.check
  });

  app.route({
    method: "POST",
    url: "/update/personal",
    beforeHandler: [
      auth,
      sanitizer({ allowedAttributes: [], allowedTags: [] })
    ],
    handler: User.updateUserDetails
  });

  app.route({
    method: "PUT",
    url: "/update/personal",
    beforeHandler: auth,
    handler: User.verifyUpdateUserDetails
  });

  app.route({
    method: "PUT",
    url: "/update/avatar",
    schema: {
      ...authSchema
    },
    beforeHandler: auth,
    handler: User.updateAvatar
  });

  app.route({
    method: "POST",
    url: "/sso",
    schema: {
      ...authSchema
      // ...ssoSchema
    },
    beforeHandler: auth,
    handler: User.logIntoForum
  });

  app.route({
    method: "POST",
    url: "/test",
    beforeHandler: sanitizer({ allowedTags: [], allowedAttributes: [] }),
    handler: function(req, reply) {
      console.log(`route handler: ${req.body}`);
      reply.code(200).send({ original: req.body });
    }
  });

  next();
};
