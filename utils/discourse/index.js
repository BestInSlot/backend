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
  this.admin = require("./admin").bind(this._http);
}

function discourseWrapper(fastify, opts, next) {
  if (!fastify.discourse) {
    fastify.decorate("discourse", () => {
      if (!("host" in opts)) {
        throw new Error("missing property host as an argument");
      }

      if (!("port" in opts)) {
        throw new Error("missing property port as an argument");
      }

      if (!("apiKey" in opts)) {
        throw new Error("missing property apiKey as an argument");
      }

      if (!("username" in opts)) {
        throw new Error("missing property username as an argument");
      }

      return new Discourse(opts.host, opts.port, opts.apiKey, opts.username);
    });
  }

  next();
}

module.exports = fp(discourseWrapper);
