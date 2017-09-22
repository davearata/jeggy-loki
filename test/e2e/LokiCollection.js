import { LokiCollection } from '../../src/LokiCollection'
import loadData from '../util/loadFakeData'
import _ from 'lodash'
import co from 'co'
import Loki from 'lokijs'
import faker from 'faker'

describe('LokiCollection e2e', function () {
  let loki

  beforeEach(() => {
    loki = new Loki()
  })

  describe('Functionality', function () {
    let createdDoc
    let collection

    beforeEach((done) => {
      const lokiCollection = loki.addCollection('test')
      collection = new LokiCollection('Test', lokiCollection)
      const doc = faker.helpers.createCard()
      doc._id = faker.random.uuid()
      co(function * () {
        createdDoc = yield collection.create(doc)
        done()
      })
    })

    it('should be able to instantiate a doc', function () {
      expect(createdDoc).to.be.an('object')
    })

    it('should be able to instantiate many docs', function () {
      const docs = [
        faker.helpers.createCard(),
        faker.helpers.createCard(),
        faker.helpers.createCard()
      ]
      return co(function * () {
        const created = yield collection.insertMany(docs)
        expect(created).to.be.an('array')
        expect(created.length).to.be.equal(3)
      })
    })

    it('should be able to exclude fields when retrieving a doc', function () {
      expect(createdDoc).to.have.property('name')
      expect(createdDoc).to.have.property('username')
      return co(function * () {
        const foundCard = yield collection.findById(createdDoc._id, '-name -username')
        expect(foundCard).to.be.an('object')
        expect(foundCard._id).to.be.a('string')
        expect(foundCard).to.not.have.property('name')
        expect(foundCard).to.not.have.property('username')
      })
    })

    it('should be able to only include fields when retrieving a doc', function () {
      expect(_.keys(createdDoc).length > 2).to.equal(true)
      return co(function * () {
        const foundCard = yield collection.findById(createdDoc._id, 'name username')
        expect(foundCard).to.have.property('name')
        expect(foundCard).to.have.property('username')
        expect(_.keys(foundCard).length === 2).to.equal(true)
      })
    })

    it('should be able to only include fields when retrieving multiple docs', function () {
      expect(_.keys(createdDoc).length > 2).to.equal(true)
      return co(function * () {
        const foundCards = yield collection.find({_id: createdDoc._id}, 'name username')
        expect(foundCards).to.be.an('array')
        expect(foundCards.length).to.equal(1)
        const foundCard = foundCards[0]
        expect(foundCard).to.have.property('name')
        expect(foundCard).to.have.property('username')
        expect(_.keys(foundCard).length === 2).to.equal(true)
        const foundCards2 = yield collection.find({_id: createdDoc._id})
        expect(foundCards2).to.be.an('array')
        expect(foundCards2.length).to.equal(1)
        expect(_.keys(foundCards2[0]).length > 2).to.equal(true)
      })
    })

    it('should be able find a doc by a nested property', function () {
      return expect(collection.findOne({'address.streetA': createdDoc.address.streetA})).to.eventually.be.an('object')
    })

    it('should be able to remove a doc', function () {
      const docId = createdDoc._id
      return co(function * () {
        yield collection.remove(createdDoc)
        return expect(collection.findById(docId)).to.eventually.be.an('undefined')
      })
    })

    it('should be able to remove many docs', function () {
      const username = createdDoc.username
      const doc = faker.helpers.createCard()
      doc._id = faker.random.uuid()
      doc.username = username
      return co(function * () {
        yield collection.create(doc)
        const foundDocs = yield collection.find({username: username})
        expect(foundDocs).to.be.an('array')
        expect(foundDocs.length).to.equal(2)
        yield collection.removeWhere({username: username})
        const foundDocs2 = yield collection.find({username: username})
        expect(foundDocs2).to.be.an('array')
        expect(foundDocs2.length).to.equal(0)
      })
    })

    it('should throw an error if you try to remove a doc that it can not find', function () {
      createdDoc._id = 1234
      return expect(collection.remove(createdDoc)).to.be.rejected
    })

    it('should be able to update a doc', () => {
      const docId = createdDoc._id
      const modified = new Date().toString()
      createdDoc.modified = modified
      return co(function * () {
        yield collection.update(createdDoc)
        const foundDoc = yield collection.findById(docId)
        expect(foundDoc).to.have.property('modified')
        expect(foundDoc.modified).to.equal(modified)
      })
    })

    it('should throw an error if you try to remove a doc that it can not find', function () {
      createdDoc._id = 1234
      createdDoc.modified = new Date().toString()
      return expect(collection.update(createdDoc)).to.be.rejected
    })

    it('should be able to update many objects', function () {
      const docs = [
        {arr: ['test']},
        {arr: ['test1']},
        {arr: ['test2']}
      ]

      return co(function * () {
        const result = yield collection.insertMany(docs)
        const ids = _.map(result, '_id')
        const manyUpdated = yield collection.updateMany(ids, {$set: {'str': 'abc'}, $addToSet: {arr: '1234'}})
        expect(manyUpdated.nModified).to.equal(3)
        const updated = yield collection.find({_id: {$in: ids}})
        _.forEach(updated, item => {
          expect(item.str).to.equal('abc')
          expect(item.arr.length).to.equal(2)
          expect(_.includes(item.arr, '1234')).to.equal(true)
        })
      })
    })

    it('should be able to addToSet', function () {
      return co(function * () {
        const doc = {arr: ['test']}
        const created = yield collection.create(doc)
        yield collection.addToSet(created, 'arr', 'test1')
        const foundDoc = yield collection.findById(created._id)
        expect(foundDoc.arr.length).to.equal(2)
        expect(_.includes(foundDoc.arr, 'test1')).to.equal(true)
      })
    })

    it('should not add a duplicate value to the set', function () {
      return co(function * () {
        const doc = {arr: ['test']}
        const created = yield collection.create(doc)
        yield collection.addToSet(created, 'arr', 'test')
        const foundDoc = yield collection.findById(created._id)
        expect(foundDoc.arr.length).to.equal(1)
        expect(_.includes(foundDoc.arr, 'test')).to.equal(true)
      })
    })

    it('should be able to addToSet for multiple docs by a query', function () {
      return co(function * () {
        const docs = [
          {arr: ['test']},
          {arr: ['test1']},
          {arr: ['test2']}
        ]
        const created = yield collection.insertMany(docs)
        const ids = _.map(created, '_id')
        yield collection.addToSetByQuery({_id: {$in: ids}}, 'arr', 'newValue')
        const updated = yield collection.find({_id: {$in: ids}})
        _.forEach(updated, doc => {
          expect(doc.arr.length).to.equal(2)
          expect(_.includes(doc.arr, 'newValue')).to.equal(true)
        })
      })
    })

    it('should be able to pull a value from the set', function () {
      return co(function * () {
        const doc = {arr: ['test']}
        const created = yield collection.create(doc)
        yield collection.pull(created, {arr: 'test'})
        const foundDoc = yield collection.findById(created._id)
        expect(foundDoc.arr.length).to.equal(0)
        expect(_.includes(foundDoc.arr, 'test')).to.equal(false)
      })
    })

    it('should be able to pull a value from multiple docs based on a query', function () {
      return co(function * () {
        const docs = [
          {arr: ['test']},
          {arr: ['test']},
          {arr: ['test']}
        ]
        const created = yield collection.insertMany(docs)
        const ids = _.map(created, '_id')
        yield collection.pullByQuery({_id: {$in: ids}}, {arr: 'test'})
        const updated = yield collection.find({_id: {$in: ids}})
        _.forEach(updated, doc => {
          expect(doc.arr.length).to.equal(0)
          expect(_.includes(doc.arr, 'test')).to.equal(false)
        })
      })
    })
  })

  describe('Load Tests', function () {
    let filesColleciton
    let foldersCollection
    const amount = 10 // 110 folders 1000 files

    beforeEach(function () {
      filesColleciton = new LokiCollection('files', loki.addCollection('files'), 'id')
      foldersCollection = new LokiCollection('folders', loki.addCollection('folders'), 'id', ['children'])
    })

    it('should load many documents quickly', function () {
      return co(function * () {
        yield loadData(amount, filesColleciton, foldersCollection)
        const folders = yield foldersCollection.find()
        const totalFolders = amount + (amount * amount)
        expect(folders.length).to.equal(totalFolders)
        const files = yield filesColleciton.find()
        const totalFiles = amount * amount * amount
        expect(files.length).to.equal(totalFiles)
      })
    })

    describe('Load Query Tests', function () {
      const timeoutMs = 20

      beforeEach((done) => {
        loadData(amount, filesColleciton, foldersCollection)
          .then(() => done())
          .then(null, done)
      })

      it('should count documents', function () {
        return co(function * () {
          const foldersCount = yield foldersCollection.count()
          expect(foldersCount).to.equal(110)
          const folder = yield foldersCollection.findOne({parent: {$ne: undefined}})
          const folderId = folder.id
          const filesCount = yield filesColleciton.count({folder: folderId})
          expect(filesCount).to.equal(amount)
        })
      })

      it('should find documents quickly', function () {
        this.timeout(timeoutMs)
        return co(function * () {
          const folder = yield foldersCollection.findOne({parent: {$ne: undefined}})
          const folderId = folder.id
          const files = yield filesColleciton.find({folder: folderId})
          expect(files.length).to.equal(amount)
        })
      })

      it('should find documents with multiple field queries', function () {
        this.timeout(timeoutMs)
        return co(function * () {
          const folder = yield foldersCollection.findOne({parent: {$ne: undefined}})
          const folderId = folder.id
          const files = yield filesColleciton.find({folder: folderId, created: new Date().toString()})
          expect(files).to.be.an('array')
          expect(files.length).to.equal(amount)
        })
      })

      it('should find a single document with multiple field queries', function () {
        this.timeout(timeoutMs)
        return co(function * () {
          const folder = yield foldersCollection.findOne({parent: {$ne: undefined}})
          const folderId = folder.id
          const files = yield filesColleciton.find({folder: folderId})
          const fileId = files[0].id
          const fileFolderId = files[0].folder
          const file = yield filesColleciton.findOne({id: fileId, folder: fileFolderId})
          expect(file).to.be.an('object')
        })
      })

      it('should find a document by querying an array', function () {
        this.timeout(timeoutMs)

        return co(function * () {
          const foundFolder = yield foldersCollection.findOne({parent: {$ne: undefined}})
          const parent = yield foldersCollection.findOne({children: foundFolder.id})
          expect(parent).to.be.an('object')
          var hasChild = _.includes(parent.children, foundFolder.id)
          expect(hasChild).to.equal(true)
        })
      })
    })
  })
})
