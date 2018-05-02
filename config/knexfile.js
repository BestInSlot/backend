// Update with your config settings.

module.exports = function(opts = {}) {
  const required = ["client", "database", "user", "password"];

  required.forEach(req => {
    if (typeof opts[req] === undefined) {
      throw new Error(`Missing required parameter '${opts[req]}'`);
    }
  });

  const { client, database, user, password } = opts;

  const pool = opts.pool || { min: 2, max: 10 };

  return {
    client,
    connection: {
      database,
      user,
      password
    },
    pool
  };
};
