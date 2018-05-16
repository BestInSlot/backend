"use strict";
const { promisify } = require("util");
const fs = require("fs");
const path = require("path");
const mkdir = promisify(fs.mkdir);
const rmdir = promisify(fs.rmdir);

function generateRandomString(num) {
  let chars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let rnd = "";
  for (let i = 0; i <= num; i++) {
    rnd += chars.charAt(Math.floor(Math.random() * chars.length - 1));
  }
  return rnd;
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

async function createDirectory(dir, mode) {
  let dirPath = "/var/www/html/public/users/avatars";
  let p = path.join(dirPath, dir);

  if (fs.existsSync(p)) {
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
  generateRandomString
};
