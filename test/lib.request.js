'use strict';

require('./lib/setup.js');

const assert = require('assert');

const config = require('config');

const driver = require('../index.js');

describe('lib/request.js', () => {
	let db;

	beforeEach((done) => {
		db = new driver.Connection(config.get('database'));
		db.on('connect', done);
	});

	afterEach(() => {
		db.close();
	});

	describe('#execute', () => {
		it('single statement calculation query', (done) => {
			let rowErr;
			let req = new driver.Request('SELECT 1+1', (err) => {
				if (rowErr instanceof Error) { done(rowErr); }
				else if (err instanceof Error) { done(err); }
				else done();
			});
			req.on('row', (data) => {
				try {
					if (!rowErr) { assert.strictEqual(data[0].value, 2); }
				} catch (e) {
					rowErr = e;
				}
			});
			req.execute(db);
		});

		it('multi-statement calculation query', (done) => {
			let i = 0;
			let expected = [2, 4];
			let rowErr;
			let req = new driver.Request('SELECT 1+1; SELECT 2+2', (err) => {
				if (rowErr instanceof Error) { done(rowErr); }
				else if (err instanceof Error) { done(err); }
				else done();
			});
			req.on('row', (data) => {
				try {
					let j = i;
					i++;
					if (!rowErr) { assert.strictEqual(data[0].value, expected[j]); }
				} catch (e) {
					rowErr = e;
				}
			});
			req.execute(db);
		});

		it('handle low severity error in single statement query', (done) => {
			let req = new driver.Request(`RAISERROR('Custom Error', 1, 1)`, (err) => {
				if (err instanceof Error && err.message.match(/Custom Error/)) { done(); }
				else done(new Error('expected custom error'));
			});
			req.execute(db);
		});

		it('handle high severity error in single statement query', (done) => {
			let req = new driver.Request(`RAISERROR('Custom Error', 18, 1)`, (err) => {
				if (err instanceof Error && err.message.match(/Custom Error/)) { done(); }
				else done(new Error('expected custom error'));
			});
			req.execute(db);
		});

		it('connection can still be used after low severity error', (done) => {
			let req = new driver.Request(`RAISERROR('Custom Error', 1, 1)`, (err) => {
				if (err instanceof Error && err.message.match(/Custom Error/)) {
					req2.execute(db);
				}
				else done(new Error('expected custom error'));
			});
			let rowErr;
			let req2 = new driver.Request('SELECT 1+1', (err) => {
				if (rowErr instanceof Error) { done(rowErr); }
				else if (err instanceof Error) { done(err); }
				else done();
			});
			req2.on('row', (data) => {
				try {
					if (!rowErr) { assert.strictEqual(data[0].value, 2); }
				} catch (e) {
					rowErr = e;
				}
			});
			req.execute(db);
		});

		it('connection can still be used after high severity error', (done) => {
			let req = new driver.Request(`RAISERROR('Custom Error', 18, 1)`, (err) => {
				if (err instanceof Error && err.message.match(/Custom Error/)) {
					req2.execute(db);
				}
				else done(new Error('expected custom error'));
			});
			let rowErr;
			let req2 = new driver.Request('SELECT 1+1', (err) => {
				if (rowErr instanceof Error) { done(rowErr); }
				else if (err instanceof Error) { done(err); }
				else done();
			});
			req2.on('row', (data) => {
				try {
					if (!rowErr) { assert.strictEqual(data[0].value, 2); }
				} catch (e) {
					rowErr = e;
				}
			});
			req.execute(db);
		});
	});
});
