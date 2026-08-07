const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Account = sequelize.define('Account', {
  vpa: {
    type: DataTypes.STRING,
    primaryKey: true
  },
  holderName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  balance: {
    type: DataTypes.DECIMAL(19, 2),
    allowNull: false
  },
  version: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  }
}, {
  tableName: 'accounts',
  timestamps: false, // Java model doesn't have created/updated at
  version: true      // Optimistic locking like @Version in Java
});

module.exports = Account;
