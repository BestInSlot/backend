module.exports = {
  body: {
    type: "object",
    properties: {
      credentials: {
        type: "object",
        properties: {
          email: { type: "string" },
          password: { type: "string" }
        },
        required: ["email", "password"]
      }
    }
  },
  response: {
    200: {
      type: "object",
      properties: {
        access_token: { type: "string" }
      }
    }
  }
};
