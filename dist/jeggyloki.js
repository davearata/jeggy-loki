var _get = require('babel-runtime/helpers/get')['default'];

var _inherits = require('babel-runtime/helpers/inherits')['default'];

var _createClass = require('babel-runtime/helpers/create-class')['default'];

var _classCallCheck = require('babel-runtime/helpers/class-call-check')['default'];

var _Promise = require('babel-runtime/core-js/promise')['default'];

(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('jeggy'), require('lodash'), require('lokijs')) : typeof define === 'function' && define.amd ? define(['exports', 'jeggy', 'lodash', 'lokijs'], factory) : factory(global.jeggyloki = {}, global.jeggy, global._, global.Loki);
})(this, function (exports, jeggy, _, Loki) {
  'use strict';

  _ = 'default' in _ ? _['default'] : _;
  Loki = 'default' in Loki ? Loki['default'] : Loki;

  var buildLokiQuery = function buildLokiQuery(query, arrayKeys) {
    query = _.reduce(query, function (result, value, key) {
      if (_.contains(arrayKeys, key)) {
        if (_.isArray(value)) {
          result[key] = { $containsAny: value };
        } else {
          result[key] = { $contains: value };
        }
      } else {
        result[key] = value;
      }
      return result;
    }, {});

    if (_.keys(query).length > 1) {
      var queryArray = _.map(_.keys(query), function (queryKey) {
        var result = {};
        result[queryKey] = query[queryKey];
        return result;
      });
      query = { $and: queryArray };
    }
    return query;
  };

  var buildLokiIdQuery = function buildLokiIdQuery(idKey, id) {
    var query = {};
    query[idKey] = id;
    return query;
  };

  var applyProjection = function applyProjection(doc, projection) {
    var result = {};
    var projectionArr = projection.split(' ');
    if (_.includes(projection, '-')) {
      //take all fields excepts ones excluded
      result = _.assign(result, doc);
      _.each(projectionArr, function (projectionKey) {
        if (_.includes(projectionKey, '-')) {
          projectionKey = _.trim(projectionKey, '-');
          result = _.omit(result, projectionKey);
        }
      });
    } else {
      //only take fields specified
      _.each(projectionArr, function (projectionKey) {
        if (_.includes(projectionKey, '+')) {
          projectionKey = _.trim(projectionKey, '+');
        }
        result[projectionKey] = doc[projectionKey];
      });
    }

    return result;
  };

  var LokiCollection = (function (_jeggy$Collection) {
    _inherits(LokiCollection, _jeggy$Collection);

    function LokiCollection(name, nativeLokiCollection, idKey, arrayKeys) {
      _classCallCheck(this, LokiCollection);

      _get(Object.getPrototypeOf(LokiCollection.prototype), 'constructor', this).call(this, name);
      if (!nativeLokiCollection) {
        throw new Error('a LokiCollection must be intiialized with a native lokiJS collection');
      }
      this.nativeLokiCollection = nativeLokiCollection;
      this.idKey = idKey || '_id';
      this.arrayKeys = arrayKeys;
    }

    _createClass(LokiCollection, [{
      key: 'aggregate',
      value: function aggregate() {
        throw new Error('jeggy-loki does not yet support this functionality');
      }
    }, {
      key: 'addToSet',
      value: function addToSet(doc, arrayKey, value) {
        if (!_.isArray(doc[arrayKey])) {
          doc[arrayKey] = [];
        }
        var compareValue = value;
        if (_.isObject(value)) {
          compareValue = JSON.stringify(value);
        }
        var foundValue = _.find(doc[arrayKey], function (d) {
          if (_.isObject(d)) {
            d = JSON.stringify(d);
          }
          return d === compareValue;
        });

        if (_.isUndefined(foundValue)) {
          doc[arrayKey].push(value);
          return this.update(doc);
        }
        return _Promise.resolve(doc);
      }
    }, {
      key: 'pull',
      value: function pull(doc, pullQuery) {
        var arrayKey = _.keys(pullQuery)[0];
        var value = pullQuery[arrayKey];
        doc[arrayKey] = _.filter(doc[arrayKey], function (item) {
          return item.toString() !== value.toString();
        });
        return this.update(doc);
      }

      //TODO implement sortBy functionality
    }, {
      key: 'find',
      value: function find(query, projection) {
        var nativeLokiCollection = this.nativeLokiCollection;
        var arrayKeys = this.arrayKeys;
        return new _Promise(function (resolve, reject) {
          try {
            query = buildLokiQuery(query, arrayKeys);
            if (_.isUndefined(query)) {
              query = {};
            }
            var result = nativeLokiCollection.find(query);
            if (result !== null) {
              if (_.isString(projection)) {
                result = _.map(result, function (doc) {
                  return applyProjection(doc, projection);
                });
              }
              result = _.clone(result, true);
            }
            resolve(result);
          } catch (error) {
            reject(error);
          }
        });
      }
    }, {
      key: 'findStream',
      value: function findStream() {
        throw new Error('jeggy-loki does not yet support this functionality');
      }

      //TODO implement sortBy functionality
    }, {
      key: 'findOne',
      value: function findOne(query, projection) {
        return this.find(query, projection).then(function (result) {
          if (_.isArray(result)) {
            result = result[0];
          }

          return result;
        });
      }
    }, {
      key: 'findById',
      value: function findById(id, projection) {
        var query = buildLokiIdQuery(this.idKey, id);
        return this.findOne(query, projection);
      }
    }, {
      key: 'create',
      value: function create(doc) {
        var nativeLokiCollection = this.nativeLokiCollection;
        return new _Promise(function (resolve, reject) {
          try {
            var createdDoc = nativeLokiCollection.insert(doc);
            if (createdDoc === null) {
              return resolve(createdDoc);
            }
            resolve(_.assign({}, createdDoc));
          } catch (error) {
            reject(error);
          }
        });
      }
    }, {
      key: 'insertMany',
      value: function insertMany(docs) {
        var nativeLokiCollection = this.nativeLokiCollection;
        return new _Promise(function (resolve, reject) {
          try {
            var createdDocs = nativeLokiCollection.insert(docs);
            if (createdDocs === null) {
              return resolve(createdDocs);
            }
            resolve(_.clone(createdDocs, true));
          } catch (error) {
            reject(error);
          }
        });
      }
    }, {
      key: 'removeWhere',
      value: function removeWhere(query) {
        var nativeLokiCollection = this.nativeLokiCollection;
        var arrayKeys = this.arrayKeys;
        return new _Promise(function (resolve, reject) {
          try {
            query = buildLokiQuery(query, arrayKeys);
            resolve(nativeLokiCollection.removeWhere(query));
          } catch (error) {
            reject(error);
          }
        });
      }
    }, {
      key: 'remove',
      value: function remove(doc) {
        var nativeLokiCollection = this.nativeLokiCollection;
        var query = buildLokiIdQuery(this.idKey, doc[this.idKey]);
        return new _Promise(function (resolve, reject) {
          try {
            var foundDoc = _.assign({}, nativeLokiCollection.findOne(query));
            if (_.isEmpty(foundDoc)) {
              reject(new Error('unknown doc id:' + doc.id));
            }
            resolve(nativeLokiCollection.remove(doc));
          } catch (error) {
            reject(error);
          }
        });
      }
    }, {
      key: 'update',
      value: function update(doc) {
        var nativeLokiCollection = this.nativeLokiCollection;
        var idKey = this.idKey;
        var query = buildLokiIdQuery(idKey, doc[idKey]);
        return this.findOne(query).then(function (foundDoc) {
          if (_.isEmpty(foundDoc)) {
            throw new Error('unknown doc id: ' + doc[idKey]);
          }

          foundDoc = _.assign(foundDoc, doc);
          nativeLokiCollection.update(foundDoc);
          return _.assign({}, foundDoc);
        });
      }
    }, {
      key: 'count',
      value: function count(query) {
        try {
          query = buildLokiQuery(query, this.arrayKeys);
          if (_.isUndefined(query)) {
            query = {};
          }
          var result = this.nativeLokiCollection.find(query);
          return _Promise.resolve(result.length);
        } catch (err) {
          return _Promise.reject(err);
        }
      }
    }, {
      key: 'updateMany',
      value: function updateMany(ids, update) {
        var nativeLokiCollection = this.nativeLokiCollection;
        var idKey = this.idKey;
        var query = {};
        query[idKey] = { $in: ids };
        return new _Promise(function (resolve, reject) {
          try {
            nativeLokiCollection.chain().find(query).update(function (obj) {
              if (_.isObject(update.$set) && _.keys(update.$set).length > 0) {
                obj = _.assign(obj, update.$set);
              }
              if (_.isObject(update.$addToSet) && _.keys(update.$addToSet).length > 0) {
                _.forEach(update.$addToSet, function (value, key) {
                  if (!_.isArray(obj[key])) {
                    obj[key] = [];
                  }
                  obj[key].push(value);
                });
              }
              return obj;
            });
            resolve({ ok: 1, nModified: ids.length, n: ids.length });
          } catch (err) {
            reject(err);
          }
        });
      }
    }, {
      key: 'incrementField',
      value: function incrementField(doc, _incrementField, incrementValue) {
        var nativeLokiCollection = this.nativeLokiCollection;
        var idKey = this.idKey;
        var query = buildLokiIdQuery(idKey, doc[idKey]);
        return this.findOne(query).then(function (foundDoc) {
          if (_.isEmpty(foundDoc)) {
            throw new Error('unknown doc id: ' + doc[idKey]);
          }
          if (_.isUndefined(foundDoc[_incrementField]) || _.isNull(foundDoc[_incrementField])) {
            foundDoc[_incrementField] = 0;
          }
          foundDoc[_incrementField] = foundDoc[_incrementField] + incrementValue;
          nativeLokiCollection.update(foundDoc);
          return _.assign({}, foundDoc);
        });
      }
    }]);

    return LokiCollection;
  })(jeggy.Collection);

  exports.LokiCollection = LokiCollection;

  var populateDoc = function populateDoc(doc, fieldKey, collection) {
    var id = doc[fieldKey];
    if (_.isUndefined(id) || _.isNull(id)) {
      return _Promise.resolve();
    }

    if (_.isArray(id)) {
      var _ret = (function () {
        var array = id;
        var populatedArray = [];
        var promises = _.map(array, function (itemId) {
          return collection.findById(itemId).then(function (foundDoc) {
            if (!foundDoc) {
              throw new Error('population  failed');
            }

            populatedArray.push(foundDoc);
          });
        });
        return {
          v: _Promise.all(promises).then(function () {
            doc[fieldKey] = populatedArray;
            return doc;
          })
        };
      })();

      if (typeof _ret === 'object') return _ret.v;
    }

    return collection.findById(id).then(function (foundDoc) {
      if (!foundDoc) {
        throw new Error('population  failed');
      }

      doc[fieldKey] = foundDoc;
    });
  };

  var LokiAdapter = (function (_jeggy$Adapter) {
    _inherits(LokiAdapter, _jeggy$Adapter);

    function LokiAdapter(loki) {
      _classCallCheck(this, LokiAdapter);

      _get(Object.getPrototypeOf(LokiAdapter.prototype), 'constructor', this).call(this);
      if (_.isString(loki)) {
        loki = new Loki(loki);
      }

      this.loki = loki;
      this.collections = {};
    }

    _createClass(LokiAdapter, [{
      key: 'addCollection',
      value: function addCollection(name, idKey, arrayKeys) {
        var collection = undefined;
        if (name instanceof LokiCollection) {
          collection = name;
          name = collection.name;
        } else {
          if (!_.isString(name) || _.isEmpty(name)) {
            throw new Error('must provide a name when adding a collection');
          }
          var lokiCollection = this.loki.getCollection(name);
          if (!lokiCollection) {
            lokiCollection = this.loki.addCollection(name);
          }
          if (!_.isObject(lokiCollection.constraints.unique[idKey])) {
            lokiCollection.ensureUniqueIndex(idKey);
          }
          collection = new LokiCollection(name, lokiCollection, idKey, arrayKeys);
        }

        this.collections[name] = collection;
        return collection;
      }
    }, {
      key: 'getCollection',
      value: function getCollection(name) {
        if (!this.collections[name]) {
          throw new Error('unknown collection: ' + name);
        }
        return this.collections[name];
      }
    }, {
      key: 'getCollections',
      value: function getCollections() {
        return this.collections;
      }
    }, {
      key: 'populate',
      value: function populate(docs, fieldKey, collectionName) {
        var _this = this;

        try {
          var _ret2 = (function () {
            if (!docs) {
              return {
                v: _Promise.reject(new Error('tried to populate a null value'))
              };
            }

            var collection = _this.getCollection(collectionName);

            if (!_.isArray(docs)) {
              docs = [docs];
            }

            var promises = _.map(docs, function (doc) {
              return populateDoc(doc, fieldKey, collection);
            });

            return {
              v: _Promise.all(promises).then(function () {
                return docs;
              })
            };
          })();

          if (typeof _ret2 === 'object') return _ret2.v;
        } catch (error) {
          return _Promise.reject(error);
        }
      }
    }]);

    return LokiAdapter;
  })(jeggy.Adapter);

  exports.LokiAdapter = LokiAdapter;
});
//# sourceMappingURL=./jeggyloki.js.map