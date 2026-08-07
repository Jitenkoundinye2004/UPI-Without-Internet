const { Sequelize } = require('sequelize');

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: ':memory:', // H2 in-memory equivalent
  logging: false
});

module.exports = sequelize;
