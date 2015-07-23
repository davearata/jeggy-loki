import _ from 'lodash';
import faker from 'faker';

const buildFile = function buildFile(parentFolderId, filesColleciton) {
  const doc = {
    id: faker.random.uuid(),
    name: faker.hacker.noun(),
    folder: parentFolderId,
    created: new Date().toString(),
    url: faker.image.imageUrl()
  };
  return filesColleciton.create(doc);
};

const buildFolder = function buildFolder(foldersCollection, paentFolderId) {
  const doc = {
    id: faker.random.uuid(),
    name: faker.hacker.noun(),
    parent: paentFolderId,
    created: new Date().toString()
  };
  return foldersCollection.create(doc);
};

const addSubFolderToParent = function addSubFolderToParent(parentFolder, foldersCollection, subFolder) {
  if (!_.isArray(parentFolder.children)) {
    parentFolder.children = [];
  }
  parentFolder.children.push(subFolder.id);
  return foldersCollection.update(parentFolder);
};

const buildSubFoldersAndFiles = function buildSubFoldersAndFiles(amount, parentFolderId, filesColleciton, foldersCollection) {
  let folder;
  return buildFolder(foldersCollection, parentFolderId)
    .then(function (createdFolder) {
      folder = createdFolder;
      const promises = [];
      for (let index = 0; index < amount; index++) {
        promises.push(buildFile(folder.id, filesColleciton));
      }
      return Promise.all(promises);
    })
    .then(() => {
      return folder;
    });
};

const buildFoldersAndFiles = function buildFoldersAndFiles(amount, filesColleciton, foldersCollection) {
  return buildFolder(foldersCollection)
    .then(function (folder) {
      const bound = _.bind(addSubFolderToParent, this, folder, foldersCollection);
      const promises = [];
      for (let index = 0; index < amount; index++) {
        const promise = buildSubFoldersAndFiles(amount, folder.id, filesColleciton, foldersCollection)
          .then(bound);
        promises.push(promise);
      }
      return Promise.all(promises);
    });
};

export default function loadData(amount, filesColleciton, foldersCollection) {
  const promises = [];
  for (let index = 0; index < amount; index++) {
    promises.push(buildFoldersAndFiles(amount, filesColleciton, foldersCollection));
  }
  return Promise.all(promises);
}