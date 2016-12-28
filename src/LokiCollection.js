import { Collection } from 'jeggy'
import _ from 'lodash'
import co from 'co'

const buildLokiQuery = function buildLokiQuery (query, arrayKeys) {
  query = _.reduce(query, (result, value, key) => {
    if (_.includes(arrayKeys, key)) {
      if (_.isArray(value)) {
        result[key] = {$containsAny: value}
      } else {
        result[key] = {$contains: value}
      }
    } else {
      result[key] = value
    }
    return result
  }, {})

  if (_.keys(query).length > 1) {
    const queryArray = _.map(_.keys(query), (queryKey) => {
      const result = {}
      result[queryKey] = query[queryKey]
      return result
    })
    query = {$and: queryArray}
  }
  return query
}

const buildLokiIdQuery = function buildLokiIdQuery (idKey, id) {
  const query = {}
  query[idKey] = id
  return query
}

const applyProjection = function applyProjection (doc, projection) {
  let result = {}
  const projectionArr = projection.split(' ')
  if (_.includes(projection, '-')) {
    // take all fields excepts ones excluded
    result = _.assign(result, doc)
    _.each(projectionArr, (projectionKey) => {
      if (_.includes(projectionKey, '-')) {
        projectionKey = _.trim(projectionKey, '-')
        result = _.omit(result, projectionKey)
      }
    })
  } else {
    // only take fields specified
    _.each(projectionArr, (projectionKey) => {
      if (_.includes(projectionKey, '+')) {
        projectionKey = _.trim(projectionKey, '+')
      }
      result[projectionKey] = doc[projectionKey]
    })
  }

  return result
}

const stringifyObjectValues = function stringifyObjectValues (val) {
  if (_.isObject(val)) {
    if (!_.isPlainObject(val)) {
      return val.toString()
    } else {
      return _.reduce(val, function (res, value, key) {
        res[key] = stringifyObjectValues(value)
        return res
      }, {})
    }
  } else if (_.isArray(val)) {
    return _.map(val, stringifyObjectValues)
  }
  return val
}

export class LokiCollection extends Collection {
  constructor (name, nativeLokiCollection, idKey, arrayKeys) {
    super(name)
    if (!nativeLokiCollection) {
      throw new Error('a LokiCollection must be intiialized with a native lokiJS collection')
    }
    this.nativeLokiCollection = nativeLokiCollection
    this.idKey = idKey || '_id'
    this.arrayKeys = arrayKeys
  }

  aggregate () {
    throw new Error('jeggy-loki does not yet support this functionality')
  }

  addToSet (doc, arrayKey, value) {
    if (!_.isArray(doc[arrayKey])) {
      doc[arrayKey] = []
    }
    var compareValue = value
    if (_.isObject(value)) {
      compareValue = JSON.stringify(value)
    }
    let foundValue = _.find(doc[arrayKey], function (d) {
      if (_.isObject(d)) {
        d = JSON.stringify(d)
      }
      return d === compareValue
    })

    if (_.isUndefined(foundValue)) {
      doc[arrayKey].push(value)
      return this.update(doc)
    }
    return Promise.resolve(doc)
  }

  pull (doc, pullQuery) {
    const arrayKey = _.keys(pullQuery)[0]
    let removeValue = pullQuery[arrayKey]
    removeValue = stringifyObjectValues(removeValue)
    if (_.isObject(removeValue)) {
      doc[arrayKey] = _.filter(doc[arrayKey], function (value) {
        let match = true
        _.forEach(removeValue, function (val, key) {
          let isMatch = value[key] === val
          if (!isMatch) {
            match = false
          }
        })
        return !match
      })
    } else {
      doc[arrayKey] = _.filter(doc[arrayKey], function (value) {
        return value !== removeValue
      })
    }
    return this.update(doc)
  }

  // TODO implement sortBy functionality
  find (query, projection) {
    const nativeLokiCollection = this.nativeLokiCollection
    const arrayKeys = this.arrayKeys
    return new Promise((resolve, reject) => {
      try {
        query = buildLokiQuery(query, arrayKeys)
        if (_.isUndefined(query)) {
          query = {}
        }
        let result = nativeLokiCollection.find(query)
        if (result !== null) {
          if (_.isString(projection)) {
            result = _.map(result, (doc) => {
              return applyProjection(doc, projection)
            })
          }
          result = _.cloneDeep(result)
        }
        resolve(result)
      } catch (error) {
        reject(error)
      }
    })
  }

  findStream () {
    throw new Error('jeggy-loki does not yet support this functionality')
  }

