module.exports = {
  body: {
    type: "object",
    properties: {
      username: { type: "string" },
      key: { type: "string" }
    },
    required: ["username", "key"]
  },
  200: {
    type: "object",
    properties: {
      message: { type: "string" }
    }
  }
};
