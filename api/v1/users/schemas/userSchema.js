module.exports = {
  response: {
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
            updated_at: { type: "string" },
            first_name: { type: "string" },
            last_name: { type: "string" },
            email: { type: "string" },
            is_admin: { type: "boolean" },
            is_curator: { type: "boolean" }
          }
        }
      }
    }
  }
};