  // TODO implement sortBy functionality
  findOne (query, projection) {
    return co.call(this, function * () {
      const result = yield this.find(query, projection)
      if (_.isArray(result)) {
        return result[0]
      }

      return result
    })
  }

  findById (id, projection) {
    const query = buildLokiIdQuery(this.idKey, id)
    return this.findOne(query, projection)
  }

  create (doc) {
    const nativeLokiCollection = this.nativeLokiCollection
    return new Promise((resolve, reject) => {
      try {
        const createdDoc = nativeLokiCollection.insert(doc)
        if (createdDoc === null) {
          return resolve(createdDoc)
        }
        resolve(_.assign({}, createdDoc))
      } catch (error) {
        reject(error)
      }
    })
  }

  insertMany (docs) {
    const nativeLokiCollection = this.nativeLokiCollection
    return new Promise((resolve, reject) => {
      try {
        const createdDocs = nativeLokiCollection.insert(docs)
        if (createdDocs === null) {
          return resolve(createdDocs)
        }
        resolve(_.cloneDeep(createdDocs))
      } catch (error) {
        reject(error)
      }
    })
  }

  removeWhere (query) {
    const nativeLokiCollection = this.nativeLokiCollection
    const arrayKeys = this.arrayKeys
    return new Promise((resolve, reject) => {
      try {
        query = buildLokiQuery(query, arrayKeys)
        resolve(nativeLokiCollection.removeWhere(query))
      } catch (error) {
        reject(error)
      }
    })
  }

  remove (doc) {
    const nativeLokiCollection = this.nativeLokiCollection
    const query = buildLokiIdQuery(this.idKey, doc[this.idKey])
    return new Promise((resolve, reject) => {
      try {
        const foundDoc = _.assign({}, nativeLokiCollection.findOne(query))
        if (_.isEmpty(foundDoc)) {
          reject(new Error('unknown doc id:' + doc.id))
        }
        resolve(nativeLokiCollection.removeWhere({_id: doc._id}))
      } catch (error) {
        reject(error)
      }
    })
  }

  update (doc) {
    const nativeLokiCollection = this.nativeLokiCollection
    const idKey = this.idKey
    const query = buildLokiIdQuery(idKey, doc[idKey])
    return co.call(this, function * () {
      const foundDoc = yield this.findOne(query)
      if (_.isEmpty(foundDoc)) {
        throw new Error('unknown doc id: ' + doc[idKey])
      }

      const mergedDoc = _.assign(foundDoc, doc)
      nativeLokiCollection.update(mergedDoc)
      return _.assign({}, mergedDoc)
    })
  }

  count (query) {
    try {
      query = buildLokiQuery(query, this.arrayKeys)
      if (_.isUndefined(query)) {
        query = {}
      }
      const result = this.nativeLokiCollection.find(query)
      return Promise.resolve(result.length)
    } catch (err) {
      return Promise.reject(err)
    }
  }

  updateMany (ids, update) {
    const nativeLokiCollection = this.nativeLokiCollection
    const idKey = this.idKey
    const query = {}
    query[idKey] = {$in: ids}
    return new Promise((resolve, reject) => {
      try {
        nativeLokiCollection
          .chain()
          .find(query)
          .update(obj => {
            if (_.isObject(update.$set) && _.keys(update.$set).length > 0) {
              obj = _.assign(obj, update.$set)
            }
            if (_.isObject(update.$addToSet) && _.keys(update.$addToSet).length > 0) {
              _.forEach(update.$addToSet, (value, key) => {
                if (!_.isArray(obj[key])) {
                  obj[key] = []
                }
                obj[key].push(value)
              })
            }
            return obj
          })
        resolve({ok: 1, nModified: ids.length, n: ids.length})
      } catch (err) {
        reject(err)
      }
    })
  }

  incrementField (doc, incrementField, incrementValue) {
    const nativeLokiCollection = this.nativeLokiCollection
    const idKey = this.idKey
    const query = buildLokiIdQuery(idKey, doc[idKey])
    return co.call(this, function * () {
      const foundDoc = yield this.findOne(query)
      if (_.isEmpty(foundDoc)) {
        throw new Error('unknown doc id: ' + doc[idKey])
      }
      if (_.isUndefined(foundDoc[incrementField]) || _.isNull(foundDoc[incrementField])) {
        foundDoc[incrementField] = 0
      }
      foundDoc[incrementField] = foundDoc[incrementField] + incrementValue
      nativeLokiCollection.update(foundDoc)
      return _.assign({}, foundDoc)
    })
  }
}
