'use strict';
const fp = require("fastify-plugin");
const nodemailer = require("nodemailer");
const {
  createTestAccount,
  createTransport,
  getTestMessageUrl
} = nodemailer;

function fastifyTestMail(fastify, opts, next) {

  try {
    fastify
      .decorate("nodemailer", {
        messanger: createTransport(opts),
        sendTestMail
      })
      .addHook("onClose", close);
  } catch (err) {
    return next(err);
  }

  next();
}

function sendTestMail(data, cb) {
  createTestAccount((err, account) => {
    if (err) return cb(err);
    let transport = createTransport({
      host: account.smtp.host,
      port: account.smtp.port,
      secure: account.smtp.secure,
      auth: {
        user: account.user,
        pass: account.pass
      }
    });

    transport.sendMail(data, (err, info) => {
      if (err) return cb(err);

      return cb(null, info, getTestMessageUrl(info));
    });
  });
};

function close(fastify, done) {
  fastify.nodemailer.close(done);
}


module.exports = fp(fastifyTestMail);