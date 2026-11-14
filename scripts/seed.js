'use strict';
require('dotenv').config();
const { open, createQueries } = require('../src/db');

const USERS = [
  ['علی رضایی', '09121234567', 12.345],
  ['سارا احمدی', '09120000002', 150.0],
  ['رضا کریمی', '09120000003', 0.25],
  ['مریم حسینی', '09120000004', 0],
  ['نیما موسوی', '09120000005', 3.75],
];

const db = open(process.env.DB_PATH || 'data/melligold.db');
const q = createQueries(db);
q.clearAll();
for (const [name, mobile, grams] of USERS) q.createUser(name, mobile, grams);
console.log(`Seeded ${USERS.length} users.`);
db.close();
