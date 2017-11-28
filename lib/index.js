'use strict';

exports.__esModule = true;

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

exports.curry = curry;
exports.init = init;
exports.addActions = addActions;
var actions = void 0,
    middleware = void 0;

function curry(fn) {
  var _this = this;

  var curryFn = function curryFn(fnArgs) {
    if (fnArgs.length >= fn.length) {
      return fn.apply(_this, fnArgs);
    }
    return function () {
      for (var _len2 = arguments.length, cArgs = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
        cArgs[_key2] = arguments[_key2];
      }

      return curryFn([].concat(fnArgs, cArgs));
    };
  };

  for (var _len = arguments.length, args = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
    args[_key - 1] = arguments[_key];
  }

  return curryFn(args);
}

function getSet(tide) {
  return curry(function (path, val) {
    tide.mutate(path, val);
  });
}

function init(tide) {
  var _actions = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

  var _middleware = arguments[2];

  var bound = fire.bind(tide);
  tide.addProp('fire', bound);
  tide.addComponentProp('fire', bound);
  actions = _actions;
  middleware = _middleware;
}

function addActions(newActions) {
  if (process.env.NODE_ENV !== 'production' && (typeof newActions === 'undefined' ? 'undefined' : _typeof(newActions)) !== 'object') {
    throw new Error('Can\'t add actions. You must provide an object.');
  }
  actions = _extends({}, actions, newActions);
}

function fire(name, data) {
  var objName = name.split('.')[0];
  var funcName = name.split('.')[1];
  if (process.env.NODE_ENV !== 'production' && (!funcName || !objName)) {
    throw new Error(name + ' does not look right. Action names has to be a path to a function, like \'objectName.functionName\'.'); // eslint-disable-line max-len
  }
  if (process.env.NODE_ENV !== 'production' && !actions[objName]) {
    throw new Error('Can\'t find action object ' + objName);
  }
  var actionsObj = isFunction(actions[objName]) ? actions[objName]() : actions[objName];
  var fireAction = getFireAction(name, objName, funcName, data, this);
  return isPromise(actionsObj) ? actionsObj.then(fireAction) : Promise.resolve(fireAction(actionsObj));
}

function getFireAction(name, objName, funcName, data, tide) {
  var get = tide.get.bind(tide);
  var set = getSet(tide).bind(tide);
  return function fireAction(obj) {
    if (process.env.NODE_ENV !== 'production' && !obj[funcName]) {
      throw new Error('Action ' + funcName + ' not found on ' + objName);
    }
    return applyMiddeware(obj[funcName], name, obj)(data, { get: get, set: set, tide: tide });
  };
}

function applyMiddeware(initialFn, name, obj) {
  return middleware ? middleware.reduce(function (fn, middle) {
    return middle(fn, name, obj);
  }, initialFn) : initialFn;
}

function isPromise(obj) {
  return typeof obj.then === 'function';
}

function isFunction(obj) {
  return typeof obj === 'function';
}
