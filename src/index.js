let tide, actions, get, set, middleware

function curry(fn, ...args) {
  const curryFn = (fnArgs) => {
    if (fnArgs.length >= fn.length) {
      return fn.apply(this, fnArgs)
    }
    return (...cArgs) => curryFn([...fnArgs, ...cArgs])
  }
  return curryFn(args)
}

function getSet(tide) {
  return curry(function(path, val) {
    tide.setState(tide.getState().setIn(path, val))
  })
}

export function init(_tide, _actions = {}, _middleware) {
  tide = _tide
  actions = _actions
  middleware = _middleware
  if (process.env.NODE_ENV !== 'production' && !(typeof tide === 'object')) {
    throw new Error('You must provide a tide instance')
  }
  get = tide.get.bind(tide)
  set = getSet(tide).bind(tide)
}

export function addActions(newActions) {
  if (process.env.NODE_ENV !== 'production' && (typeof newActions !== 'object')) {
    throw new Error('Can\'t add actions. You must provide an object.')
  }
  actions = {...actions, ...newActions}
}

export function fire(name, data) {
  const objName = name.split('.')[0]
  const funcName = name.split('.')[1]
  if (process.env.NODE_ENV !== 'production' && (!funcName || !objName)) {
    throw new Error(`${name} does not look right. Action names has to be a path to a function, like 'objectName.functionName'.`) // eslint-disable-line max-len
  }
  if (process.env.NODE_ENV !== 'production' && !actions[objName]) {
    throw new Error(`Can\'t find action object ${objName}`)
  }
  const actionsObj = isFunction(actions[objName]) ? actions[objName]() : actions[objName]
  const rv = isPromise(actionsObj) ?
    actionsObj.then(getFireAction(name, objName, funcName, data)) :
    Promise.resolve(getFireAction(name, objName, funcName, data)(actionsObj))
  return rv.catch(getErrorHandler(name))
}

function getFireAction(name, objName, funcName, data) {
  return function fireAction(obj) {
    if (process.env.NODE_ENV !== 'production' && !obj[funcName]) {
      throw new Error(`Action ${funcName} not found on ${objName}`)
    }
    return applyMiddeware(obj[funcName], name)(data, get, set, tide)
  }
}

function applyMiddeware(initialFn, name) {
  return middleware ?
    middleware.reduce((fn, middle) => middle(fn, name), initialFn) :
    initialFn
}

function getErrorHandler(name) {
  return function handleDispatchError(err) {
    const e = new Error(err)
    e.message = `Error in fire(${name}): ${err.message}`
    throw e
  }
}

function isPromise(obj) {
  return typeof obj.then === 'function'
}

function isFunction(obj) {
  return typeof obj === 'function'
}
