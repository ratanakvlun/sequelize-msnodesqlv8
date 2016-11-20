'use strict';

const EventEmitter = require('events').EventEmitter;

const uuid = require('uuid');

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
		debug(`connection (${ context.uuid }): executing request (${ this.uuid })`);
		context.requests.push(this);
		let request = context.connection.queryRaw(this.sql, (err, results) => {
			if (err) {
				// HACK: Close connection because query errors can lock up the connection.
				context.removeRequest(this, err);
				context.close();
			} else if (done && typeof this.callback === 'function') {
				context.removeRequest(this);
				this.callback(err, results);
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
	}
}

module.exports = Request;
