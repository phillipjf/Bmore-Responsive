import crypto from 'crypto';
import validator from 'validator';
import jwt from 'jsonwebtoken';

const user = (sequelize, DataTypes) => {
	const User = sequelize.define('user', {
		username: {
			type: DataTypes.STRING,
			unique: true,
			required: true
		},
		password: {
			type: DataTypes.STRING,
			required: true
		},
		salt: {
			type: DataTypes.STRING
		},
		token: {
			type: DataTypes.STRING,
			required: true
		}
	},
	{
		getterMethods: {
			getPassword() {
				return this.password;
			}
		}
	},
	{
		schema: process.env.DATABASE_SCHEMA
	});

	User.findByLogin = async (login,password) => {
		const user = await User.findOne({
			where: {username: login}
		});
		if (!user) {
			user = await User.findOne({
				where: {email: login}
			});
		}

		if (user) {
			const pw = User.encryptPassword(password,user.salt);
	
			if(pw === user.password) {
				console.log(user.token)
				await user.update();
				console.log(user.token)
				return user.token;
			}
		}

		return {
			"error": "Invalid credentials"
		};
	};

	User.generateSalt = () => {
		return crypto.randomBytes(16).toString('base64');
	};

	User.encryptPassword = (plainText, salt) => {
		return crypto
			.createHash('RSA-SHA256')
			.update(plainText)
			.update(salt)
			.digest('hex');
	};

	const setSaltAndPassword = (user) => {
		if (user.changed('password')) {
			user.salt = User.generateSalt();
			user.password = User.encryptPassword(user.password, user.salt);
		}
	};

	const setToken = (user) => {
		const token = jwt.sign({_id: user.id}, process.env.JWT_KEY);
		user.token = token;
	}

	const getToken = (user) => {
		return user.token;
	}

	User.beforeCreate(setSaltAndPassword);
	User.beforeCreate(setToken);
	User.beforeUpdate(setSaltAndPassword);
	User.beforeUpdate(setToken);

	return User;
};

export default user;