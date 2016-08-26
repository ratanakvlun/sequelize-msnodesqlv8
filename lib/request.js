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
		let request = context.queryRaw(this.sql, (err) => {
			if (err !== null || done) {
				if (typeof this.callback === 'function') {
					this.callback(err);
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
