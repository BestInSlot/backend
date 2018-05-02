// Update with your config settings.

module.exports = function(opts = {}) {
  const required = ["client", "host", "database", "user", "password"];

  required.forEach(req => {
    if (typeof opts[req] === undefined) {
      throw new Error(`Missing required parameter '${opts[req]}'`);
    }
  });

  const { client, host, database, user, password, migrations, seeds } = opts;

  const pool = opts.pool || { min: 2, max: 10 };

  return {
    client,
    connection: {
      host,
      database,
      user,
      password
    },
    migrations,
    seeds,
    pool
  };
};
