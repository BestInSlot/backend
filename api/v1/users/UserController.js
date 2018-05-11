"use strict";
const Boom = require("boom");
const User = require("./UserModel");
const crypto = require("crypto");
const verificationEmail = require("../../../utils/emailTemplates/verificationEmail");
const pwdChangeEmail = require("../../../utils/emailTemplates/pwdChangeEmail");
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
        throw Boom.conflict("User already exists");
      }
      throw Boom.badRequest("Invalid credentials");
    }

    const val = {
      username: user.username,
      email: user.email,
      key: generatedKey
    };

    try {
      redis.set(key, JSON.stringify(val), "EX", 600);
    }
    catch (e) {
      console.log(e);
      throw Boom.internal(e);
    }
     
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
          throw Boom.internal("Problem sending email.");
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
    const date = new Date();
    const isoString = date.toISOString();
    const verificationKey = `${username.toLowerCase()}:verify`;
    let verified, user;

    try {
      user = await User.query()
        .where({ username, approved: false })
        .select('approved')
        .first()
        .throwIfNotFound();
    }
    catch(e) {
      throw Boom.notFound(e);
    }

    if (!user) {
      return {
        approved: true
      }
    }

    try {
      const data = await redis.get(verificationKey);
      verified = JSON.parse(data);
      console.log(verified)
    } catch (e) {
      console.log(e);
      throw Boom.internal(e);
    }

    if (!verified) {
      return {
        expired: true,
        message: 'Key has expired. Please try again.'
      };
    }

    if (verified && verified.key !== key) {
      throw Boom.badData("Keys do not match.")
    }

    try {
      user = await User.query()
        .patch({
          approved: true
        })
        .where({
          username
        })
        .first()
        .throwIfNotFound()
        .returning("approved");
    } catch (e) {
      throw Boom.internal(e);
    }

    if (!user.approved) {
      throw Boom.internal("We've encountered a problem trying to active your account. Please try again.")
    }

    return {
      approved: true
    }
  }

  async login(req, reply) {
    let user, token;
    const { email, password } = req.body;
    const { jwt } = this;
    const resetLoginAttempts = User.query()
      .patch({
        login_attempts: 5
      })
      .where({
        email,
        approved: true
      });

    if (!email || !password) {
     throw Boom.notFound("User credentials incorrect or doesn't exist.");
    }

    try {
      user = await User.query()
        .where({
          email,
          approved: true
        })
        .first()
        .throwIfNotFound();
    }
    catch(e) {
      throw Boom.notFound(e);
    }

    if (!user) {
      throw Boom.notFound("User credentials incorrect or doesn't exist.");
    }

    if (user && !user.login_attempts) {
      if (isAfter(addHours(user.last_login_attempt, 6), Date.now())) {
        throw Boom.badData(
          "Too many failed login attempts; your account has been locked for 3 hours. To regain access immediately, reset your password."
        );
      }
    }

    if (!(await user.verifyPassword(password))) {
      if (user.login_attempts > 0) {
        await User.query()
          .patch({
            login_attempts: user.login_attempts--,
            last_login_attempt: isoString
          })
          .where({
            email,
            approved: true
          });
      }
      throw Boom.badData("User credentials incorrect or doesn't exist");
    } else {
      await resetLoginAttempts;
    }
    
    console.log(user);

  

    try {
      token = jwt.sign({
          iss: "bestinslot.org",
          exp: Math.floor(Date.now() / 1000 + 60 * 60),
          data: {
            id: user.id,
            email: user.email,
            username: user.username,
            avatar: user.avatar,
            created_at: user.created_at,
            updated_at: user.updated_at
          }
        }
      );
    } catch (e) {
      throw Boom.internal(e);
    }

    return {
      access_token: token
    };
  }

  async me(req, reply) {
    if (!req.auth) {
      throw Boom.unauthorized(
        "You do not have privilages to access this information."
      );
    }

    return {
      user: req.auth.data
    };
  }

  async resendVerification(req, reply) {
    const { redis, nodemailer } = this;
    let key = `${req.params.username.toLowerCase()}:verify`,
      verification;

    try {
      const data = await redis.get(key)
      verification = JSON.parse(data);
    } catch (e) {
      console.log(e);
      throw Boom.internal(e);
    }

    if (verification && verification.grace) {
      if (isAfter(verification.grace, Date.now())) {
        throw Boom.conflict(
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
        throw Boom.notFound("No user record found.");
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
        `${process.env.CLIENT_URL}:${process.env.CLIENT_PORT}`,
        verifcation.username
      ),
      function(err, info, message) {
        if (err) {
          throw Boom.internal("Problem sending email.");
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

  async changePassword(req, reply) {
    if (!req.auth) {
      throw Boom.unauthorized("Invalid permissions.");
    }
    const { username } = req.auth.data;
    const { redis, nodemailer } = this;
    const { currentPassword, newPassword } = req.body;
    let user;

    try {
      user = await User.query()
        .select("password", "email", "username")
        .where({ username })
        .first()
        .throwIfNotFound();
    } catch (e) {
      throw Boom.notFound("User record not found.");
    }

    if (!(await user.verifyPassword(currentPassword))) {
      throw Boom.badData("Current password doesn't match.");
    } else if (await user.verifyPassword(newPassword)) {
      throw Boom.badData("New password cannot match current password.");
    }

    const val = {
      username,
      email,
      new_password: newPassword,
      key: crypto.randomBytes(20).toString("hex")
    };

    redis.set(
      `${user.username}:change_password_verify`,
      JSON.stringify(val),
      "EX",
      "600"
    );

    nodemailer.sendTestMail(pwdChangeEmail, function(err, info, message) {
      if (err) {
        throw Boom.internal(err);
      }
      console.log("Message sent: %s", info.messageId);
      console.log("Preview URL: %s", message);
    });

    return {
      message: `An email has been sent to ${
        user.email
      }. Please check your inbox.`
    };
  }

  async verifyPasswordChange(req, reply) {
    if (!req.auth) {
      throw Boom.unauthorized("Invalid permissions.");
    }

    const { username } = req.auth.data;
    const { key } = req.body;
    const { redis } = this;
    let verification, user;

    try {
      verification = JSON.parse(
        await redis.get(`${user.username}:change_password_verify`)
      );
    } catch (e) {
      throw Boom.notFound("Password request is invalid.");
    }

    try {
      user = await User.query()
        .patch({
          password: verification.password
        })
        .where({ username })
        .returning("*")
        .first();
    } catch (e) {
      throw Boom.internal(e);
    }

    reply.code(204);
  }
}

module.exports = UserController;
