import { LokiAdapter } from '../../src/LokiAdapter';
import loadData from '../util/loadFakeData';
import _ from 'lodash';

describe('LokiAdapter e2e', function () {
  let lokiAdapter;

  beforeEach(() => {
    lokiAdapter = new LokiAdapter('test.json');
  });

  it('should be able to instantiate a doc', function (done) {
    const collection = lokiAdapter.addCollection('Test');

    collection.create({arr: ['test']})
      .then((testObj) => {
        expect(testObj).to.be.an('object');
        done();
      })
      .then(null, done);
  });

  it('should be able to find a doc', function (done) {
    const filesColleciton = lokiAdapter.addCollection('files', 'id');
    const foldersCollection = lokiAdapter.addCollection('folders', 'id');

    loadData(10, filesColleciton, foldersCollection)
      .then(() => {
        return foldersCollection.findOne();
      })
      .then((folder) => {
        expect(folder).to.be.an('object');
        expect(folder.id).to.be.a('string');
        done();
      })
      .then(null, done);
  });

  it('should populate documents', function (done) {
    const filesColleciton = lokiAdapter.addCollection('files', 'id');
    const foldersCollection = lokiAdapter.addCollection('folders', 'id');
    let folderId;

    loadData(10, filesColleciton, foldersCollection)
      .then(() => {
        return foldersCollection.findOne({parent: {$ne: null}});
      })
      .then((folder) => {
        folderId = folder.id;
        return filesColleciton.find({folder: folderId});
      })
      .then((files) => {
        return lokiAdapter.populate(files, 'folder', 'folders');
      })
      .then((files) => {
        _.each(files, file => {
          expect(file.folder).to.be.an('object');
          expect(file.folder.id).to.be.a('string');
        });
      })
      .then(() => {
        return filesColleciton.find({folder: folderId});
      })
      .then((files) => {
        _.each(files, file => {
          expect(file.folder).to.be.an('string');
        });
        done();
      })
      .then(null, done);
  });

  it('should populate an array field on documents', function (done) {
    const filesColleciton = lokiAdapter.addCollection('files', 'id');
    const foldersCollection = lokiAdapter.addCollection('folders', 'id');
    let folderId;

    loadData(10, filesColleciton, foldersCollection)
      .then(() => {
        return foldersCollection.findOne({parent: undefined});
      })
      .then((folder) => {
        folderId = folder.id;
        return lokiAdapter.populate(folder, 'children', 'folders');
      })
      .then((folders) => {
        const folder = folders[0];
        expect(folder.children).to.be.an('array');
        _.each(folder.children, (child) => {
          expect(child).to.be.an('object');
        });
      })
      .then(() => {
        return foldersCollection.findById(folderId);
      })
      .then((folder) => {
        expect(folder.children).to.be.an('array');
        _.each(folder.children, (child) => {
          expect(child).to.be.a('string');
        });
        done();
      })
      .then(null, done);
  });
});