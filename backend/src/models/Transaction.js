const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Transaction = sequelize.define('Transaction', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  packetHash: {
    type: DataTypes.STRING(64),
    allowNull: false,
    unique: true // idempotency key
  },
  senderVpa: {
    type: DataTypes.STRING,
    allowNull: false
  },
  receiverVpa: {
    type: DataTypes.STRING,
    allowNull: false
  },
  amount: {
    type: DataTypes.DECIMAL(19, 2),
    allowNull: false
  },
  signedAt: {
    type: DataTypes.DATE,
    allowNull: false
  },
  settledAt: {
    type: DataTypes.DATE,
    allowNull: false
  },
  bridgeNodeId: {
    type: DataTypes.STRING,
    allowNull: false
  },
  hopCount: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('SETTLED', 'REJECTED'),
    allowNull: false
  }
}, {
  tableName: 'transactions',
  timestamps: false,
  indexes: [
    {
      name: 'idx_packet_hash',
      unique: true,
      fields: ['packetHash']
    }
  ]
});

module.exports = Transaction;
