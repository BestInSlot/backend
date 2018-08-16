const users = require("./queries/users");
const posts = require("./queries/posts");

exports.seed = async function(knex, Promise) {
  
  try {
    await users(knex, Promise);
    await posts(knex, Promise);
  }
  catch (err) {
    console.log(err);
    return Promise.reject(err);
  }
  
};
