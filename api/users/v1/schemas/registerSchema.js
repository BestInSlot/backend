module.exports = {
  body: {
    type: "object",
    credentials: {
      type: "object",
      properties: {
        email: { type: "string" },
        fullname: { type: "string" },
        username: { type: "string" },
        password: { type: "string" }
      },
      required: ["email", "fullname", "username", "password"]
    },
    required: ["credentials"]
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
