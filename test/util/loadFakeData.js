import faker  from 'faker';

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

const buildSubFoldersAndFiles = function buildSubFoldersAndFiles(amount, parentFolderId, filesColleciton, foldersCollection) {
  return buildFolder(foldersCollection, parentFolderId)
    .then(function (folder) {
      const promises = [];
      for (let index = 0; index < amount; index++) {
        promises.push(buildFile(folder.id, filesColleciton));
      }
      return Promise.all(promises);
    });
};

const buildFoldersAndFiles = function buildFoldersAndFiles(amount, filesColleciton, foldersCollection) {
  return buildFolder(foldersCollection)
    .then(function (folder) {
      const promises = [];
      for (let index = 0; index < amount; index++) {
        promises.push(buildSubFoldersAndFiles(amount, folder.id, filesColleciton, foldersCollection));
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