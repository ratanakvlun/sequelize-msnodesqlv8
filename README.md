[npm-url]: https://npmjs.org/package/sequelize-msnodesqlv8
[npm-version-image]: https://img.shields.io/npm/v/sequelize-msnodesqlv8.svg
[npm-downloads-image]: https://img.shields.io/npm/dt/sequelize-msnodesqlv8.svg

sequelize-msnodesqlv8
=====================

[![npm version][npm-version-image]][npm-url] [![npm downloads][npm-downloads-image]][npm-url]

**NOTE: This module is no longer being actively maintained. May not be compatible with `msnodesqlv8` > 0.3.2**

The `sequelize-msnodesqlv8` module is a mssql dialect driver for [`sequelize`](https://github.com/sequelize/sequelize).

There are many node mssql clients and `sequelize` defaults to using [`tedious`](https://github.com/tediousjs/tedious), but being pure javascript,`tedious` lacks support for integrated security. [`msnodesqlv8`](https://github.com/TimelordUK/node-sqlserver-v8) is a client that interfaces with a native odbc library. This allows integrated security to be used. It does require additional binaries to deploy, but fortunately, `msnodesqlv8` is distributed with binaries for the most common architectures.

The purpose of `sequelize-msnodesqlv8` is to provide a dialect driver to `sequelize` so that `msnodesqlv8` can be used instead of `tedious`.

## Installation

```npm install sequelize-msnodesqlv8```

## Usage

Using `sequelize-msnodesqlv8` is simple. Just specify `sequelize-msnodesqlv8` as the `dialectModulePath`:
```javascript
const Sequelize = require('sequelize');

let db = new Sequelize({
  dialect: 'mssql',
  dialectModulePath: 'sequelize-msnodesqlv8',
  dialectOptions: {
    /* Configuration */
  }
});
```

### Configuration

The following options are used by `sequelize-msnodesqlv8`. Options specific to `sequelize` like pooling still apply to the `sequelize` layer.
* _database_ - Name of the database to use.
* _username_ - Username if using SQL authentication.
* _password_ - Password if using SQL authentication.
* _host_ - Hostname of the server. Default: `localhost`
* _dialectOptions.driver_ - Name of the odbc driver to use (e.g. SQL Server Native Client 10.0).
* _dialectOptions.instanceName_ - Name of the instance to connect to.
* _dialectOptions.trustedConnection_ - Indicates whether integrated security should be used. Default: `false`
* _dialectOptions.connectionString_ - Connection string to use. Overrides all other options.

If a driver is not provided in either `dialectOptions.driver` or the connection string, `sequelize-msnodesqlv8` will attempt to detect the driver.

#### Example: Using a connection string directly with `sequelize` pooling.
```javascript
let db = new Sequelize({
  dialect: 'mssql',
  dialectModulePath: 'sequelize-msnodesqlv8',
  dialectOptions: {
    connectionString: 'Driver={SQL Server Native Client 10.0};Server=localhost\\SQLEXPRESS;Database=finances;Trusted_Connection=yes;'
  },
  pool: {
    min: 0,
    max: 5,
    idle: 10000
  }
});
```

#### Example: Using options for Windows authentication.
```javascript
let db = new Sequelize({
  dialect: 'mssql',
  dialectModulePath: 'sequelize-msnodesqlv8',
  dialectOptions: {
    driver: 'SQL Server Native Client 10.0',
    instanceName: 'SQLEXPRESS',
    trustedConnection: true
  },
  host: 'localhost',
  database: 'finances'
});
```

#### Example: Using options for SQL authentication.
```javascript
let db = new Sequelize({
  dialect: 'mssql',
  dialectModulePath: 'sequelize-msnodesqlv8',
  dialectOptions: {
    driver: 'SQL Server Native Client 10.0',
    instanceName: 'SQLEXPRESS'
  },
  host: 'localhost',
  username: 'sa',
  password: 'password',
  database: 'finances'
});
```
