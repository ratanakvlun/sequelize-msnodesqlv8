'use strict';

const EventEmitter = require('events').EventEmitter;

const uuid = require('uuid');
const debug = require('debug')('sequelize-msnodesqlv8');

class Request extends EventEmitter {
	constructor(sql, callback) {
		super();

		this.uuid = uuid.v4();
		this.sql = sql;
		this.callback = callback;

		debug(`creating request (${ this.uuid }): ${ this.sql.length > 80 ? this.sql.slice(0, 80) + '...' : this.sql }`);
	}

	execute(context) {
		let metadata = null;
		let rowBuffer = null;
		let done = false;
		let hasError = false;
		debug(`connection (${ context.uuid }): executing request (${ this.uuid })`);
		context.requests.push(this);
		try {
			let request = context.connection.queryRaw(this.sql, (err, results) => {
				if (err) {
					hasError = true;
					// Removes the request and triggers callback with error.
					context.removeRequest(this, err);
				} else if (done && !hasError) {
					context.removeRequest(this);
					if (typeof this.callback === 'function') {
						this.callback(err, results);
					}
				}
			});
			request.on('meta', (meta) => {
				metadata = meta;
			});
			request.on('row', () => {
				if (rowBuffer) {
					this.emit('row', rowBuffer);
				}
				rowBuffer = [];
			});
			request.on('column', (index, data) => {
				let columnMetadata = metadata[index];
				let existing = rowBuffer[index];

				if (existing && existing.metadata.colName === columnMetadata.name) {
					if (typeof existing.value === 'string') {
						existing.value += data;
						return;
					} else if (existing.value instanceof Buffer) {
						existing.value = Buffer.concat([existing.value, data]);
						return;
					}
				}

				rowBuffer[index] = {
					metadata: {
						colName: columnMetadata.name,
						type: {
							id: columnMetadata.sqlType
						},
						nullable: columnMetadata.nullable,
						size: columnMetadata.size
					},
					value: data
				};
			});
			request.on('done', () => {
				done = true;
				if (rowBuffer) {
					this.emit('row', rowBuffer);
				}
			});
		} catch (err) {
			context.removeRequest(this, err);
			context.close();
		}
	}
}

module.exports = Request;
