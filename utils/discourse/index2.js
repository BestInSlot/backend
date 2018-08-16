/* WRAPS DISCOURSE FUNCTIONALITY */

"use strict";

const axios = require("axios");
const fp = require("fastify-plugin");


class Discourse {
  constructor(host, port, api, username) {
    this.host = host;
    this.port = port;
    this.api = api;
    this.username = username;
  }

  http() {
    return interceptors.request.use(config => {
      config.params = {
        api_key = this.api,
        api_username = this.username
      }
      return config;
    })
  }
}

class User extends Discourse {
  findOne(username) {
    return this.http.get(`/users/${username}.json`);
  }

  findOneByExternalId(id) {
    return this.http.get(`/users/by-external/${id}.json`);
  }

  find(flag, params = {}){
    if (typeof flag === undefined) {
      flag = "active";
    }
    return this.http.get(`/admin/users/list/${flag}.json`, { params })
  }

  create(params) {
    return this.http('/users', { ...params });
  }

  delete(id) {
    return this.http(`/admin/users/${id}.json`);
  }
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

      new Discourse(opts.host, opts.port, opts.apiKey, opts.username);

      return {
        users: function() {
          return new User();
        }
      }
    });
  }

  next();
}

module.exports = fp(discourseWrapper);
