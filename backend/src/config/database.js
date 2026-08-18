const { Sequelize } = require('sequelize');
const path = require('path');

// We are moving away from the in-memory SQLite to a file-based SQLite database.
// This ensures that when the server restarts, all registered users and balances are saved!
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, '../../database.sqlite'),
  logging: false
});

module.exports = sequelize;
