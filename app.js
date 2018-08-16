"use strict";
require("dotenv").config();
require("module-alias/register");

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
app
  .register(require("fastify-multipart"), {
    fileSize: 73728
  })
  .register(require("./utils/sanitizer"))
  .register(require("fastify-compress"), {
    global: false
  })
  .register(require("fastify-jwt"), {
    secret: process.env.SECRET
  })
  .register(require("./utils/authenticator"), {
    secret: process.env.SECRET,
    requestProperty: "auth",
    reqPermissions: false
  })
  .register(require("fastify-redis"), {
    host: "127.0.0.1"
  })
  // app.register(require("./utils/mail"), {
  //   apiKey: process.env.MAIL_API_KEY,
  //   domain: process.env.MAIL_DOMAIN
  // });
  .register(require("./utils/dev-mail"), {
    host: "smtp.ethereal.email",
    port: 587,
    auth: {
      user: "xzyk2neavypgsexm@ethereal.email",
      pass: "hDjGggYqDuMHj79NXP"
    }
  })
  .register(require("./utils/discourse"), {
    host: process.env.DISCOURSE_HOST,
    port: process.env.DISCOURSE_PORT,
    apiKey: process.env.DISCOURSE_API_KEY,
    username: process.env.DISCOURSE_USER
  })
  .register(require("fastify-cookie"))
  //SET UP SOCKET.IO
  .register(require("./utils/sockets"));

/*** SETUP SOCKETS ***/
app.register(require("@utils/setupSockets"));

/*** SETUP DB CONNECTION ***/
const dbConf = require("./knexfile")[process.env.NODE_ENV];
app
  .register(require("./config/db"), dbConf)
  .register(require("./utils/setupORM"));

/*** SETUP ROUTES ***/
app
  .register(require("./api/v1/users/routes.js"), {
    prefix: "/v1/users"
  })
  .register(require("./api/v1/posts/routes.js"), {
    prefix: "/v1/posts"
  })
  .register(require("./api/v1/admin/routes/posts.js"), {
    prefix: "/v1/admin/posts"
  })
  .register(require("./api/v1/discord/routes.js"), {
    prefix: "/v1/discord"
  })
  .register(require("./api/v1/admin/routes/users.js"), {
    prefix: "/v1/admin/users"
  });

/*** END ANY PROCESSES ON RESTART, RELOAD, STOP  ***/
process.on("SIGINT", function() {});

/***  START SERVER ***/
app.listen(process.env.PORT || 3000, function(err) {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
  
  console.info(
    `server is up and running on port ${app.server.address().port}.....`
  );

  process.send("ready");
});

module.exports = app;
