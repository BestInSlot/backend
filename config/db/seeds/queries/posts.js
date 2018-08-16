"use strict";

const faker = require("faker");
const slug = require("slug");

module.exports = async function(knex, Promise) {
  // Deletes ALL existing entries
  try {
    await knex.raw("TRUNCATE TABLE posts RESTART IDENTITY CASCADE");
  } catch (err) {
    throw new Error(err);
  }

  const id = 1;
  const numOfRecords = 200;
  const paragraphCount = [100, 200, 300];

  let data = [];

  for (let i = 0; i < numOfRecords; i++) {
    const title = faker.lorem.sentence(5, 10);
    const slugified = slug(title).toLowerCase();
    const date = new Date().toISOString()
    data.push({
      author_id: id,
      title,
      body: faker.lorem.paragraphs(
        Math.ceil((Math.random() * paragraphCount.length - 1) + 1),
        " "
      ),
      slug: slugified,
      created_at: date,
      updated_at: date
    });
  }

  try {
    await knex("posts").insert(data);
  } catch (err) {
    throw new Error(err);
  }
};
