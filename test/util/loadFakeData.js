import _ from 'lodash'
import co from 'co'
import faker from 'faker'

const buildFile = function buildFile (parentFolderId, filesColleciton) {
  const doc = {
    id: faker.random.uuid(),
    name: faker.hacker.noun(),
    folder: parentFolderId,
    created: new Date().toString(),
    url: faker.image.imageUrl()
  }
  return filesColleciton.create(doc)
}

const buildFolder = function buildFolder (foldersCollection, paentFolderId) {
  const doc = {
    id: faker.random.uuid(),
    name: faker.hacker.noun(),
    parent: paentFolderId,
    created: new Date().toString()
  }
  return foldersCollection.create(doc)
}

const addSubFolderToParent = function addSubFolderToParent (parentFolder, foldersCollection, subFolder) {
  if (!_.isArray(parentFolder.children)) {
    parentFolder.children = []
  }
  parentFolder.children.push(subFolder.id)
  return foldersCollection.update(parentFolder)
}

const buildSubFoldersAndFiles = function buildSubFoldersAndFiles (amount, parentFolderId, filesColleciton, foldersCollection) {
  return co(function * () {
    const folder = yield buildFolder(foldersCollection, parentFolderId)
    const promises = []
    _.times(amount, () => promises.push(buildFile(folder.id, filesColleciton)))
    yield Promise.all(promises)
    return folder
  })
}

const buildFoldersAndFiles = function buildFoldersAndFiles (amount, filesColleciton, foldersCollection) {
  return co(function * () {
    const folder = yield buildFolder(foldersCollection)
    for (let i = 0; i < amount; i++) {
      const subFolder = yield buildSubFoldersAndFiles(amount, folder.id, filesColleciton, foldersCollection)
      yield addSubFolderToParent(folder, foldersCollection, subFolder)
    }
  })
}

export default function loadData (amount, filesColleciton, foldersCollection) {
  const promises = []
  _.times(amount, () => {
    promises.push(buildFoldersAndFiles(amount, filesColleciton, foldersCollection))
  })
  return Promise.all(promises)
}
