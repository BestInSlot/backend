module.exports = {
  body: {
    type: "object",
    properties: {
      code: { type: "string" },
      username: { type: "string" }
    },
    required: ["code", "username"]
  },
  response: {
    200: {
      type: "object",
      properties: {
        message: { type: "string" }
      }
    }
  }
};
