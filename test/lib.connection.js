'use strict';

require('./lib/setup.js');

const assert = require('assert');

const config = require('config');

const uuid = require('uuid');

const driver = require('../index.js');

describe('lib/connection.js', () => {
	let db;
	let tableName;

	beforeEach((done) => {
		db = new driver.Connection(config.get('database'));
		tableName = uuid.v4();
		db.on('connect', () => {
			let req = new driver.Request(`CREATE TABLE [${ tableName }] (id int identity(1, 1), name varchar(255), note varchar(255))`, (err) => {
				if (err instanceof Error) { done(err); }
				else done();
			});
			req.execute(db);
		});
	});

	afterEach((done) => {
		let req = new driver.Request(`DROP TABLE [${ tableName }]`, (err) => {
			db.close();
			if (err instanceof Error) { done(err); }
			else done();
		});
		req.execute(db);
	});

	describe('transactions', () => {
		it('transaction is committed', (done) => {
			db.beginTransaction((err1) => {
				if (err1 instanceof Error) { done(err1); return; }
				let req1 = new driver.Request(`INSERT INTO [${ tableName }] VALUES ('Bob', 'Standard man')`, (err2) => {
					if (err2 instanceof Error) { done(err2); return; }
					db.commitTransaction((err3) => {
						if (err3 instanceof Error) { done(err3); return; }
						let rowErr;
						let req2 = new driver.Request(`SELECT * FROM [${ tableName }] WHERE id=1`, (err4, res) => {
							if (rowErr instanceof Error) { done(rowErr); }
							else if (err4 instanceof Error) { done(err4); }
							else if (res && res.rows && res.rows.length > 0) { done(); }
							else done(new Error('row was not found'));
						});
						req2.on('row', (data) => {
							try {
								if (!rowErr) {
									assert.strictEqual(data[0].value, 1);
									assert.strictEqual(data[1].value, 'Bob');
									assert.strictEqual(data[2].value, 'Standard man');
								}
							} catch (e) {
								rowErr = e;
							}
						});
						req2.execute(db);
					});
				});
				req1.execute(db);
			});
		});

		it('transaction is rolled back', (done) => {
			db.beginTransaction((err1) => {
				if (err1 instanceof Error) { done(err1); return; }
				let req1 = new driver.Request(`INSERT INTO [${ tableName }] VALUES ('Bob', 'Standard man')`, (err2) => {
					if (err2 instanceof Error) { done(err2); return; }
					db.rollbackTransaction((err3) => {
						if (err3 instanceof Error) { done(err3); return; }
						let req2 = new driver.Request(`SELECT * FROM [${ tableName }] WHERE id=1`, (err4, res) => {
							if (err4 instanceof Error) { done(err4); }
							else if (res && res.rows && res.rows.length > 0) { done(new Error('row should not exist')); }
							else done();
						});
						req2.execute(db);
					});
				});
				req1.execute(db);
			});
		});

		it('transaction is committed up to save point', (done) => {
			db.beginTransaction((err1) => {
				if (err1 instanceof Error) { done(err1); return; }
				let req1 = new driver.Request(`INSERT INTO [${ tableName }] VALUES ('Bob', 'Standard man')`, (err2) => {
					if (err2 instanceof Error) { done(err2); return; }
					db.saveTransaction((err3) => {
						if (err3 instanceof Error) { done(err3); return; }
						let req2 = new driver.Request(`INSERT INTO [${ tableName }] VALUES ('Jane', 'Standard woman')`, (err4) => {
							if (err4 instanceof Error) { done(err4); return; }
							db.rollbackTransaction((err5) => {
								if (err5 instanceof Error) { done(err5); return; }
								db.commitTransaction((err6) => {
									if (err6 instanceof Error) { done(err6); return; }
									let rowErr;
									let req3 = new driver.Request(`SELECT * FROM [${ tableName }]`, (err7) => {
										if (rowErr instanceof Error) { done(rowErr); }
										else if (err7 instanceof Error) { done(err7); }
										else done();
									});
									req3.on('row', (data) => {
										try {
											if (!rowErr) {
												assert.strictEqual(data[0].value, 1);
												assert.strictEqual(data[1].value, 'Bob');
												assert.strictEqual(data[2].value, 'Standard man');
											}
										} catch (e) {
											rowErr = e;
										}
									});
									req3.execute(db);
								});
							}, 'savePoint');
						});
						req2.execute(db);
					}, 'savePoint');
				});
				req1.execute(db);
			});
		});
	});
});
