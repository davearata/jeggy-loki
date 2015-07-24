import { Collection } from 'jeggy';
import _ from 'lodash';

const buildLokiQuery = function buildLokiQuery(query) {
  if (_.keys(query).length > 1) {
    const queryArray = _.map(_.keys(query), (queryKey) => {
      const result = {};
      result[queryKey] = query[queryKey];
      return result;
    });
    query = {$and: queryArray};
  }
  return query;
};

const buildLokiIdQuery = function buildLokiIdQuery(idKey, id) {
  const query = {};
  query[idKey] = id;
  return query;
};

const applyProjection = function applyProjection(doc, projection) {
  let result = {};
  const projectionArr = projection.split(' ');
  if (_.includes(projection, '-')) {
    //take all fields excepts ones excluded
    result = _.assign(result, doc);
    _.each(projectionArr, (projectionKey) => {
      if (_.includes(projectionKey, '-')) {
        projectionKey = _.trim(projectionKey, '-');
        result = _.omit(result, projectionKey);
      }
    });
  } else {
    //only take fields specified
    _.each(projectionArr, (projectionKey) => {
      if (_.includes(projectionKey, '+')) {
        projectionKey = _.trim(projectionKey, '+');
      }
      result[projectionKey] = doc[projectionKey];
    });
  }

  return result;
};

export class LokiCollection extends Collection {
  constructor(name, nativeLokiCollection, idKey) {
    super(name);
    if (!nativeLokiCollection) {
      throw new Error('a LokiCollection must be intiialized with a native lokiJS collection');
    }
    this.nativeLokiCollection = nativeLokiCollection;
    this.idKey = idKey || '_id';
  }

  find(query, projection) {
    const nativeLokiCollection = this.nativeLokiCollection;
    return new Promise((resolve, reject) => {
      try {
        query = buildLokiQuery(query);
        if (_.isUndefined(query)) {
          query = {};
        }
        let result = nativeLokiCollection.find(query);
        if (result !== null) {
          result = _.clone(result, true);
          if (_.isString(projection)) {
            result = _.map(result, (doc) => {
              return applyProjection(doc, projection);
            });
          }
        }
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
  }

  findOne(query, projection) {
    const nativeLokiCollection = this.nativeLokiCollection;
    return new Promise((resolve, reject) => {
      try {
        query = buildLokiQuery(query);
        if (_.isUndefined(query)) {
          query = {};
        }
        let doc = nativeLokiCollection.find(query);
        if (doc === null || _.isEmpty(doc)) {
          return resolve(null);
        }
        if (_.isArray(doc)) {
          doc = doc[0];
        }
        doc = _.assign({}, doc);
        if (_.isString(projection) && _.isObject(doc)) {
          doc = applyProjection(doc, projection);
        }
        resolve(doc);
      } catch (error) {
        reject(error);
      }
    });
  }

  findById(id, projection) {
    const query = buildLokiIdQuery(this.idKey, id);
    return this.findOne(query, projection);
  }

  create(doc) {
    const nativeLokiCollection = this.nativeLokiCollection;
    return new Promise((resolve, reject) => {
      try {
        const createdDoc = nativeLokiCollection.insert(doc);
        if (createdDoc === null) {
          return resolve(createdDoc);
        }
        resolve(_.assign({}, createdDoc));
      } catch (error) {
        reject(error);
      }
    });
  }

  removeWhere(query) {
    const nativeLokiCollection = this.nativeLokiCollection;
    return new Promise((resolve, reject) => {
      try {
        query = buildLokiQuery(query);
        resolve(nativeLokiCollection.removeWhere(query));
      } catch (error) {
        reject(error);
      }
    });
  }

  remove(doc) {
    const nativeLokiCollection = this.nativeLokiCollection;
    const query = buildLokiIdQuery(this.idKey, doc[this.idKey]);
    return new Promise((resolve, reject) => {
      try {
        const foundDoc = _.assign({}, nativeLokiCollection.findOne(query));
        if (_.isEmpty(foundDoc)) {
          throw new Error('unknown doc id:' + doc.id);
        }
        resolve(nativeLokiCollection.remove(doc));
      } catch (error) {
        reject(error);
      }
    });
  }

  update(doc) {
    const nativeLokiCollection = this.nativeLokiCollection;
    const query = buildLokiIdQuery(this.idKey, doc[this.idKey]);
    return this.findOne(query)
      .then(foundDoc => {
        if (_.isEmpty(foundDoc)) {
          throw new Error('unknown doc id:' + doc.id);
        }

        foundDoc = _.merge(foundDoc, doc);
        nativeLokiCollection.update(foundDoc);
        return _.assign({}, foundDoc);
      });
  }
}
