'use strict';

const EventEmitter = require('events').EventEmitter;

class Request extends EventEmitter {
	constructor(sql, callback) {
		super();

		this.sql = sql;
		this.callback = callback;
	}

	execute(context) {
		let metadata = null;
		let rowBuffer = null;
		let done = false;
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
