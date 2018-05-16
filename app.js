"use strict";
require("dotenv").config();

const app = require("fastify")({
  logger: process.env.NODE_ENV === "development" ? true : false
});

/*** SETUP SOME SECURITY MIDDLEWARE */
app.use(require("cors")());
app.use(
  require("frameguard")({
    action: "deny"
  })
);
app.use(
  require("hide-powered-by")({
    setTo: "PHP 7.2.5"
  })
);
app.use(require("x-xss-protection")());

/*** SETUP PLUGIN MIDDLEWARE AND DEPENDENCIES ***/
app.register(require("fastify-multipart"), {
  fileSize: 73728
});
app.register(require("fastify-compress"), {
  global: false
});
app.register(require("fastify-jwt"), {
  secret: process.env.SECRET
});
app.register(require("./utils/authenticator"), {
  secret: process.env.SECRET,
  requestProperty: "auth",
  reqPermissions: false
});
app.register(require("fastify-redis"), {
  host: "127.0.0.1"
});
// app.register(require("./utils/mail"), {
//   apiKey: process.env.MAIL_API_KEY,
//   domain: process.env.MAIL_DOMAIN
// });
app.register(require('./utils/dev-mail'));
app.register(require("./utils/discourse"), {
  host: process.env.DISCOURSE_HOST,
  port: process.env.DISCOURSE_PORT,
  apiKey: process.env.DISCOURSE_API_KEY,
  username: process.env.DISCOURSE_USERNAME
});

/*** SETUP DB CONNECTION ***/
const dbConf = require("./knexfile")[process.env.NODE_ENV];
app.register(require("./config/db"), dbConf);
app.register(require("./utils/setupORM"));

/*** SETUP ROUTES ***/
app.register(require("./api/v1/users/routes.js"), {
  prefix: "/v1/users"
});

/***  START SERVER ***/
app.listen(process.env.PORT || 3000, function(err) {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
  console.log(
    `server is up and running on port ${app.server.address().port}.....`
  );
});

module.exports = app;
