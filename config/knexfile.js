// Update with your config settings.

module.exports = {
  development: {
    client: "postgresql",
    connection: {
      database: "bestinslot_dev",
      user: "h3lix",
      password: "hihi00hihi"
    },
    pool: {
      min: 2,
      max: 10
    }
  }
};
