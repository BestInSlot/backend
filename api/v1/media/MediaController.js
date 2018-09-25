"use strict";
const Boom = require("boom");
const Streams = require("@models/streams");
const isEmpty = require("lodash/isEmpty");
const isObject = require("lodash/isObject");

const qs = require("qs");
const { getHmac, getProperty } = require("@utils/helpers");
const { after, addDays } = require("date-fns");

const http = require("axios").create({
  baseURL: "https://api.twitch.tv/helix",
  headers: {
    "Client-ID": process.env.TW_CLIENT_ID
  }
});

class MediaController {
  async addStream(req, reply) {
    // if (!req.auth.data.is_curator || !req.auth.data.is_admin) {
    //   throw Boom.unauthorized("401: Unauthorized.");
    // }

    let media, data;

    const { streamer } = req.body;
    const { redis } = this;

    if (isEmpty(streamer.data)) {
      throw Boom.badRequest("400: Payload is empty.");
    } else {
      data = streamer.data;
    }

    try {
      media = await Streams.query()
        .insert({
          login_name: data.login,
          streamer_id: data.id,
          display_name: data.display_name,
          profile_image_url: data.profile_image_url,
          offline_image_url: data.offline_image_url,
          submitter_id: req.auth.data.id
        })
        .returning(["id", "streamer_id", "login_name"]);
    } catch (err) {
      console.log(err);
      if (err.code && err.code === "23505") {
        throw Boom.conflict("409: Stream record already exists.");
      }
      throw Boom.internal("500: " + err.message);
    }

    try {
      const subscribe = {
        "hub.callback": `http://99.254.252.201:1337/api/media/streams/webhook/update/${
          data.id
        }`,
        "hub.mode": "subscribe",
        "hub.topic": `https://api.twitch.tv/helix/streams?user_id=${data.id}`,
        "hub.lease_seconds": 846000,
        "hub.secret": process.env.TW_SUBSCRIBE_SECRET
      };
      const hub = await http.post(
        "https://api.twitch.tv/helix/webhooks/hub",
        subscribe
      );
    } catch (err) {
      if (err.response) {
        throw Boom.badRequest("400: Bad Request.");
      }
      throw Boom.internal("500: " + err.message);
    }

    redis.del("streams:cache");

    return {
      stream_owner: data.display_name
    };
  }

  async fetchSingleStream(req, reply) {
    let stream;
    try {
      stream = await Streams.query()
        .where({ login_name: req.params.stream })
        .first()
        .throwIfNotFound();
    } catch (err) {
      throw Boom.notFound();
    }

    return {
      stream
    };
  }

  async fetchStreams(req, reply) {
    let streams, ids, cache;

    const { redis } = this;

    try {
      cache = await redis.get("streams:cache");
    } catch (err) {
      console.log(err);
      throw Boom.internal("500: " + err.message);
    }

    if (cache) {
      streams = JSON.parse(cache);
      console.log("cached streams");
    } else {
      try {
        streams = await Streams.query();
      } catch (err) {
        throw Boom.internal("500: " + err.message);
      }

      if (streams.length) {
        const params = {
          user_id: streams.map(({ streamer_id }) => streamer_id)
        };

        try {
          const { data } = await http.get("/streams", {
            params,
            transformResponse: [
              function(response) {
                const { data } = JSON.parse(response);
                return Array.isArray(data) && data.length > 1 ? data : data[0];
              }
            ],
            paramsSerializer: function(params) {
              return qs.stringify(params, { arrayFormat: "repeat" });
            }
          });

          if (Array.isArray(data) && data.length > 1) {
            streams = streams.map(stream => {
              const _record = data.find(
                (el) => el.user_id === stream.streamer_id
              );

              delete stream.created_at;
              delete stream.updated_at;

              if (_record) {
                const thumbnail = _record.thumbnail_url;
                const live = true;
                Object.assign(stream, {
                  sid: _record.id,
                  live,
                  title: _record.title,
                  thumbnail: thumbnail
                    .substr(0, thumbnail.indexOf("{"))
                    .concat("120x90.png")
                });
              }
              return stream;
            });
          } else if (isObject(data) && !isEmpty(data)) {
            const stream = streams.find(
              ({ streamer_id }) => streamer_id === data.user_id
            );

            if (stream) {
              delete stream.created_at;
              delete stream.updated_at;
              const thumbnail = data.thumbnail_url;
              const live = true;
              Object.assign(stream, {
                sid: data.id,
                live,
                title: data.title,
                thumbnail: thumbnail
                  .substr(0, thumbnail.indexOf("{"))
                  .concat("120x90.png")
              });
            }
          }
        } catch (err) {
          console.log(err);
          throw Boom.internal("500: Uh oh. Encountered a problem.");
        }

        redis.set("streams:cache", JSON.stringify(streams), "EX", 60);
      }

      console.log("non cached");
    }
    
    return {
      streams
    };
  }

  async verifySubscription(req, reply) {
    if (!req.query["hub.challenge"] && !req.query["hub.topic"]) {
      throw Boom.unsupportedMediaType();
    }
    const { "hub.challenge": challenge, "hub.topic": topic } = req.query;
    const streamerId = topic.substr(topic.indexOf("=") + 1, topic.length - 1);

    try {
      await Streams.query()
        .where({ streamer_id: streamerId })
        .first()
        .throwIfNotFound();
    } catch (err) {
      throw Boom.unsupportedMediaType();
    }

    reply.code(200).send(challenge);
  }

  updateStreamInfo(req, reply) {
    console.log(req.headers);
    console.log(req.body);
    console.log(req.query);

    let data, stream;

    const { redis } = this;

    if (req.headers["x-hub-signature"] || req.headers["X-Hub-Signature"]) {
      const sig = req.headers["x-hub-signature"].split("=");
      const payload = new Buffer(req.body.data, "base64");
      const hex = getHmac(sig[0], process.env.TW_SUBSCRIBE_SECRET)
        .update(payload)
        .digest("hex");

      if (sig[1] === hex) {
        stream = req.body.data.length ? ({ title } = req.body.data[0]) : {};
        stream.user_id = req.params.id;
        console.log("sig is good.");
      } else {
        console.log(sig[1]);
        console.log(hex);
        console.log("sig is bad");
        return reply
          .code(200)
          .send({ success: false, message: "signature doesn't match" });
      }
    } else {
      console.log("didnt have sig in header");
      return reply
        .code(200)
        .send({ success: false, message: "no signature in header" });
    }

    redis.del("streams:cache");

    reply.io.to("streams").emit("update", stream);

    reply.code(200).send({ status: data.length ? "up" : "down" });
  }
}

module.exports = MediaController;
