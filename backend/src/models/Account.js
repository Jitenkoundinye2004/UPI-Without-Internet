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
  passwordHash: {
    type: DataTypes.STRING,
    allowNull: false
  },
  pinHash: {
    type: DataTypes.STRING,
    allowNull: false
  },
  balance: {
    type: DataTypes.DECIMAL(19, 2),
    allowNull: false,
    defaultValue: 0.00
  },
  version: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  }
}, {
  tableName: 'accounts',
  timestamps: true, // Let's add timestamps for tracking when users registered
  version: true      
});

module.exports = Account;
