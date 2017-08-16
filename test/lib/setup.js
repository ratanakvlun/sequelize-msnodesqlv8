'use strict';

const path = require('path');
process.env.NODE_CONFIG_DIR = path.join(__dirname, '../config');

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');

chai.should();
chai.use(chaiAsPromised);
