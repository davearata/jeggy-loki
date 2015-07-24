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

  var _LokiCollection__buildLokiQuery = function buildLokiQuery(query) {
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

  var _LokiCollection__buildLokiIdQuery = function buildLokiIdQuery(idKey, id) {
    var query = {};
    query[idKey] = id;
    return query;
  };

  var _LokiCollection__applyProjection = function applyProjection(doc, projection) {
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

    function LokiCollection(name, nativeLokiCollection, idKey) {
      _classCallCheck(this, LokiCollection);

      _get(Object.getPrototypeOf(LokiCollection.prototype), 'constructor', this).call(this, name);
      if (!nativeLokiCollection) {
        throw new Error('a LokiCollection must be intiialized with a native lokiJS collection');
      }
      this.nativeLokiCollection = nativeLokiCollection;
      this.idKey = idKey || '_id';
    }

    _createClass(LokiCollection, [{
      key: 'find',
      value: function find(query, projection) {
        var nativeLokiCollection = this.nativeLokiCollection;
        return new _Promise(function (resolve, reject) {
          try {
            query = _LokiCollection__buildLokiQuery(query);
            if (_.isUndefined(query)) {
              query = {};
            }
            var result = nativeLokiCollection.find(query);
            if (result !== null) {
              result = _.clone(result, true);
              if (_.isString(projection)) {
                result = _.map(result, function (doc) {
                  return _LokiCollection__applyProjection(doc, projection);
                });
              }
            }
            resolve(result);
          } catch (error) {
            reject(error);
          }
        });
      }
    }, {
      key: 'findOne',
      value: function findOne(query, projection) {
        var nativeLokiCollection = this.nativeLokiCollection;
        return new _Promise(function (resolve, reject) {
          try {
            query = _LokiCollection__buildLokiQuery(query);
            if (_.isUndefined(query)) {
              query = {};
            }
            var doc = nativeLokiCollection.find(query);
            if (doc === null || _.isEmpty(doc)) {
              return resolve(null);
            }
            if (_.isArray(doc)) {
              doc = doc[0];
            }
            doc = _.assign({}, doc);
            if (_.isString(projection) && _.isObject(doc)) {
              doc = _LokiCollection__applyProjection(doc, projection);
            }
            resolve(doc);
          } catch (error) {
            reject(error);
          }
        });
      }
    }, {
      key: 'findById',
      value: function findById(id, projection) {
        var query = _LokiCollection__buildLokiIdQuery(this.idKey, id);
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
      key: 'removeWhere',
      value: function removeWhere(query) {
        var nativeLokiCollection = this.nativeLokiCollection;
        return new _Promise(function (resolve, reject) {
          try {
            query = _LokiCollection__buildLokiQuery(query);
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
        var query = _LokiCollection__buildLokiIdQuery(this.idKey, doc[this.idKey]);
        return new _Promise(function (resolve, reject) {
          try {
            var foundDoc = _.assign({}, nativeLokiCollection.findOne(query));
            if (_.isEmpty(foundDoc)) {
              throw new Error('unknown doc id:' + doc.id);
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
        var query = _LokiCollection__buildLokiIdQuery(this.idKey, doc[this.idKey]);
        return this.findOne(query).then(function (foundDoc) {
          if (_.isEmpty(foundDoc)) {
            throw new Error('unknown doc id:' + doc.id);
          }

          foundDoc = _.merge(foundDoc, doc);
          nativeLokiCollection.update(foundDoc);
          return _.assign({}, foundDoc);
        });
      }
    }]);

    return LokiCollection;
  })(jeggy.Collection);

  exports.LokiCollection = LokiCollection;

  var _LokiAdapter__populateDoc = function populateDoc(doc, fieldKey, collection) {
    var id = doc[fieldKey];
    if (_.isUndefined(id)) {
      throw new Error('Unknown field: ' + fieldKey);
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
      value: function addCollection(name, idKey) {
        var collection = undefined;
        if (name instanceof LokiCollection) {
          collection = name;
          name = collection.name;
        } else {
          if (!_.isString(name) || _.isEmpty(name)) {
            throw new Error('must provide a name when adding a collection');
          }
          var lokiCollection = this.loki.addCollection(name);
          collection = new LokiCollection(name, lokiCollection, idKey);
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
              return _LokiAdapter__populateDoc(doc, fieldKey, collection);
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