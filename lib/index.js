'use strict';

exports.__esModule = true;

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

exports.init = init;
exports.addActions = addActions;
exports.fire = fire;
var tide = void 0,
    actions = void 0,
    get = void 0,
    set = void 0,
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

function init(_tide) {
  var _actions = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

  var _middleware = arguments[2];

  tide = _tide;
  actions = _actions;
  middleware = _middleware;
  if (process.env.NODE_ENV !== 'production' && !((typeof tide === 'undefined' ? 'undefined' : _typeof(tide)) === 'object')) {
    throw new Error('You must provide a tide instance');
  }
  get = tide.get.bind(tide);
  set = getSet(tide).bind(tide);
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
  var fireAction = getFireAction(name, objName, funcName, data);
  var rv = isPromise(actionsObj) ? actionsObj.then(fireAction) : Promise.resolve(fireAction(actionsObj));
  return rv.catch(getErrorHandler(name));
}

function getFireAction(name, objName, funcName, data) {
  return function fireAction(obj) {
    if (process.env.NODE_ENV !== 'production' && !obj[funcName]) {
      throw new Error('Action ' + funcName + ' not found on ' + objName);
    }
    return applyMiddeware(obj[funcName], name)(data, get, set, tide);
  };
}

function applyMiddeware(initialFn, name) {
  return middleware ? middleware.reduce(function (fn, middle) {
    return middle(fn, name);
  }, initialFn) : initialFn;
}

function getErrorHandler(name) {
  return function handleDispatchError(err) {
    var e = new Error(err);
    e.message = 'Error in fire(' + name + '): ' + err.message;
    throw e;
  };
}

function isPromise(obj) {
  return typeof obj.then === 'function';
}

function isFunction(obj) {
  return typeof obj === 'function';
}
