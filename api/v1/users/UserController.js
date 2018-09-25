"use strict";
//MODELS
const User = require("./UserModel");
const App = require("@models/app");
//UTIL
const { promisify } = require("util");
const { addHours, isAfter } = require("date-fns");
const {
  resetLoginAttempts,
  createDirectory,
  recaptchaVerify,
} = require("@utils/helpers");
const Disc = require("@utils/discourse/sso");
const crypto = require("crypto");
const generatePassword = require("generate-password");
const isEmpty = require("lodash/isEmpty");
const path = require("path");
const verificationEmail = require("@email/verificationEmail");
const pwdConfirmEmail = require("@email/pwdConfirmEmail");
const Boom = require("boom");

class UserController {
 
  async check(req, reply) {
    let key = Object.keys(req.body)[0];
    let value = req.body[key].toLowerCase();

    if (req.auth) {
      let { email, username } = req.auth.data;
      if (
        (key === "email" && email === value) ||
        (key === "username" && username === value)
      ) {
        return {
          valid: true,
          message: "Email is valid."
        };
      }
    }

    try {
      await User.query()
        .where(key === "username" ? "slug" : key, value)
        .throwIfNotFound();
      reply.code(200).send({
        valid: false,
        message: `${Object.keys(req.body)[0]} is already taken.`
      });
    } catch (err) {
      reply.code(200).send({
        valid: true,
        message: `${Object.keys(req.body)[0]} is available.`
      });
    }
  }

  async register(req, reply) {
    const { credentials, recaptcha } = req.body;
    const { nodemailer } = this;
    const slug = require("slug");

    let user, recaptcha_confirm;

    try {
      recaptcha_confirm = await recaptchaVerify(
        process.env.RECAPTCHA,
        recaptcha.trim()
      );
    } catch (err) {
      throw Boom.internal("500[E001]: Encountered an problem.");
    }

    if (!recaptcha_confirm.success) {
      throw Boom.badRequest("400[E001]: Site key was malformed.");
    }

    const insert = {
      ...credentials,
      slug: slug(credentials.username.toLowerCase()),
      activation_code: crypto.randomBytes(40).toString("hex")
    };

    try {
      user = await User.query()
        .insert(insert)
        .returning("*");
    } catch (err) {
      console.log(err);
      if (err && err.code === "23505") {
        throw Boom.conflict("409[E001]: User already exists");
      }
      throw Boom.badRequest("400[E002]: Invalid credentials");
    }

    nodemailer.messenger.sendMail(
      verificationEmail(
        "noreply@bestinslot.org",
        user.email,
        "Please verify your account",
        insert.activation_code,
        `${process.env.CLIENT_URL}:${process.env.CLIENT_PORT}`,
        user.username
      ),
      function(err, info) {
        if (err) {
          console.log(err);
        }
        console.log("Message sent: %s", info.messageId);
        console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
        nodemailer.messenger.close();
      }
    );

    return {
      message: `Thank you for registering, we've dispatched an email to ${
        user.email
      } with further instructions`
    };
  }

  async verify(req, reply) {
    const { code } = req.body;
    let user;

    try {
      user = await User.query()
        .patch({ activation_code: null, approved: true })
        .where({ activation_code: code, approved: false })
        .first()
        .throwIfNotFound()
        .returning("approved");
    } catch (err) {
      throw Boom.notFound(
        "404[E001]: User either doesn't exist or code is invalid."
      );
    }

    if (!user.approved) {
      throw Boom.internal(
        "500[E002]: We've encountered a problem trying to active your account. Please try again."
      );
    }

    reply.code(204).send();
  }

