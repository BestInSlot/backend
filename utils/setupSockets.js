"use strict";
const redisAdapter = require("socket.io-redis");

module.exports = async function(app, opts, next) {
  const { io, redis } = app;

  io.adapter(redisAdapter({ host: 'localhost', port: 6379 }));

  io.on("connection", socket => {
    socket.on("room", room => {
      socket.join(room);
    });
    socket.on("leave-room", room => {
      socket.leave(room);
    });
    console.log(socket.id);
    // io.sockets.connected[socket.id].emit("connectedToService", socket.id);
    io.to(socket.id).emit("connected", socket.id);
  });

  next();
};
