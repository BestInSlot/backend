//SETUP DEPEDENCIES.
"use strict";
require("dotenv").config();
require("module-alias/register");
const server = require("@/server");

//GRAB TESTS
const media = require("../api/v1/media/media.spec.js");

media(server);