  async login(req, reply) {
    let user;
    const { loginMethod } = req.body;
    const { jwt } = this;
    const maxLoginAttempts = 5;

    if (loginMethod === "local") {
      const { email, password } = req.body;
      if (!email || !password) {
        throw Boom.badData(
          "422[E001]: User credentials incorrect or doesn't exist."
        );
      }

      try {
        user = await User.query()
          .where({
            email,
            approved: true
          })
          .whereNull("banned_at")
          .first()
          .throwIfNotFound();
      } catch (err) {
        throw Boom.notFound("404[E003]: User not found.");
      }

      if (!user) {
        throw Boom.notFound(
          "404[E004]: User credentials incorrect or doesn't exist."
        );
      }

      if (user && !user.login_attempts) {
        if (isAfter(addHours(user.last_login_attempt, 1), Date.now())) {
          throw Boom.forbidden(
            "Too many failed login attempts; your account has been locked for 1 hour(s). To regain access immediately, reset your password."
          );
        } else {
          resetLoinAttempts.call(User, email);
        }
      }

      if (!(await user.verifyPassword(password))) {
        if (user.login_attempts > maxLoginAttempts) {
          try {
            await User.query()
              .patch({
                login_attempts: user.login_attempts - 1,
                last_login_attempt: new Date().toISOString()
              })
              .where({
                email,
                approved: true
              });
          } catch (err) {
            console.log(err);
          }
        }
        throw Boom.badRequest("User credentials incorrect or doesn't exist");
      } else {
        if (user.login_attempts < maxLoginAttempts) {
          resetLoginAttempts.call(User, email);
        }
      }
    } else if (loginMethod === "discord") {
      if (!req.body.external_id) {
        throw Boom.badRequest("400[E004]: Malformed Request.");
      }
      const { external_id } = req.body;
      try {
        user = await User.query()
          .where({ external_id })
          .throwIfNotFound()
          .first();
      } catch (err) {
        throw Boom.notFound("Your discord account doesn't seem to be linked.");
      }
    }

    const token = jwt.sign({
      iss: "bestinslot.org",
      exp: Math.floor(Date.now() / 1000 + 60 * 180),
      data: {
        id: user.id,
        email: user.email,
        username: user.username
      }
    });

    reply
      .code(200)
      .header(
        "Access-Control-Allow-Headers",
        "Content-Type, Access-Control-Allow-Headers, Authorization"
      )
      .header("Access-Control-Expose-Headers", "Authorization")
      .header("Authorization", "Bearer " + token)
      .send();
  }

  async userDetails(req, reply) {
    if (!req.auth) {
      throw Boom.unauthorized(
        "You do not have privilages to access this information."
      );
    }

    let user;

    try {
      user = await User.query()
        .select(
          "id",
          "email",
          "first_name",
          "last_name",
          "username",
          "avatar",
          "created_at",
          "slug",
          "is_admin",
          "is_curator"
        )
        .where("id", req.auth.data.id)
        .first();
    } catch (err) {
      throw Boom.internal(err);
    }

    return {
      user
    };
  }

  async logIntoForum(req, reply) {
    if (!req.auth) {
      throw Boom.forbidden("You don't have permission to access this.");
    }

    let user;

    const { id, username, email } = req.auth.data;
    const sso = new Disc(process.env.DISCOURSE_SECRET);
    const { payload, signature } = req.body;

    if (!sso.validate(payload, signature)) {
      throw Boom.badData("Payload and/or sig is invalid.");
    }

    const nonce = sso.getNonce(payload);

    const response = sso.buildLoginString({
      external_id: req.auth.data.id,
      nonce,
      email,
      username,
      avatar_force_update: true
      // avatar_url: "http://localhost" + avatar
    });

    return {
      sso: response.sso,
      sig: response.sig
    };
  }

  async logout(req, reply) {
    if (!req.auth) {
      throw Boom.forbidden("You don't have permission to access this.");
    }

    let { discourse } = this,
      { id } = req.auth.data,
      response;

    try {
      response = await discourse()
        .users()
        .findOneByExternalId(id);
    } catch (err) {
      throw Boom.boomify(err, { statusCode: err.response.status });
    }

    if (response.data.user.id) {
      try {
        await discourse()
          .users()
          .logout(response.data.user.id);
      } catch (err) {
        throw Boom.boomify(err, { statusCode: err.response.status });
      }
    } else {
      throw Boom.internal("Couldn't log out of forum.");
    }

    reply.code(204).send();
  }

  async resendVerification(req, reply) {
    const { nodemailer } = this;
    const { email } = req.body;

    let user;

    try {
      user = await User.query()
        .where({ email, approved: false })
        .whereNotNull("activation_code")
        .first()
        .throwIfNotFound();
    } catch (e) {
      throw Boom.notFound(e);
    }

    const { activation_code } = user;

    nodemailer.messenger.sendMail(
      verificationEmail(
        "noreply@bestinslot.org",
        user.email,
        "Please verify your account",
        activation_code,
        `${process.env.CLIENT_URL}:${process.env.CLIENT_PORT}`
      ),
      function(err, info) {
        if (err) {
          console.log(err);
        }
        console.log("Message sent: %s", info.messageId);
        console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
        nodemailer.messenger.close();
      }
    );

    return {
      message: `We've dispatched a new verification email to ${
        verification.email
      }. Please check your inbox.`
    };
  }

