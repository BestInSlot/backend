"use strict";

const { schemas, Discord } = require("./discord");
const DiscordController = new Discord();

module.exports = function(app, options, next) {
  const { sanitizer, auth } = app;

  app.route({
    method: "GET",
    url: "/oauth2",
    schema: schemas.discordOauth2Schema,
    handler: DiscordController.discordOauth2
  });

  app.route({
    method: "PUT",
    url: "/oauth2",
    schema: schemas.discordOauth2Schema,
    beforeHandler: auth,
    handler: DiscordController.discordOauth2
  });

  app.route({
    method: "GET",
    url: "/getState",
    schema: schemas.getStateSchema,
    beforeHandler: sanitizer({ allowedTags: [], allowedAttributes: [] }),
    handler: DiscordController.getState
  });

  next();
};
