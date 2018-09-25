"use strict";
const MediaController = require("./MediaController");
const Media = new MediaController();

module.exports = function(app, opts, next) {
  const { auth, sanitizer } = app;
  
  app.route({
    method: "POST",
    url: "/streams/add",
    beforeHandler: [
      auth,
      sanitizer({
        allowedTags: [],
        allowedAttributes: []
      })
    ],
    handler: Media.addStream
  });

  app.route({
    method: "GET",
    url: "/streams",
    handler: Media.fetchStreams
  });

  app.route({
    method: "GET",
    url: "/streams/get/:stream",
    handler: Media.fetchSingleStream
  })

  app.route({
    method: "GET",
    url: "/streams/webhook/update/:id",
    handler: Media.verifySubscription
  });

  app.route({
    method: "POST",
    url: "/streams/webhook/update/:id",
    handler: Media.updateStreamInfo
  });

  next();
};
