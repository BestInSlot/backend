"use strict";
const path = require("path");
const verificationEmail = require(path.resolve(
  process.cwd(),
  "utils/emailTemplates/verificationEmail"
));
const pwdChangeEmail = require(path.resolve(
  process.cwd(),
  "utils/emailTemplates/pwdChangeEmail"
));
const pwdConfirmEmail = require(path.resolve(
  process.cwd(),
  "utils/emailTemplates/pwdConfirmEmail"
));
const {
  resetLoginAttempts,
  createDirectory,
  generateRandomString
} = require(path.resolve(process.cwd(), "utils/helpers"));

const { promisify } = require("util");
const { addMinutes, addHours, isAfter } = require("date-fns");
const fs = require("fs");
const rename = promisify(fs.rename);
const Disc = require(path.resolve(process.cwd(), "utils/discourse/sso"));
const Boom = require("boom");
const User = require("./UserModel");
const crypto = require("crypto");
const generatePassword = require("generate-password");
const pump = require("pump");
const sso = new Disc(process.env.DISCOURSE_SECRET);

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
    } catch (e) {
      console.log(e);
      throw Boom.internal(e);
    }

    nodemailer.sendTestMail(
      verificationEmail(
        "noreply@bestinslot.org",
        user.email,
        "Please verify your account",
        generatedKey,
        `${process.env.CLIENT_URL}:${process.env.CLIENT_PORT}`,
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
    const verificationKey = `${username.toLowerCase()}:verify`;
    const dirName = crypto.randomBytes(20).toString("hex");
    let verified, user, userFolderPath;

    try {
      user = await User.query()
        .where({ username, approved: false })
        .select("approved")
        .first()
        .throwIfNotFound();
    } catch (e) {
      throw Boom.notFound(e);
    }

    try {
      const data = await redis.get(verificationKey);
      verified = JSON.parse(data);
    } catch (e) {
      throw Boom.internal(e);
    }

    if (!verified) {
      return {
        expired: true,
        message: "Key has expired. Please try again."
      };
    }

    if (verified && verified.key !== key) {
      throw Boom.badData("Keys do not match.");
    }

    try {
      userFolderPath = await createDirectory(dirName);
    } catch (e) {
      console.log(e);
      throw Boom.internal(e);
    }

    try {
      user = await User.query()
        .patch({
          approved: true,
          avatar: userFolderPath
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
      throw Boom.internal(
        "We've encountered a problem trying to active your account. Please try again."
      );
    }

    redis.del(verificationKey);

    return {
      approved: true
    };
  }

  async login(req, reply) {
    let user, token;
    const { email, password } = req.body;
    const { jwt } = this;

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
    } catch (e) {
      throw Boom.notFound(e);
    }

    if (!user) {
      throw Boom.notFound("User credentials incorrect or doesn't exist.");
    }

    if (user && !user.login_attempts) {
      if (isAfter(addHours(user.last_login_attempt, 6), Date.now())) {
        throw Boom.forbidden(
          "Too many failed login attempts; your account has been locked for 3 hours. To regain access immediately, reset your password."
        );
      }
    }

    if (!(await user.verifyPassword(password))) {
      if (user.login_attempts > 0) {
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
          console.log(user.login_attempts);
        } catch (e) {
          console.log(e);
        }
      }
      throw Boom.badRequest("User credentials incorrect or doesn't exist");
    } else {
      resetLoginAttempts.call(User, email);
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
      });
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

  async logIntoForum(req, reply) {
    if (!req.auth) {
      throw Boom.forbidden("You don't have permission to access this.");
    }

    const { id, email } = req.auth.data;
    const { payload, sig } = req.body;

    if (!sso.validate(payload, sig)) {
      throw Boom.badData("Payload and/or sig is invalid.");
    }

    const nonce = sso.getNonce(payload);

    const response = sso.buildLoginString({
      external_id: id,
      nonce,
      email
    });

    return {
      sso: response.sso,
      sig: response.sig
    };
  }

  async logout(req, reply) {
    if (req.auth) {
      throw Boom.forbidden("You don't have permission to access this.");
    }

    let { discourse } = this,
      userId;

    try {
      userId = await discourse.users().findOneByExternalId(req.auth.user.id);
    } catch (e) {
      throw Boom.internal(e);
    }

    try {
      await discourse.users().logout(userId);
    } catch (e) {
      console.log(e);
      throw Boom.internal(e);
    }

    reply.code(204).send();
  }

  async resendVerification(req, reply) {
    const { redis, nodemailer } = this;
    let key = `${req.params.username.toLowerCase()}:verify`,
      verification;

    try {
      const data = await redis.get(key);
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
        grace: addMinutes(Date.now().toISOString(), 2)
      };

      redis.set(newKey, JSON.stringify(verification), "EX", 600);
    } else {
      verification.grace = addMinutes(new Date().toISOString(), 2);
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
    const { username } = req.auth.data || req.body;
    const { redis, nodemailer } = this;
    let user;

    if (req.method === "POST") {
      if (!req.auth) {
        throw Boom.unauthorized("Invalid permissions.");
      }

      const { currentPassword, newPassword } = req.body;

      try {
        user = await User.query()
          .select("password", "email")
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

      try {
        redis.set(
          `${user.username}:change_password_verify`,
          JSON.stringify(val),
          "EX",
          "600"
        );
      } catch (e) {
        throw Boom.internal(e);
      }

      nodemailer.sendTestMail(pwdChangeEmail("noreply@bestinslot", user.email, "Password Change Request"), function(err, info, message) {
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
    } else {
      //PUT
      let verification;
      try {
        verification = JSON.parse(await redis.get(rKey));
      } catch (e) {
        console.error(e);
        throw Boom.notFound("Password request is invalid.");
      }

      if (!verification) {
        throw Boom.notFound("Password request is invalid.");
      }

      try {
        user = await User.query()
          .patch({
            password: verification.new_password,
            login_attempts: 5
          })
          .where({ username })
          .returning("*")
          .first();
      } catch (e) {
        throw Boom.internal(e);
      }

      if (user && !user.login_attempts) {
        resetLoginAttempts.call(User, email);
      }

      nodemailer.sendTestMail(
        pwdConfirmEmail(
          "noreply@bestinslot.org",
          email,
          "Password Change Confirmed",
          verification.new_password
        ),
        function(err, info, message) {
          if (err) {
            console.error(err);
          }
          console.log(info);
          console.log(`Preview email URL: ${message}`);
        }
      );

      redis.del(rKey);
      reply.code(204).send();
    }
  }

  async resetPassword(req, reply) {
    const { email } = req.body;
    const { redis, nodemailer } = this;
    const rKey = `${username.toLowerCase()}:change_password_verify`;
    let resetRequest, user;

    try {
      user = await User.query()
        .select("username")
        .where({ email })
        .first()
        .throwIfNotFound();
    } catch (e) {
      throw Boom.notFound("User record not found.");
    }

    try {
      const data = await redis.get(rKey);
      resetRequest = JSON.parse(data);
    } catch (e) {
      throw Boom.internal(e);
    }

    if (!resetRequest) {
      const newPassword = generatePassword.generate({
        length: 10,
        numbers: true,
        uppercase: true
      });

      resetRequest = {
        reset: true,
        email,
        username: user.username,
        new_password: newPassword,
        key: crypto.randomBytes(20).toString("hex")
      };

      try {
        redis.set(rKey, JSON.stringify(resetRequest), "EX", 600);
      } catch (e) {
        throw Boom.internal(e);
      }
    }

    nodemailer.sendTestMail(
      pwdChangeEmail(
        "noreply@bestinslot.org",
        resetRequest.email,
        "Password Reset",
        resetRequest.key,
        `${process.env.CLIENT_URL}:${process.env.CLIENT_PORT}`,
        function(err, info, message) {
          if (err) {
            console.error(err);
          }
          console.log(info);
          console.log(`Preview email URL: ${message}`);
        }
      )
    );

    reply.code(204).send();
  }

  async changeEmail(req, reply) {
    if (!req.auth) {
      throw Boom.unauthorized("Invalid Permissions");
    }

    const { email, username } = req.auth.data;
    const { redis, nodemailer } = this;
    let user,
      redisKey = `${username.toLowerCase()}:verify_email_change`;

    if (req.method === "POST") {
      const { password, newEmail } = req.body;

      try {
        user = await User.query()
          .where({ email })
          .first();
      } catch (e) {
        throw Boom.internal(e);
      }

      if (user.email === newEmail) {
        throw Boom.badData("New email cannot match current email.");
      }

      try {
        redis.set(
          redisKey,
          JSON.stringify({
            username,
            key: crypto.randomBytes(20).toString("hex"),
            new_email: newEmail
          }),
          "EX",
          600
        );
      } catch (e) {
        console.log(e);
        throw Boom.internal(e);
      }

      nodemailer.sendTestMail(changeEmailVerification(), function(
        err,
        info,
        message
      ) {
        if (err) {
          console.log(err);
        }
      });

      reply.code(204).send();
    } else {
      // PUT
      let { key } = req.body;
      let emailVerification, data;

      try {
        data = await redis.get(redisKey);
      } catch (e) {
        throw Boom.badRequest("Invalid Key");
      }

      if (!data) {
        throw Boom.notFound(e);
      }

      try {
        emailVerification = JSON.parse(data);
      } catch (e) {
        console.log(e);
        throw Boom.internal("Encountered an internal server error.");
      }

      if (emailVerification.key !== key) {
        throw Boom.badData("Incorrect or invalid Key.");
      }

      try {
        const { new_email } = emailVerification;
        user = await User.query()
          .patch({ email: new_email })
          .where({ username })
          .first()
          .returning("email");
      } catch (e) {
        console.log(e);
      }

      if (user.email !== emailVerification.new_email) {
        throw Boom.internal(e);
      }

      reply.code(204).send();
    }
  }

  async uploadAvatar(req, reply) {
    if (!req.auth) {
      throw Boom.unauthorized("Invalid permissions.");
    }
    const { username } = req.auth.data;
    const regex = /(jpg|jpeg|png|svg)$/i;

    let filePath, user;

    req.multipart(
      async function(field, file, filename, encoding, mimetype) {
        const d = path.join(createDirectory(username, 755), filename);
        const dest = fs.createWriteStream(d);
        const random = generateRandomString(40);
        const ext = filename.split(/\./)[1];

        if (!regex.test(ext)) {
          throw Boom.badData("Invalid File Format");
        }

        file.on("limit", () => {
          throw Boom.badRequest("File Limit Reached: Files cannot exceed 72kb");
        });

        pump(file, dest);

        filePath = path.join(
          createDirectory(username, 755),
          random.concat(`.${ext}`)
        );

        try {
          await rename(d, filePath);
        } catch (e) {
          console.log(e);
          throw Boom.internal(e);
        }
      },
      async function(err) {
        if (err) {
          throw Boom.internal(err);
        }

        try {
          user = await User.query()
            .patch({ avatar: filePath })
            .where({ username });
        } catch (e) {
          throw Boom.internal(e);
        }

        return {
          messsage: "Saved changes.",
          avatar: user.avatar
        };
      }
    );
  }
}

module.exports = UserController;