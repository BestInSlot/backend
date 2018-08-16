const bcrypt = require("bcryptjs");

module.exports = async function(knex, Promise) {
  let hashed;
  try {
    let password = "hihi00hihi";
    let salt = await bcrypt.genSalt(10);
    hashed = await bcrypt.hash(password, salt);
  } catch (err) {
    throw new Error(err);
  }

  try {
    await knex.raw("TRUNCATE TABLE users RESTART IDENTITY CASCADE");
  } catch (err) {
    throw new Error(err);
  }

  const created_at = new Date().toISOString();

  try {
    await knex("users").insert({
      email: "mmccauleyjr@rogers.com",
      username: "Helix",
      slug: "helix",
      first_name: "Michael",
      last_name: "McCauley",
      password: hashed,
      approved: true,
      is_admin: true,
      created_at,
      updated_at: created_at
    })
  } catch (err) {
    throw new Error(err);
  }
};
