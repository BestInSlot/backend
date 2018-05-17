module.exports = {
  body: {
    type: "object",
    properties: {
      key: { type: "string" },
      username: { type: "string" }
    },
    required: ["key"]
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
