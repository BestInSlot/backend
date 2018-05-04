"use strict";
const Boom = require("boom");
const User = require("./UserModel");
const crypto = require("crypto");
const verificationEmail = require("../../../utils/emailTemplates/verificationEmail");
const { addMinutes, addHours, isAfter } = require("date-fns");
const { promisify } = require("util");

class UserController {
  constructor() {}

  async register(req, reply) {
    const { credentials } = req.body;
    const { redis, nodemailer } = this;
    const generatedKey = crypto.randomBytes(20).toString("hex");
    const key = `${credentials.username.toLowerCase()}:verify`;
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
      const val = {
        username: user.username,
        email: user.email,
        key: generatedKey
      };
      verification = redis.set(key, JSON.stringify(val), "EX", 600);
      console.log(verification);
    } catch (e) {
      console.log(e);
      return Boom.internal(e.message);
    }

    // this.mail.messages().send(data, function(err, body) {
    //   if (err) {
    //     console.log(err);
    //     return Boom.internal(err);
    //   }
    //   console.log(body);
    // });

    nodemailer.sendTestMail(
      verificationEmail(
        "noreply@bestinslot.org",
        user.email,
        "Please verify your account",
        generatedKey,
        process.env.CLIENT_URL,
        user.username
      ),
      function(err, info, message) {
        if (err) {
          return Boom.internal("Problem sending email.");
        }
        console.log("Message sent: %s", info.messageId);
        console.log("Preview URL: %s", message);
      }
    );

    return {
      message: `Thank you for registering, we've dispatched an email to ${
        user.email
      } with further instructions`
    };
  }

  async verify(req, reply) {
    const { key, username } = req.body;
    const { redis } = this;
    const verificationKey = `${username.toLowerCase()}:verify`;
    let verified;

    try {
      verified = await redis.get(verificationKey);
    } catch (e) {
      return Boom.internal(e);
    }

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
          redis.del(verificationKey);
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
        .first()
        .throwIfNotFound();

      if (!user) {
        return Boom.notFound("User credentials incorrect or doesn't exist.");
      }

      if (user && !user.loginAttempts) {
        if (isAfter(addHours(user.last_login_attempt, 6), Date.now())) {
          return Boom.badData(
            "Too many failed login attempts; your account has been locked for 3 hours. To regain access immediately, reset your password."
          );
        }
      }

      if (await user.verifyPassword(password)) {
        if (user.loginAttempts > 0) {
          await User.query()
            .patch({
              loginAttempts: user.loginAttempts--,
              last_login_attempt: Date.now()
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

  async resendVerification(req, reply) {
    const { redis, nodemailer } = this;
    let key = `${req.params.username.toLowerCase()}:verify`,
      verification;

    try {
      verification = JSON.parse(await redis.get(key));
    } catch (e) {
      console.log(e);
      return Boom.internal(e);
    }

    if (verification && verification.grace) {
      if (isAfter(verification.grace, Date.now())) {
        return Boom.conflict(
          "You must wait 2 minutes before making another verification request."
        );
      }
    }

    if (!verification) {
      let user;
      try {
        user = await User.query()
          .where({ username: req.body.username, approved: false })
          .select("email")
          .first()
          .throwIfNotFound();
      } catch (e) {
        return Boom.notFound("No user record found.");
      }

      const generatedKey = crypto.randomBytes(20).toString("hex");
      const newKey = `${req.params.username.toLowerCase()}:verify`;

      verification = {
        username: req.body.username,
        email: user.email,
        key: generatedKey,
        grace: addMinutes(Date.now(), 2)
      };

      redis.set(newKey, JSON.stringify(verification), "EX", 600);
    } else {
      verification.grace = addMinutes(Date.now(), 2);
    }

    nodemailer.sendTestMail(
      verificationEmail(
        "noreply@bestinslot.org",
        verifcation.email,
        "Please verify your account",
        verification.key,
        process.env.CLIENT_URL,
        verifcation.username
      ),
      function(err, info, message) {
        if (err) {
          return Boom.internal("Problem sending email.");
        }
        console.log("Message sent: %s", info.messageId);
        console.log("Preview URL: %s", message);
      }
    );

    return {
      message: `We've dispatched a new verification email to ${
        verification.email
      }. Please check your inbox.`
    };
  }
}

module.exports = UserController;
