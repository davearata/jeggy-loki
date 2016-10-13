import _ from 'lodash'
import co from 'co'
import { LokiAdapter } from '../../src/LokiAdapter'
import loadData from '../util/loadFakeData'

describe('LokiAdapter e2e', function () {
  let lokiAdapter
  let filesColleciton
  let foldersCollection

  beforeEach(function (done) {
    lokiAdapter = new LokiAdapter('test.json')
    filesColleciton = lokiAdapter.addCollection('files', 'id')
    foldersCollection = lokiAdapter.addCollection('folders', 'id')
    loadData(10, filesColleciton, foldersCollection)
      .then(() => done())
      .then(null, done)
  })

  it('should be able to instantiate a doc', function () {
    const collection = lokiAdapter.addCollection('Test')
    return expect(collection.create({arr: ['test']})).to.eventually.be.an('object')
  })

  it('should be able to find a doc', function () {
    return co(function * () {
      const folder = yield foldersCollection.findOne()
      expect(folder).to.be.an('object')
      expect(folder.id).to.be.a('string')
    })
  })

  it('should populate documents', function () {
    return co(function * () {
      const folder = yield foldersCollection.findOne({parent: {$ne: null}})
      const folderId = folder.id
      const files = yield filesColleciton.find({folder: folderId})
      const populatedFiles = yield lokiAdapter.populate(files, 'folder', 'folders')
      _.each(populatedFiles, file => {
        expect(file.folder).to.be.an('object')
        expect(file.folder.id).to.be.a('string')
      })
      const filesInFolder = yield filesColleciton.find({folder: folderId})
      _.each(filesInFolder, file => {
        expect(file.folder).to.be.an('string')
      })
    })
  })

  it('should populate an array field on documents', function () {
    return co(function * () {
      const folder = yield foldersCollection.findOne({parent: undefined})
      const folderId = folder.id
      const populatedFolders = yield lokiAdapter.populate(folder, 'children', 'folders')
      const populatedFolder = populatedFolders[0]
      expect(populatedFolder.children).to.be.an('array')
      _.each(populatedFolder.children, (populatedChild) => {
        expect(populatedChild).to.be.an('object')
      })
      const foundFolder = yield foldersCollection.findById(folderId)
      expect(foundFolder.children).to.be.an('array')
      _.each(foundFolder.children, (child) => {
        expect(child).to.be.a('string')
      })
    })
  })

  it('should populate documents even if element in the array has a null or undefined field', function () {
    return co(function * () {
      const folder = yield foldersCollection.findOne({parent: {$ne: null}})
      const folderId = folder.id
      const files = yield filesColleciton.find({folder: folderId})
      files[0].folder = null
      files[1].folder = undefined
      const populatedFiles = yield lokiAdapter.populate(files, 'folder', 'folders')
      _.each(populatedFiles, (file, index) => {
        if (index === 0 || index === 1) {
          return
        }
        expect(file.folder).to.be.an('object')
        expect(file.folder.id).to.be.a('string')
      })
      const foundFiles = yield filesColleciton.find({folder: folderId})
      _.each(foundFiles, file => {
        expect(file.folder).to.be.a('string')
      })
    })
  })
})
