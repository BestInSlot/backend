module.exports = {
  200: {
    type: "object",
    properties: {
      user: {
        type: "object",
        properties: {
          id: { type: "integer" },
          username: { type: "string" },
          avatar: { type: "string" },
          created_at: { type: "string" },
          updated_at: { type: "string" }
        }
      }
    }
  }
};