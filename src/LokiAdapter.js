import { Adapter } from 'jeggy';
import Loki from 'lokijs';
import _ from 'lodash';

import { LokiCollection } from './LokiCollection';

const populateDoc = function populateDoc(doc, fieldKey, collection) {
  const id = doc[fieldKey];
  if (_.isUndefined(id)) {
    throw new Error('Unknown field: ' + fieldKey);
  }

  if (_.isArray(id)) {
    const array = id;
    const populatedArray = [];
    const promises = _.map(array, (itemId) => {
      return collection.findById(itemId)
        .then((foundDoc) => {
          if (!foundDoc) {
            throw new Error('population  failed');
          }

          populatedArray.push(foundDoc);
        });
    });
    return Promise.all(promises)
      .then(() => {
        doc[fieldKey] = populatedArray;
        return doc;
      });
  }

  return collection.findById(id)
    .then((foundDoc) => {
      if (!foundDoc) {
        throw new Error('population  failed');
      }

      doc[fieldKey] = foundDoc;
    });
};

export class LokiAdapter extends Adapter {
  constructor(loki) {
    super();
    if (_.isString(loki)) {
      loki = new Loki(loki);
    }

    this.loki = loki;
    this.collections = {};
  }

  addCollection(name, idKey) {
    let collection;
    if (name instanceof LokiCollection) {
      collection = name;
      name = collection.name;
    } else {
      if (!_.isString(name) || _.isEmpty(name)) {
        throw new Error('must provide a name when adding a collection');
      }
      const lokiCollection = this.loki.addCollection(name);
      collection = new LokiCollection(name, lokiCollection, idKey);
    }

    this.collections[name] = collection;
    return collection;
  }

  getCollection(name) {
    if (!this.collections[name]) {
      throw new Error('unknown collection: ' + name);
    }
    return this.collections[name];
  }

  getCollections() {
    return this.collections;
  }

  populate(docs, fieldKey, collectionName) {
    try {
      if (!docs) {
        return Promise.reject(new Error('tried to populate a null value'));
      }

      const collection = this.getCollection(collectionName);

      if (!_.isArray(docs)) {
        docs = [docs];
      }

      const promises = _.map(docs, doc => {
        return populateDoc(doc, fieldKey, collection);
      });

      return Promise.all(promises)
        .then(() => {
          return docs;
        });
    } catch (error) {
      return Promise.reject(error);
    }
  }
}
