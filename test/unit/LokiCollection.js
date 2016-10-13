import { LokiCollection } from '../../src/LokiCollection'

describe('LokiCollection', function () {
  let sandbox
  let collection
  let resolvedDoc
  let getStub

  beforeEach(function () {
    sandbox = sinon.sandbox.create()
    getStub = sandbox.stub().returns(resolvedDoc)
    collection = new LokiCollection('test', {
      find: sandbox.stub().returns(resolvedDoc),
      findOne: sandbox.stub().returns(resolvedDoc),
      get: getStub,
      insert: sandbox.stub(),
      removeWhere: sandbox.stub(),
      remove: sandbox.stub(),
      update: sandbox.stub()
    })
  })

  afterEach(function () {
    sandbox.restore()
  })

  it('should throw an error if intiialized without a native loki collection', function () {
    expect(() => {
      const errorTestCollection = new LokiCollection('errorTest')
      errorTestCollection.find()
    }).to.throw(Error)
  })

  it('should implement find', function () {
    expect(() => {
      collection.find()
    }).to.not.throw()
  })

  it('should implement findOne', function () {
    expect(() => {
      collection.findOne()
    }).to.not.throw()
  })

  it('should implement findById', function () {
    expect(() => {
      collection.findById()
    }).to.not.throw()
  })

  it('should implement create', function () {
    expect(() => {
      collection.create()
    }).to.not.throw()
  })

  it('should implement count', function () {
    expect(() => {
      collection.count()
    }).to.not.throw()
  })

  it('should implement insertMany', function () {
    expect(() => {
      collection.insertMany()
    }).to.not.throw()
  })

  it('should implement removeWhere', function () {
    expect(() => {
      collection.removeWhere()
    }).to.not.throw()
  })

  it('should implement remove', function () {
    getStub.returns({id: 123})
    expect(() => {
      collection.remove({id: 123})
    }).to.not.throw()
  })

  it('should throw an error if it can not find the doc to remove', function () {
    return collection.remove({id: 123}).should.be.rejectedWith(Error)
  })

  it('should implement update', function () {
    expect(() => {
      collection.update({id: 123})
    }).to.not.throw()
  })

  it('should throw an error if it can not find the doc to update', function () {
    return collection.update({id: 123}).should.be.rejectedWith(Error)
  })
})
