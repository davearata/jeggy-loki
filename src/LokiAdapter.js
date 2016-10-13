import { Adapter } from 'jeggy'
import Loki from 'lokijs'
import _ from 'lodash'
import co from 'co'

import { LokiCollection } from './LokiCollection'

const populateDoc = co.wrap(function * populateDoc (doc, fieldKey, collection) {
  const id = doc[fieldKey]
  if (_.isUndefined(id) || _.isNull(id)) {
    return Promise.resolve()
  }

  if (_.isArray(id)) {
    const array = id
    const populatedArray = []
    for (const itemId of array) {
      const foundDoc = yield collection.findById(itemId)
      if (!foundDoc) {
        throw new Error('population  failed')
      }
      populatedArray.push(foundDoc)
    }
    doc[fieldKey] = populatedArray
  } else {
    const foundDoc = yield collection.findById(id)
    if (!foundDoc) {
      throw new Error('population  failed')
    }

    doc[fieldKey] = foundDoc
  }

  return doc
})

export class LokiAdapter extends Adapter {
  constructor (loki) {
    super()
    if (_.isString(loki)) {
      loki = new Loki(loki)
    }

    this.loki = loki
    this.collections = {}
  }

  addCollection (name, idKey, arrayKeys) {
    let collection
    if (name instanceof LokiCollection) {
      collection = name
      name = collection.name
    } else {
      if (!_.isString(name) || _.isEmpty(name)) {
        throw new Error('must provide a name when adding a collection')
      }
      let lokiCollection = this.loki.getCollection(name)
      if (!lokiCollection) {
        lokiCollection = this.loki.addCollection(name)
      }
      if (!_.isObject(lokiCollection.constraints.unique[idKey])) {
        lokiCollection.ensureUniqueIndex(idKey)
      }
      collection = new LokiCollection(name, lokiCollection, idKey, arrayKeys)
    }

    this.collections[name] = collection
    return collection
  }

  getCollection (name) {
    if (!this.collections[name]) {
      throw new Error('unknown collection: ' + name)
    }
    return this.collections[name]
  }

  getCollections () {
    return this.collections
  }

  populate (docs, fieldKey, collectionName) {
    return co.call(this, function * () {
      if (!docs) {
        throw new Error('tried to populate a null value')
      }

      const collection = this.getCollection(collectionName)

      if (!_.isArray(docs)) {
        docs = [docs]
      }

      for (const doc of docs) {
        yield populateDoc(doc, fieldKey, collection)
      }

      return docs
    })
  }
}
