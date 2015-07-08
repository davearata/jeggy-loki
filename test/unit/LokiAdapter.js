import { LokiAdapter } from '../../src/LokiAdapter';

describe('LokiAdapter', function() {
  let adapter;

  beforeEach(function() {
    adapter = new LokiAdapter('test.json');
  });

  it('should exist', function() {
    expect(adapter).to.be.an('object');
    expect(adapter).to.not.be.a('null');
    expect(adapter).to.not.be.a('undefined');
  });

  it('should throw an error when trying to add a collection with no name', function() {
    expect(() => {
      adapter.addCollection();
    }).to.throw(Error);
  });

  it('should throw an error when trying to add a collection with empty name', function() {
    expect(() => {
      adapter.addCollection('');
    }).to.throw(Error);
  });

  it('should add a collection', function() {
    adapter.addCollection('test');
    const collection = adapter.getCollection('test');
    expect(collection).to.be.an('object');
  });

  it('should implement getCollection', function() {
    adapter.collections = {TestCollection: {} };
    expect(() => {
      adapter.getCollection('TestCollection');
    }).to.not.throw();
  });

  it('should throw an error when getCollection is called with an unkown collection', function() {
    adapter.collections = {TestCollection: {} };
    expect(() => {
      adapter.getCollection('TestCollection2');
    }).to.throw(Error);
  });
});
