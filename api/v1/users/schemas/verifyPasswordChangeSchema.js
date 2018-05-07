module.exports = {
  body: {
    type: "object",
    properties: {
      key: { type: "string" }
    },
    required: ["key"]
  },
  200: {
    type: "object",
    properties: {
      message: { type: "string" }
    }
  }
};
