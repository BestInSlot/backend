"use strict";

const { CLIENT_ID, CLIENT_SECRET } = process.env;
const Users = require("@models/users");
const axios = require("axios");
const Boom = require("boom");
const generatePassword = require("generate-password");
const { getHmac, getProperty, validate } = require("@utils/helpers");
const isEmpty = require("lodash/isEmpty");
const querystring = require("querystring");

const redirectURI = "http://localhost/api/discord/oauth2";

const discordOauth2Schema = {
  querystring: {
    type: "object",
    properties: {
      code: { type: "string" },
      state: { type: "string" }
    },
    required: ["code", "state"]
  }
};

const getStateSchema = {
  response: {
    200: {
      type: "object",
      properties: {
        state: { type: "string" }
      }
    }
  }
};

function createState(data) {
  const obj = {
    ...data,
    nonce: ""
  };
  const payload = new Buffer(querystring.stringify(obj), "utf8").toString(
    "base64"
  );

  const hmac = getHmac(process.env.DISCORD_STATE_SECRET);
  hmac.update(payload);

  return `${payload}:${hmac.digest("hex")}`;
}

class Discord {
  async getState(req, reply) {
    const { _id, type } = req.query;
    console.log(type);
    const creds = {
      redirect_uri: "http://localhost/discord/oauth2",
      _id,
      type
    };

    return reply.code(200).send({
      state: createState(creds)
    });
  }

  async discordOauth2(req, reply) {
    if (!req.query.code) {
      throw Boom.badRequest("No code parameter in query string");
    }

    if (!req.query.state) {
      throw Boom.badRequest("No state parameter in query string");
    }

    if (!validate(req.query.state)) {
      throw Boom.badRequest("400: Invalid State Parameter");
    }

    const { code, state } = req.query;
    const { _id, type } = getProperty(state, ["_id", "type"]);
    const { io } = this;

    let discord, response;
    let user = null;

    const data = {
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code: code,
      grant_type: "authorization_code",
      redirect_uri: redirectURI
    };

    const config = {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      }
    };

    const tokenURI = "https://discordapp.com/api/oauth2/token";

    try {
      discord = await axios.post(tokenURI, querystring.stringify(data), config);
    } catch (err) {
      if (err.response) {
        throw Boom.boomify(err, {
          statusCode: err.response.status,
          message: err.response.data.message || err.response.data
        });
      }
    }

    try {
      response = await axios.get("https://discordapp.com/api/users/@me", {
        headers: {
          Authorization: `${discord.data.token_type} ${
            discord.data.access_token
          }`
        }
      });
    } catch (err) {
      if (err.response) {
        throw Boom.boomify(err, {
          statusCode: err.response.status,
          message: err.response.data.message || err.response.data
        });
      }
    }

    if (!response.data.verified) {
      if (io.sockets.connected[_id]) {
        io.sockets.connected[_id].emit(
          "unverifed_email",
          "Your discord email is unverified. Please verify it and try again."
        );
      }
      throw Boom.badRequest(
        "Unverified Email Address. Please verify your account with discord."
      );
    }

    if (type === "register") {
      const username = `${response.data.username}_${
        response.data.descriminator
      }`;

      const insert = {
        username,
        slug: username.toLowerCase(),
        external_id: response.data.id,
        email: response.data.email,
        first_name: response.data.username,
        last_name: response.data.username,
        password: generatePassword.generate({ length: 20 }),
        approved: true
      };

      try {
        user = await Users.query()
          .insert(insert)
          .returning("*");
      } catch (err) {
        console.log(err);
        if (err.code && err.code === "23505") {
          if (io.sockets.connected[_id]) {
            io.sockets.connected[_id].emit(
              "user_exists",
              "A user with those credentials already exists. Please link your discord account and try again."
            );
          }
        }
      }

      return reply.code(204).send();
    }

    if (type === "login") {
      reply.io.to(_id).emit("login", response.data.id);
    }

    reply.code(200).send();
  }
}

module.exports = {
  schemas: {
    discordOauth2Schema,
    getStateSchema
  },
  Discord
};
