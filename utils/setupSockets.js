"use strict";
const redisAdapter = require("socket.io-redis");
// const DB = require("../config/db/pgdb");

// const pg = new DB({
//   dbUser: "h3lix",
//   dbPass: "hihi00hihi",
//   dbName: "bestinslot_dev",
//   dbHost: "localhost",
//   dbPort: 5432
// });

// const { Client } = pg;

module.exports = async function(app, opts, next) {
  const { io, redis } = app;

  io.adapter(redisAdapter({ host: "localhost", port: 6379 }));

  io.on("connection", socket => {
    socket.on("join room", room => {
      console.log("%s has joined %s", socket.id, room);
      socket.join(room);
    });
    socket.on("leave room", room => {
      console.log("%s has left %s", socket.id, room);
      socket.leave(room);
    });
    io.to(socket.id).emit("connected", socket.id);
  });

  next();
};