  async updatePassword(req, reply) {
    if (!req.auth) {
      throw Boom.unauthorized("Invalid permissions.");
    }

    const { id } = req.auth.data;
    const { redis, nodemailer } = this;
    const { new_password, recaptcha } = req.body;
    const redis_key = `userId:${id}:update_password`;

    let user, recaptcha_response;

    try {
      recaptcha_response = await recaptchaVerify(
        process.env.RECAPTCHA,
        recaptcha.trim()
      );
    } catch (err) {
      throw Boom.internal(err);
    }

    if (!recaptcha_response.success) {
      throw Boom.badRequest("Captcha response was malformed.");
    }

    try {
      user = await User.query()
        .select("password", "email", "slug")
        .where({ id })
        .first()
        .throwIfNotFound();
    } catch (err) {
      throw Boom.notFound("User record not found.");
    }

    if (await user.verifyPassword(new_password)) {
      throw Boom.badData(
        "422: New password cannot be identitical to current password"
      );
    }

    const data = {
      new_password,
      code: crypto.randomBytes(20).toString("hex")
    };

    try {
      redis.set(redis_key, JSON.stringify(data), "EX", "600");
    } catch (err) {
      throw Boom.internal(err);
    }

    const address = `http://${process.env.CLIENT_URL}:${
      process.env.CLIENT_PORT
    }security/verify/`;

    const credentials = require("@email/updatePassword").authentication(
      "noreply@bestinslot.org",
      user.email,
      "Password Change Request",
      data.code,
      address
    );

    nodemailer.messenger.sendMail(credentials, function(err, info) {
      if (err) {
        console.log(err);
      }
      console.log("Message sent: %s", info.messageId);
      console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
      nodemailer.messenger.close();
    });

    return {
      message: `An email has been sent to ${
        user.email
      }. Please check your inbox.`
    };
  }

  async verifyPasswordUpdate(req, reply) {
    let verification, user;
    const { redis, nodemailer } = this;
    const { code } = req.body;
    const id = req.auth ? req.auth.data.id : req.body.id;
    const redis_key = `userId:${id}:update_password`;

    try {
      verification = JSON.parse(await redis.get(redis_key));
    } catch (e) {
      throw Boom.internal(e);
    }

    if (!verification || isEmpty(verification)) {
      throw Boom.badRequest("Request expired.");
    }

    if (verification.code !== code) {
      throw Boom.badData("Invalid key. Please Try again.");
    }

    try {
      user = await User.query()
        .patch({
          password: verification.new_password,
          login_attempts: 5
        })
        .whereNull("banned_at")
        .where({ slug: username })
        .returning("*")
        .first();
    } catch (e) {
      throw Boom.internal(e);
    }

    const confirmation = require("@email/updatePassword").confirmation(
      "noreply@bestinslot.org",
      user.email,
      "Password Change Confirmed",
      verification.new_password
    );

    nodemailer.messenger.sendMail(confirmation, function(err, info) {
      if (err) {
        console.log(err);
      }
      console.log("Message sent: %s", info.messageId);
      console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
      nodemailer.messenger.close();
    });

    redis.del(redis_key);
    reply.code(204).send();
  }

  async resetPassword(req, reply) {
    const { email, recaptcha } = req.body;
    const { redis, nodemailer } = this;

    let resetRequest, user, data, recaptcha_response;

    try {
      recaptcha_response = await recaptchaVerify(recaptcha);
    } catch (e) {
      throw Boom.internal(e);
    }

    if (!recaptcha_response.success) {
      throw Boom.badRequest("Site key was malformed.");
    }

    try {
      user = await User.query()
        .select("slug")
        .where({ email })
        .whereNull("banned_at")
        .first()
        .throwIfNotFound();
    } catch (e) {
      throw Boom.notFound("User record not found.");
    }

    const redis_key = `${slug}:change_password_verify`;

    try {
      data = await redis.get(redis_key);
    } catch (err) {
      throw Boom.internal(err);
    }

    //We check if there is already an key/value pair saved.
    //If there is we parse it and send the email. If not we save a key/pair and send the email.
    if (data) {
      resetRequest = JSON.parse(data);
    } else {
      const newPassword = generatePassword.generate({
        length: 10,
        numbers: true,
        uppercase: true
      });

      resetRequest = {
        reset: true,
        email,
        slug: user.slug,
        new_password: newPassword,
        code: crypto.randomBytes(40).toString("hex")
      };

      try {
        redis.set(redis_key, JSON.stringify(resetRequest), "EX", 600);
      } catch (err) {
        throw Boom.internal(err);
      }
    }

    const emailData = {
      reset: true,
      slug: user.slug,
      code: resetRequest.code
    };

    nodemailer.messenger.sendMail(
      pwdChangeEmail(
        "noreply@bestinslot.org",
        resetRequest.email,
        "Password Reset",
        emailData,
        `${process.env.CLIENT_URL}:${process.env.CLIENT_PORT}`
      ),
      function(err, info) {
        if (err) {
          console.log(err);
        }
        console.log("Message sent: %s", info.messageId);
        console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
        nodemailer.messenger.close();
      }
    );

    return {
      message: `Sent an email to ${email}`,
      resetRequest
    };
  }

