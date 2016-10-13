global.chai = require('chai')
global.should = global.chai.should()
global.expect = global.chai.expect
global.sinon = require('sinon')
global.chai.use(require('sinon-chai'))
global.chai.use(require('chai-as-promised'))
