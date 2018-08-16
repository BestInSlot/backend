module.exports = {
  body: {
    type: "object",
    properties: {
      code: { type: "string" }
    },
    required: ["code"]
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
