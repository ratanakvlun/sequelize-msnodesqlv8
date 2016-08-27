'use strict';

const EventEmitter = require('events').EventEmitter;

const mssql = require('msnodesqlv8');

const Request = require('./request.js');

function detectDriver() {
	const drivers = [
		'SQL Server Native Client 12.0',
		'SQL Server Native Client 11.0',
		'SQL Server Native Client 10.0',
		'SQL Native Client',
		'SQL Server'
	];
	let detectedDriver = null;
	return drivers.reduce((prev, driver) => {
		return prev.then(() => {
			if (detectedDriver !== null) {
				return;
			}
			return new Promise((resolve) => {
				mssql.open(`Driver=${ driver };`, (err, conn) => {
					if (err) {
						if (err.message.indexOf('Neither DSN nor SERVER keyword supplied') !== -1 && detectedDriver === null) {
							detectedDriver = driver;
						}
					} else {
						// Should not be possible because nothing but driver is specified.
						conn.close(() => {});
					}
					resolve();
				});
			});
		});
	}, Promise.resolve()).then(() => {
		if (detectedDriver) {
			return detectedDriver;
		}
		throw new Error('Driver was not specified and no driver was detected.');
	});
}

class Connection extends EventEmitter {
	constructor(config) {
		super();

		config = config || {};
		let options = config.options || {};
		delete config.options;
		Object.assign(config, options);

		if (!config.connectionString) {
			if (!config.instanceName) {
				throw new Error('Instance name is required.');
			}
			config.connectionString = (config.driver ? `Driver={${ config.driver }};` : '') +
				`Server=${ config.server ? config.server : 'localhost' }\\${ config.instanceName };` +
				(config.database ? `Database=${ config.database };` : '') +
				(config.trustedConnection ? 'Trusted_Connection=yes;' : `Uid=${ config.userName || '' };Pwd=${ config.password || '' };`);
		}

		this.config = config;
		this.connection = null;
		this.timer = null;

		Promise.resolve().then(() => {
			let match = this.config.connectionString.match(/(?:^\s*Driver\s*=)|(?:;\s*Driver\s*=)/i);
			if (!match) {
				return detectDriver().then((driver) => {
					this.config.driver = driver;
					this.config.connectionString = `Driver={${ driver }};${ this.config.connectionString }`;
				});
			}
		}).then(() => {
			this.connect();
		}).catch((err) => {
			this.emit('connect', err);
		});
	}

	get closed() {
		return this.connection === null || this.connection.closed;
	}

	get loggedIn() {
		return this.connection !== null && !this.connection.closed;
	}

	connect() {
		mssql.open(this.config.connectionString, (err, conn) => {
			if (!err) {
				this.connection = conn;
				this.timer = setInterval(() => {
					try {
						if (this.connection === null) {
							if (this.timer) {
								clearInterval(this.timer);
								this.timer = null;
							}
						} else {
							this.connection.query();
						}
					} catch (err) {
						if (err.message === '[msnodesql] Connection is closed.') {
							let error = new Error('Connection was closed unexpectedly.');
							error.code = 'ECONNRESET';
							this.emit('error', error);
							this.close();
						}
					}
				}, 5000);
			}
			this.emit('connect', err);
		});
	}

	close() {
		if (this.connection !== null) {
			this.connection.close((err) => {
				this.connection = null;
				this.emit('end', err);
			});
		} else {
			this.emit('end', new Error('Connection already closed.'));
		}
	}

	beginTransaction(callback, name) {
		name = name || '';
		let request = new Request(`BEGIN TRANSACTION ${name};`, (err) => {
			if (typeof callback === 'function') {
				callback(err);
			}
		});
		request.execute(this.connection);
	}

	commitTransaction(callback, name) {
		name = name || '';
		let request = new Request(`COMMIT TRANSACTION ${name};`, (err) => {
			if (typeof callback === 'function') {
				callback(err);
			}
		});
		request.execute(this.connection);
	}

	rollbackTransaction(callback, name) {
		name = name || '';
		let request = new Request(`ROLLBACK TRANSACTION ${name};`, (err) => {
			if (typeof callback === 'function') {
				callback(err);
			}
		});
		request.execute(this.connection);
	}

	execSql(request) {
		request.execute(this.connection);
	}
}

module.exports = Connection;
