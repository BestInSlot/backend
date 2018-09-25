"use strict";

const DB = require("./pgdb");

const pg = new DB({
  dbUser: "h3lix",
  dbPass: "hihi00hihi",
  dbName: "bestinslot_dev",
  dbHost: "localhost",
  dbPort: 5432
});

const { Client } = pg;

async function createTrigger(opts) {
  const query = `CREATE FUNCTION ${opts.triggerName}() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
    BEGIN
    PERFORM pg_notify('${opts.eventName}', NEW.${opts.column});
    RETURN NULL;
    END;
    $$;
    CREATE TRIGGER updated_realtime_trigger AFTER ${opts.queryType.toUpperCase()} ON ${
    opts.tableName
  }
    FOR EACH ROW EXECUTE PROCEDURE ${opts.triggerName}()`;

  console.log(query);

  try {
    await this.query(query);
    await this.query(`LISTEN ${opts.eventName}`);
  } catch (err) {
    console.log(err);
  }
}

async function removeTrigger(opts) {
  opts.cascade = typeof opts.cascade === undefined ? "RESTRICT" : "CASCADE";
  const query = `DROP TRIGGER IF EXISTS ${opts.triggerName} ON ${opts.table} ${
    opts.cascade
  }`;
  try {
    await this.query(query);
  } catch (err) {
    console.log(err);
  }
}

removeTrigger.call(Client, {
  triggerName: "updatestreams",
  table: "streams"
});

// createTrigger.call(Client, {
//   triggerName: "updatestreams",
//   eventName: "updated",
//   tableName: "streams",
//   queryType: "update",
//   column: "stream_id"
// });

Client.end();

Client.on("end", () => {
  console.log("Disconnecting from Postgres....");
  process.exit(0);
});

Client.on("error", (err) => {
  console.log(err);
  Client.end();
  process.exit(1);
})
