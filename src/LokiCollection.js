import { Collection } from 'jeggy';
import _ from 'lodash';
import co from 'co';

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

  find(query) {
    const nativeLokiCollection = this.nativeLokiCollection;
    return co(function* () {
      query = buildLokiQuery(query);
      const result = nativeLokiCollection.find(query);
      if (result === null) {
        return result;
      }
      return _.clone(result, true);
    });
  }

  findOne(query) {
    const nativeLokiCollection = this.nativeLokiCollection;
    return co(function* () {
      query = buildLokiQuery(query);
      if(_.isUndefined(query)) {
        query = {};
      }
      let doc = nativeLokiCollection.findOne(query);
      if (doc === null) {
        return doc;
      }
      if(_.isArray(doc)) {
        doc = doc[0];
      }
      return _.assign({}, doc);
    });
  }

  findById(id, projection) {
    const nativeLokiCollection = this.nativeLokiCollection;
    const query = buildLokiIdQuery(this.idKey, id);
    return co(function* () {
      let doc = nativeLokiCollection.findOne(query);
      if (doc === null) {
        return doc;
      }
      doc = _.assign({}, doc);
      if (_.isString(projection) && _.isObject(doc)) {
        doc = applyProjection(doc, projection);
      }
      return doc;
    });
  }

  create(doc) {
    const nativeLokiCollection = this.nativeLokiCollection;
    return co(function* () {
      const createdDoc = nativeLokiCollection.insert(doc);
      if (createdDoc === null) {
        return createdDoc;
      }
      return _.assign({}, createdDoc);
    });
  }

  removeWhere(query) {
    const nativeLokiCollection = this.nativeLokiCollection;
    return co(function* () {
      query = buildLokiQuery(query);
      return nativeLokiCollection.removeWhere(query);
    });
  }

  remove(doc) {
    const nativeLokiCollection = this.nativeLokiCollection;
    const query = buildLokiIdQuery(this.idKey, doc[this.idKey]);
    return co(function* () {
      const foundDoc = _.assign({}, nativeLokiCollection.findOne(query));
      if (_.isEmpty(foundDoc)) {
        throw new Error('unknown doc id:' + doc.id);
      }
      return nativeLokiCollection.remove(doc);
    });
  }

  update(doc) {
    const nativeLokiCollection = this.nativeLokiCollection;
    const query = buildLokiIdQuery(this.idKey, doc[this.idKey]);
    return co(function* () {
      let foundDoc = _.assign({}, nativeLokiCollection.findOne(query));
      if (_.isEmpty(foundDoc)) {
        throw new Error('unknown doc id:' + doc.id);
      }
      foundDoc = _.merge(foundDoc, doc);
      return _.assign({}, nativeLokiCollection.update(foundDoc));
    });
  }
}
