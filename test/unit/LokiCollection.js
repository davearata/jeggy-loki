import { LokiCollection } from '../../src/LokiCollection';

describe('LokiCollection', function() {
  let sandbox;
  let collection;
  let resolvedDoc;
  let getStub;

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
    getStub = sandbox.stub().returns(resolvedDoc);
    collection = new LokiCollection('test', {
      find: sandbox.stub().returns(resolvedDoc),
      findOne: sandbox.stub().returns(resolvedDoc),
      get: getStub,
      insert: sandbox.stub(),
      removeWhere: sandbox.stub(),
      remove: sandbox.stub(),
      update: sandbox.stub()
    });
  });

  afterEach(function () {
    sandbox.restore();
  });

  it('should throw an error if intiialized without a native loki collection', () => {
    expect(() => {
      const errorTestCollection = new LokiCollection('errorTest');
      errorTestCollection.find();
    }).to.throw(Error);
  });

  it('should implement find', () => {
    expect(() => {
      collection.find();
    }).to.not.throw();
  });

  it('should implement findOne', () => {
    expect(() => {
      collection.findOne();
    }).to.not.throw();
  });

  it('should implement findById', () => {
    expect(() => {
      collection.findById();
    }).to.not.throw();
  });

  it('should implement create', () => {
    expect(() => {
      collection.create();
    }).to.not.throw();
  });

  it('should implement removeWhere', () => {
    expect(() => {
      collection.removeWhere();
    }).to.not.throw();
  });

  it('should implement remove', () => {
    getStub.returns({id: 123});
    expect(() => {
      collection.remove({id: 123});
    }).to.not.throw();
  });

  it('should throw an error if it can not find the doc to remove', (done) => {
    collection.remove({id: 123})
      .then(() => {
        done(new Error('this should not have resolved'));
      })
      .then(null, (reason) => {
        expect(reason).to.be.an('error');
        done();
      });
  });

  it('should implement update', () => {
    expect(() => {
      collection.update({id: 123});
    }).to.not.throw();
  });

  it('should throw an error if it can not find the doc to update', (done) => {
    collection.update({id: 123})
      .then(() => {
        done(new Error('this should not have resolved'));
      })
      .then(null, (reason) => {
        expect(reason).to.be.an('error');
        done();
      });
  });

});
