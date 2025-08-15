import { Sequelize, DataTypes } from 'sequelize';

export const sequelize = new Sequelize(
  process.env.DB_NAME || 'scalableuser',
  process.env.DB_USER || 'root',
  process.env.DB_PASS || '',
  {
    host: process.env.DB_HOST || '127.0.0.1',
    dialect: 'mysql',
    logging: false,
  }
);

export const User = sequelize.define('User', {
  email: { type: DataTypes.STRING, allowNull: false, unique: true, validate: { isEmail: true } },
  passwordHash: { type: DataTypes.STRING, allowNull: false },
  deviceId: { type: DataTypes.STRING, allowNull: true },
  avatarPath: { type: DataTypes.STRING, allowNull: true },
}, { tableName: 'users' });

export default { sequelize, User };
