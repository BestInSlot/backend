module.exports = {
  body: {
    type: "object",
    properties: {
      avatar_url: { type: "string" },
      payload: { type: "string" },
      signature: { type: "string" }
    },
    required: ["avatar_url", "signature", "payload"]
  },
  response: {
    200: {
      type: "object",
      properties: {
        sso: { type: "string" },
        sig: { type: "string" }
      }
    }
  }
};