  async updateUserDetails(req, reply) {
    if (!req.auth) {
      throw Boom.unauthorized("401: Unauthorized Access");
    }

    let userDetails, recaptchaResponse;

    const { id, email } = req.auth.data;
    const { recaptcha, name, require_verification } = req.body;
    const { redis, nodemailer } = this;

    try {
      recaptchaResponse = await recaptchaVerify(
        process.env.RECAPTCHA,
        recaptcha
      );
    } catch (err) {
      throw Boom.internal(err);
    }

    if (!recaptchaResponse.success) {
      throw Boom.badRequest("Site key was malformed.");
    }

    if (name && !isEmpty(name)) {
      try {
        userDetails = await User.query()
          .patch({ ...name })
          .first()
          .where({ id });
      } catch (err) {
        throw Boom.internal(`500: ${err}`);
      }
    }

    if (require_verification && !isEmpty(require_verification)) {
      const data = {
        code: crypto.randomBytes(40).toString("hex"),
        insert: {
          ...require_verification
        }
      };

      const updateDetails = require("@email/updateUserDetails")(
        "noreply@bestinslot.org",
        email,
        "Personal Detail Changes",
        data.code,
        req.body.require_verification
      );

      const redis_key = `userId:${id}:user_details`;

      try {
        redis.set(redis_key, JSON.stringify(data), "EX", 600);
      } catch (err) {
        throw Boom.internal(`500: ${err}`);
      }

      nodemailer.messenger.sendMail(updateDetails, function(err, info) {
        if (err) {
          console.log(err);
        }
        console.log("Message sent: %s", info.messageId);
        console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
        nodemailer.messenger.close();
      });
    }

    reply.code(204).send();
  }

  async verifyUpdateUserDetails(req, reply) {
    if (!req.auth) {
      throw Boom.unauthorized("401: Unauthorized Access");
    }

    let userDetails = null,
      user,
      token;

    const redis_key = `userId:${req.auth.data.id}:user_details`;
    const { redis, discourse, jwt } = this;
    const { code } = req.body;

    try {
      userDetails = JSON.parse(await redis.get(redis_key));
    } catch (err) {
      throw Boom.internal("500: " + err);
    }

    if (isEmpty(userDetails)) {
      throw Boom.notFound("key expired.");
    }

    if (userDetails && userDetails.code !== code) {
      throw Boom.badData("422: Invalid Code");
    }

    try {
      user = await User.query()
        .patch(userDetails.insert)
        .where("id", req.auth.data.id)
        .first()
        .returning("*")
        .throwIfNotFound();
    } catch (err) {
      throw Boom.notFound("404: " + err);
    }

    try {
      token = jwt.sign({
        iss: "bestinslot.org",
        exp: Math.floor(Date.now() / 1000 + 60 * 60),
        data: {
          id: user.id,
          email: user.email,
          username: user.username
        }
      });
    } catch (err) {
      throw Boom.internal(err);
    }

    redis.del(redis_key);

    return {
      token
    };
  }

  updateAvatar(req, reply) {
    if (!req.auth) {
      throw Boom.unauthorized("Invalid permissions.");
    }

    const username = req.auth.data.username.toLowerCase();

    const fs = require("fs");
    const rename = promisify(fs.rename);
    const pump = require("pump");

    const regex = /(jpe?g|png|svg)$/i;

    let renamePath, originalPath;

    createDirectory(username);

    req.multipart(
      async function(field, file, filename, encoding, mimetype) {
        const ext = filename.split(/\./)[1];

        if (!regex.test(ext)) {
          throw Boom.badData("Invalid File Format");
        }

        file.on("limit", () => {
          throw Boom.badRequest("File Limit Reached: Files cannot exceed 72kb");
        });

        originalPath = path.join(
          `/var/www/html/public/users/avatars/${username}`,
          filename
        );

        renamePath = path.join(
          `/var/www/html/public/users/avatars/${username}`,
          username.concat(`.${ext}`)
        );

        pump(file, fs.createWriteStream(originalPath));
      },
      async function(err) {
        if (err) {
          throw Boom.internal(err);
        }

        let user;

        try {
          await rename(originalPath, renamePath);
        } catch (err) {
          throw Boom.internal(err);
        }

        const avatar = renamePath.substr(
          renamePath.indexOf("/public"),
          renamePath.length
        );

        try {
          user = await User.query()
            .patch({ avatar })
            .where({ username: user.username })
            .first()
            .returning("avatar");
        } catch (err) {
          throw Boom.internal(err);
        }

        if (!user) {
          throw Boom.badRequest("Couldn't save avatar.");
        }

        return reply.code(200).send({
          user: {
            messsage: "Saved changes.",
            avatar: user.avatar
          }
        });
      }
    );

    reply.code(204).send();
  }
}

module.exports = UserController;
