module.exports = {
  headers: {
    type: "object",
    properties: {
      authorization: { type: "string" }
    },
    required: ["authorization"]
  }
};