//acquire and config global env properties.
"use strict";
require("dotenv").config();

const app = require("fastify")({
  logger: process.env.NODE_ENV === "development" ? true : false
});

const dbConf = require("./knexfile")[process.env.NODE_ENV];

/*** SETUP SOME SECURITY MIDDLEWARE */
app.use(require('cors')());
app.use(require('frameguard')({
  action: 'deny'
}));
app.use(require('hide-powered-by')({
  setTo: 'PHP 7.2.5'
}));
app.use(require('x-xss-protection')());

/*** SETUP MORE MIDDLEWARE AND DEPENDENCIES ***/
app.register(require("./db"), dbConf);
app.register(require("fastify-compress"), {
  global: false
});
app.register(require("fastify-jwt"), {
  secret: process.env.SECRET
});
app.register(require("../utils/authenticator"), {
  secret: process.env.SECRET,
  requestProperty: "auth",
  reqPermissions: false
});
app.register(require("fastify-redis"), {
  host: "127.0.0.1"
});
app.register(require("../utils/mail"), {
  apiKey: process.env.MAIL_API_KEY,
  domain: process.env.MAIL_DOMAIN
});
app.register(require("../utils/discourse"), {
  host: process.env.DISCOURSE_HOST,
  port: process.env.DISCOURSE_PORT,
  apiKey: process.env.DISCOURSE_API_KEY,
  username: process.env.DISCOURSE_USERNAME
});

/*** SETUP DB CONNECTION ***/
const {
  Model
} = require("objection");
Model.knex(app.knex);

//register routes
app.register(require("../users/v1/routes.js"), {
  prefix: "/v1/users"
});

app.listen(3000, function (err) {
  if (err) {
    app.log.error(err);
  }
  console.log("server is up and running on port 3000....");
});

module.exports = app;