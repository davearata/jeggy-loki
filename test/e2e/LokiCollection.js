import { LokiCollection } from '../../src/LokiCollection';
import loadData from '../util/loadFakeData';
import _ from 'lodash';
import Loki from 'lokijs';
import faker from 'faker';

describe('LokiCollection e2e', () => {
  let loki;

  beforeEach(() => {
    loki = new Loki();
  });

  describe('Functionality', () => {
    let createdDoc;
    let collection;

    beforeEach((done) => {
      const lokiCollection = loki.addCollection('test');
      collection = new LokiCollection('Test', lokiCollection);
      const doc = faker.helpers.createCard();
      doc._id = faker.random.uuid();
      collection.create(doc)
        .then((created) => {
          createdDoc = created;
          done();
        });
    });

    it('should be able to instantiate a doc', () => {
      expect(createdDoc).to.be.an('object');
    });

    it('should be able to instantiate many docs', done => {
      const docs = [
        faker.helpers.createCard(),
        faker.helpers.createCard(),
        faker.helpers.createCard()
      ];
      collection.insertMany(docs)
        .then((created) => {
          expect(created).to.be.an('array');
          expect(created.length).to.be.equal(3);
          done();
        })
        .then(null, reason => {
          done(reason);
        });
    });

    it('should be able to exclude fields when retrieving a doc', (done) => {
      expect(createdDoc).to.have.property('name');
      expect(createdDoc).to.have.property('username');
      collection.findById(createdDoc._id, '-name -username')
        .then((foundCard) => {
          expect(foundCard).to.be.an('object');
          expect(foundCard._id).to.be.a('string');
          expect(foundCard).to.not.have.property('name');
          expect(foundCard).to.not.have.property('username');
          done();
        })
        .then(null, done);
    });

    it('should be able to only include fields when retrieving a doc', (done) => {
      expect(_.keys(createdDoc).length > 2).to.equal(true);
      collection.findById(createdDoc._id, 'name username')
        .then((foundCard) => {
          expect(foundCard).to.have.property('name');
          expect(foundCard).to.have.property('username');
          expect(_.keys(foundCard).length === 2).to.equal(true);
          done();
        })
        .then(null, done);
    });

    it('should be able to only include fields when retrieving multiple docs', (done) => {
      expect(_.keys(createdDoc).length > 2).to.equal(true);
      collection.find({_id: createdDoc._id}, 'name username')
        .then((foundCards) => {
          expect(foundCards).to.be.an('array');
          expect(foundCards.length).to.equal(1);
          const foundCard = foundCards[0];
          expect(foundCard).to.have.property('name');
          expect(foundCard).to.have.property('username');
          expect(_.keys(foundCard).length === 2).to.equal(true);
        })
        .then(() => {
          return collection.find({_id: createdDoc._id});
        })
        .then((foundCards) => {
          expect(foundCards).to.be.an('array');
          expect(foundCards.length).to.equal(1);
          expect(_.keys(foundCards[0]).length > 2).to.equal(true);
          done();
        })
        .then(null, done);
    });

    it('should be able find a doc by a nested property', (done) => {
      collection.findOne({'address.streetA': createdDoc.address.streetA})
        .then((foundCard) => {
          expect(foundCard).to.be.an('object');
          done();
        })
        .then(null, done);
    });

    it('should be able to remove a doc', (done) => {
      const docId = createdDoc._id;
      collection.remove(createdDoc)
        .then(() => {
          return collection.findById(docId);
        })
        .then((foundDoc) => {
          expect(foundDoc).to.be.an('undefined');
          done();
        })
        .then(null, done);
    });

    it('should be able to remove many docs', (done) => {
      const username = createdDoc.username;
      const doc = faker.helpers.createCard();
      doc._id = faker.random.uuid();
      doc.username = username;
      collection.create(doc)
        .then(() => {
          return collection.find({username: username});
        })
        .then((foundDocs)=> {
          expect(foundDocs).to.be.an('array');
          expect(foundDocs.length).to.equal(2);
          return collection.removeWhere({username: username});
        })
        .then(() => {
          return collection.find({username: username});
        })
        .then((foundDocs)=> {
          expect(foundDocs).to.be.an('array');
          expect(foundDocs.length).to.equal(0);
          done();
        })
        .then(null, done);
    });

    it('should throw an error if you try to remove a doc that it can not find', (done) => {
      createdDoc._id = 1234;
      collection.remove(createdDoc)
        .then(() => {
          done('should not resolve here');
        })
        .then(null, () => {
          done();
        });
    });

    it('should be able to update a doc', (done) => {
      const docId = createdDoc._id;
      const modified = new Date().toString();
      createdDoc.modified = modified;
      collection.update(createdDoc)
        .then(() => {
          return collection.findById(docId);
        })
        .then((foundDoc) => {
          expect(foundDoc).to.have.property('modified');
          expect(foundDoc.modified).to.equal(modified);
          done();
        })
        .then(null, done);
    });

    it('should throw an error if you try to remove a doc that it can not find', (done) => {
      createdDoc._id = 1234;
      createdDoc.modified = new Date().toString();
      collection.update(createdDoc)
        .then(() => {
          done('should not resolve here');
        })
        .then(null, () => {
          done();
        });
    });

    it('should be able to update many objects', done => {
      const docs = [
        {arr: ['test']},
        {arr: ['test1']},
        {arr: ['test2']}
      ];
      let ids;
      collection.insertMany(docs)
        .then(result => {
          ids = _.pluck(result, '_id');
          return collection.updateMany(ids, {$set: {'str': 'abc'}, $addToSet: {arr: '1234'}});
        })
        .then(result => {
          expect(result.nModified).to.equal(3);
          return collection.find({_id: {$in: ids}});
        })
        .then(updated => {
          _.forEach(updated, item => {
            expect(item.str).to.equal('abc');
            expect(item.arr.length).to.equal(2);
            expect(_.includes(item.arr, '1234')).to.equal(true);
          });
          done();
        })
        .then(null, done);
    });
  });

  describe('Load Tests', () => {
    let filesColleciton;
    let foldersCollection;
    const amount = 10; // 110 folders 1000 files

    beforeEach(() => {
      filesColleciton = new LokiCollection('files', loki.addCollection('files'), 'id');
      foldersCollection = new LokiCollection('folders', loki.addCollection('folders'), 'id', ['children']);
    });

    it('should load many documents quickly', function (done) {
      loadData(amount, filesColleciton, foldersCollection)
        .then(() => {
          return foldersCollection.find();
        })
        .then((folders) => {
          const totalFolders = amount + (amount * amount);
          expect(folders.length).to.equal(totalFolders);
          return filesColleciton.find();
        })
        .then((files) => {
          const totalFiles = amount * amount * amount;
          expect(files.length).to.equal(totalFiles);
          done();
        })
        .then(null, done);
    });

    describe('Load Query Tests', () => {
      const timeoutMs = 20;

      beforeEach((done) => {
        loadData(amount, filesColleciton, foldersCollection)
          .then(() => {
            done();
          })
          .then(null, done);
      });

      it('should find documents quickly', function (done) {
        this.timeout(timeoutMs);
        foldersCollection.findOne({parent: {$ne: undefined}})
          .then((folder) => {
            const folderId = folder.id;
            return filesColleciton.find({folder: folderId});
          })
          .then((files) => {
            expect(files.length).to.equal(amount);
            done();
          })
          .then(null, done);
      });

      it('should find documents with multiple field queries', function (done) {
        this.timeout(timeoutMs);
        foldersCollection.findOne({parent: {$ne: undefined}})
          .then((folder) => {
            const folderId = folder.id;
            return filesColleciton.find({folder: folderId, created: new Date().toString()});
          })
          .then((files) => {
            expect(files).to.be.an('array');
            expect(files.length).to.equal(amount);
            done();
          })
          .then(null, done);
      });

      it('should find a single document with multiple field queries', function (done) {
        this.timeout(timeoutMs);
        foldersCollection.findOne({parent: {$ne: undefined}})
          .then((folder) => {
            const folderId = folder.id;
            return filesColleciton.find({folder: folderId});
          })
          .then((files) => {
            const fileId = files[0].id;
            const folderId = files[0].folder;
            return filesColleciton.findOne({id: fileId, folder: folderId});
          })
          .then((file) => {
            expect(file).to.be.an('object');
            done();
          })
          .then(null, done);
      });

      it('should find a document by querying an array', function (done) {
        this.timeout(timeoutMs);
        let foundFolder;
        foldersCollection.findOne({parent: {$ne: undefined}})
          .then((folder) => {
            foundFolder = folder;
            return foldersCollection.findOne({children: foundFolder.id});
          })
          .then(parent => {
            expect(parent).to.be.an('object');
            var hasChild = _.contains(parent.children, foundFolder.id);
            expect(hasChild).to.equal(true);
            done();
          })
          .then(null, done);
      });
    });
  });
});
