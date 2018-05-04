"use strict";
const Boom = require("boom");
const User = require("./UserModel");
const crypto = require("crypto");
const { promisify } = require("util");

class UserController {
  constructor() {}

  async register(req, reply) {
    const { credentials } = req.body;
    const randomString = crypto.randomBytes(20).toString("hex");
    const key = `${credentials.username}:verify`;
    let user, verification;
    try {
      user = await User.query()
        .insert(credentials)
        .returning("*");
    } catch (e) {
      console.log(e);
      if (e && e.code === "23505") {
        return Boom.conflict("User already exists");
      }
      return Boom.badRequest("Invalid credentials");
    }

    try {
      verification = await this.redis.set(key, randomString, "EX", 600);
      console.log(verification);
    } catch (e) {
      console.log(e);
      return Boom.internal(e.message);
    }

    const data = {
      from: "noreply@bestinslot.org",
      to: `${user.email}`,
      subject: "Please verify your account",
      text: `Please copy and paste the following into your browser: http://localhost:8080/verify/?username=${
        user.username
      }&key=${randomString}`
    };

    // this.mail.messages().send(data, function(err, body) {
    //   if (err) {
    //     console.log(err);
    //     return Boom.internal(err);
    //   }
    //   console.log(body);
    // });

    this.nodemailer.mail(data, function(err, info, message) {
      if (err) {
        return Boom.internal("Problem sending email.");
      }
      console.log("Message sent: %s", info.messageId);
      console.log('Preview URL: %s', message);
    })

    return {
      message: `Thank you for registering, we've dispatched an email to ${
        user.email
      } with further instructions`
    };
  }

  async verify(req, reply) {
    const { key, username } = req.body;
    // const { app } = this;
    const asyncGet = promisify(this.redis.get).bind(this.redis);
    const verificationKey = `${username}:verify`;
    const verified = await asyncGet(verificationKey);

    if (verified) {
      if (verified === key) {
        const user = await User.query()
          .patch({
            approved: true
          })
          .where({
            username
          })
          .returning("approved");

        if (user.approved) {
          return {
            message: "Thanks! Your account is now verified and active."
          };
        }
      } else {
        return Boom.badData("Invalid key. Please try again.");
      }
    } else {
      Boom.notFound("User doesn't exist or key expired. Please try again.");
    }
  }

  async login(req, reply) {
    const { email, password } = req.body.credentials;
    const asyncJwtSign = promisify(this.jwt.sign);
    const lockOutTime = Date.now() + 3600000 * 2;
    const resetLoginAttempts = User.query()
      .patch({
        loginAttempts: 5
      })
      .where({
        email,
        approved: true
      });

    if (email && password) {
      const user = await User.query()
        .eager("groups")
        .where({
          email,
          approved: true
        })
        .throwIfNotFound();

      if (!user) {
        return Boom.notFound("User credentials incorrect or doesn't exist.");
      }

      if (user && !user.loginAttempts) {
        if (lockOutTime > Date.now()) {
          return Boom.badData(
            "Too many failed login attempts; your account has been locked for 3 hours. To regain access immediately, reset your password."
          );
        }
      }

      if (await user.verifyPassword(password)) {
        if (user.loginAttempts > 0) {
          await User.query()
            .patch({
              loginAttempts: user.loginAttempts--
            })
            .where({
              email,
              approved: true
            });
        }
        return Boom.badData("User credentials incorrect or doesn't exist");
      } else {
        await resetLoginAttempts;
      }

      const userFields = ({ id, username, avatar, created_at } = user);

      const token = await asyncJwtSign(
        {
          iss: "bestinslot.org",
          exp: Math.floor(Date.now() / 1000 + 60 * 60),
          sub: userFields
        },
        process.env.SECRET
      );

      return {
        access_token: token
      };
    } else {
      Boom.notFound("User credentials incorrect or doesn't exist.");
    }
  }

  async me(req, reply) {
    if (!req.auth) {
      return Boom.unauthorized(
        "You do not have privilages to access this information."
      );
    }

    return {
      user: req.auth
    };
  }

  // async index(req, reply) {
  //   return { message: "HELLO WORLD!" };
  // }

  async test(req, reply) {
    return {
      message: "THis is a test"
    };
  }
}

module.exports = UserController;
