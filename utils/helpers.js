"use strict";
const { promisify } = require("util");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const querystring = require("querystring");
const mkdir = promisify(fs.mkdir);
const rmdir = promisify(fs.rmdir);

function getHmac(secret) {
  secret = secret || process.env.DISCORD_STATE_SECRET;
  return crypto.createHmac("sha256", secret);
}

function getProperty(payload, property) {
  const q = querystring.parse(
    new Buffer(querystring.unescape(payload), "base64").toString()
  );

  if (Array.isArray(property)) {
    let result = {};
    property.forEach(prop => {
      if (prop in q) {
        result[prop] = q[prop];
      } else {
        return null;
      }
    });
    return result;
  } else {
    if (property in q) {
      return q[property];
    } else {
      return null;
    }
  }
}

function validate(payload, secret) {
  const parts = payload.split(":");
  if (parts.length > 1) {
    const hmac = getHmac(secret);
    hmac.update(querystring.unescape(parts[0]));
    if (hmac.digest("hex") === parts[1]) {
      return true;
    }
  }
  return false;
}

function generateRandomString(num) {
  let chars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let rnd = "";
  for (let i = 0; i <= num; i++) {
    rnd += chars.charAt(Math.floor(Math.random() * chars.length - 1));
  }
  return rnd;
}

async function recaptchaVerify(secret, sitekey) {
  let recaptcha_response;
  let url = `https://www.google.com/recaptcha/api/siteverify?secret=${secret}&response=${sitekey}`;
  try {
    recaptcha_response = await axios.post(url);
  } catch (e) {
    throw new Error(e);
  }
  return recaptcha_response.data;
}

async function resetLoginAttempts(email) {
  try {
    await this.query()
      .patch({
        login_attempts: 5
      })
      .where({
        email,
        approved: true
      });
  } catch (e) {
    console.log(e);
    throw Boom.internal(e);
  }
}

function buildPaginationQuery(req) {
  let query = this;

  if (req.query.current && req.query.limit) {
    const current = parseInt(req.query.current, 10),
      limit = parseInt(req.query.limit, 10);

    const start = (current - 1) * limit,
      end = current * limit - 1;

    query = query.range(start, end);
  } else {
    query = query.range(0, 19);
  }

  if (req.query.searchBy) {
    if (req.query.searchBy.game) {
      query = query.andWhere({ game: req.query.game }); 
    }
    if (req.query.searchBy.username) {
      query = query.andWhere({ username: req.query.username });
    }
  }

  if (req.query.filter)  {
    if (req.query.filter.approved) {
      query = query.andWhere({ approved: true });
    } else {
      query = query.andWhere({ approved: false });
    }
  }

  return query;
};

async function createDirectory(dir, mode) {
  let dirPath = "/var/www/html/public/users/avatars";
  let p = path.join(dirPath, dir);

  if (fs.existsSync(p)) {
    console.log(p);
    return p;
  }

  try {
    await mkdir(p, mode);
  } catch (e) {
    console.log(e);
  }

  return p;
}

async function removeDirectory(dir) {
  try {
    await rmdir(dir);
  } catch (e) {
    console.log(e);
  }
}

module.exports = {
  resetLoginAttempts,
  createDirectory,
  removeDirectory,
  generateRandomString,
  recaptchaVerify,
  getHmac,
  getProperty,
  validate,
  buildPaginationQuery
};
