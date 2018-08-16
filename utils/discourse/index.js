/* WRAPS DISCOURSE FUNCTIONALITY */

"use strict";

const axios = require("axios");
const fp = require("fastify-plugin");

function Discourse(host, port, apiKey, username) {
  this.apiKey = apiKey;
  this.username = username;

  this._http = axios.create({
    baseURL: `http://${host}:${port}`
  });

  this._http.defaults.timeout = 5000;

  this._http.interceptors.request.use(
    config => {
      Object.assign(config, {
        params: {
          api_key: this.apiKey,
          api_username: this.username
        }
      });

      return config;
    },
    function(err) {
      console.log(err);
    }
  );

  this.users = require("./users").bind(this._http);
  this.posts = require("./posts").bind(this._http);
  this.admin = require("./admin").bind(this._http);

  console.log(this.users);
}

function discourseWrapper(fastify, opts, next) {
  if (!fastify.discourse) {
    fastify.decorate("discourse", () => {
      
      if (typeof opts.host === undefined) {
         next(new Error("missing property host as an argument"));
      }

      if (typeof opts.port === undefined) {
        next(new Error("missing property port as an argument"));
      }

      if (typeof opts.apiKey === undefined) {
        next(new Error("missing property apiKey as an argument"));
      }

      if (typeof opts.username === undefined) {
        next(new Error("missing property username as an argument"));
      }

      return new Discourse(opts.host, opts.port, opts.apiKey, opts.username);
    });
  }

  next();
}

module.exports = fp(discourseWrapper);
