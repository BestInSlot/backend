"use strict";
require("dotenv").config();
require("module-alias/register");

const app = require("./server")({ logger: true });

/*** END ANY PROCESSES ON RESTART, RELOAD, STOP  ***/
// process.on("SIGINT", function () {});

/***  START SERVER ***/
app.listen(process.env.PORT || 3000, function(err) {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }

  console.info(
    `server is up and running on port ${app.server.address().port}.....`
  );

  // process.send("ready");
});