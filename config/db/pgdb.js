"use strict";
const pg = require("pg");

class Database {
  constructor({ dbUser, dbPass, dbName, dbHost, dbPort }) {
    const conn = `tcp://${dbUser}:${dbPass}@${dbHost}:${dbPort}/${dbName}`;

    this.client = new pg.Client(conn);
    this.client.connect();
  }

  get Client() {
      return this.client;
  }
}

module.exports = Database;
