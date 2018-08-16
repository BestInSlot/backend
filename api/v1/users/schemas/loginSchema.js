module.exports = {
  body: {
    type: "object",
    properties: {
      email: { type: "string" },
      password: { type: "string" },
      external_id: { type: "string" }
    },
    // required: ["email", "password"]
  },
  // response: {
  //   200: {
  //     type: "object",
  //     properties: {
  //       access_token: { type: "string" }
  //     }
  //   }
  // }
  // headers: {
  //   type: "object",
  //   properties: {
  //     authorization: { type: "string" }
  //   }
  // }
};
