module.exports = {
  body: {
    type: "object",
    properties: {
      recaptcha: { type: "string" }      
    },
    credentials: {
      type: "object",
      properties: {
        email: { type: "string" },
        first_name: { type: "string" },
        last_name: { type: "string" },
        username: { type: "string" },
        password: { type: "string" },
      },
      required: ["email", "first_name", "last_name", "username", "password"]
    },
    required: ["credentials", "recaptcha"]
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
