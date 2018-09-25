"use strict";
const Fastify = require("fastify");

function buildApp(opts = {}) {
  opts.logger = typeof opts.logger === undefined ? false : opts.logger;

  const app = Fastify(opts);
  const dbConf = require("./knexfile")[process.env.NODE_ENV];

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
  if (process.env.NODE_ENV === "development") {
    app.register(require("./utils/dev-mail"), {
      host: "smtp.ethereal.email",
      port: 587,
      auth: {
        user: "xzyk2neavypgsexm@ethereal.email",
        pass: "hDjGggYqDuMHj79NXP"
      }
    });
  }

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
    .register(require("./utils/discourse"), {
      host: process.env.DISCOURSE_HOST,
      port: process.env.DISCOURSE_PORT,
      apiKey: process.env.DISCOURSE_API_KEY,
      username: process.env.DISCOURSE_USER
    })
    /** SET UP SOCKET.IO **/
    .register(require("./utils/sockets"))
    .register(require("@utils/setupSockets"))
    /*** SETUP DB CONNECTION ***/
    .register(require("./config/db"), dbConf)
    .register(require("./utils/setupORM"))
    /*** SETUP ROUTES ***/
    .register(require("./api/v1/users/routes.js"), {
      prefix: "/v1/users"
    })
    .register(require("./api/v1/posts/routes.js"), {
      prefix: "/v1/posts"
    })
    .register(require("./api/v1/media/routes.js"), {
      prefix: "/v1/media"
    })
    .register(require("./api/v1/recruitment/routes.js"), {
      prefix: "/v1/recruitment"
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
    

  return app;
}

module.exports = buildApp;
