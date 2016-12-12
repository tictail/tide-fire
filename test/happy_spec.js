import {test} from 'ava'
import {dispatch, init, addActions} from '../src'
import {Base} from 'tide'
import {spy} from 'sinon'
import {Record, Map} from 'immutable'

const tide = new Base()
const record = new Record({
  bar: Map({beer: 'singha'}),
  food: null,
})

tide.setState(record(Map()))

init(tide, {
  foo: () => new Promise((resolve) => resolve({
    bar: () => 'Beer',
  })),
  bar: {
    getBeer: () => 'Singha',
    getDrink: () => new Promise((resolve) => {
      setTimeout(() => { resolve('Margerita') }, 1)
    }),
  },
})

test('should fire action and return result', (t) => {
  return dispatch('bar.getBeer').then((res) => {
    t.is(res, 'Singha')
  })
})

test('should fire action that returns promise', (t) =>
  dispatch('bar.getDrink').then((res) => t.is(res, 'Margerita'))
)

test('should fire action on async action object', (t) =>
  dispatch('foo.bar').then((res) => t.is(res, 'Beer'))
)

test('should add actions', (t) => {
  t.plan(1)
  addActions({cool: {action: (data) => t.deepEqual(data, {foo: 'bar'})}})
  dispatch('cool.action', {foo: 'bar'})
})

test('should send data, get and set to action', (t) => {
  t.plan(3)
  addActions({test: {action: (data, get, set) => {
    t.is(typeof data, 'object', 'data should be an object')
    t.is(typeof get, 'function', 'get should be a function')
    t.is(typeof set, 'function', 'set should be a function')
  }}})
  dispatch('test.action', {foo: 'bar'})
})

test('should get data from state', (t) => {
  addActions({test: {action: (data, get, set) => {
    t.is(get(['bar', 'beer']), 'singha')
  }}})
  dispatch('test.action')
})

test('should set data on state', (t) => {
  addActions({test: {action: (data, get, set) => {
    set(['bar', 'testBeer'], 'ipa')
  }}})
  dispatch('test.action')
  t.is(tide.get(['bar', 'testBeer']), 'ipa')
})

test('setter should be curried', (t) => {
  t.plan(2)
  addActions({chicken: {curry: (data, get, set) => {
    const path = ['bar', 'food']
    const setFood = set(path)
    setFood('papadam')
    t.is('papadam', get(path))
    setFood('naan')
    t.is('naan', get(path))
  }}})
  return dispatch('chicken.curry')
})

test('should set data on state multiple times', (t) => {
  const path = ['bar', 'testDrink']
  addActions({test: {action: (data, get, set) => {
    set(path, data)
    return new Promise((resolve) => {
      setTimeout(() => { resolve(set(path, 'no more ' + data)) }, 1)
    })
  }}})
  t.is(tide.get(path), undefined, 'is undefined before')
  const retVal = dispatch('test.action', 'hotshot')
  t.is(tide.get(path), 'hotshot', 'is hotshot in the middle')
  return retVal.then(() => t.is(tide.get(path), 'no more hotshot', 'is no more after'))
})

test('should use middleware', (t) => {
  const middleSpy = spy((fn) => fn)
  const tide = new Base()
  tide.setState(record(Map()))
  init(tide, {bar: {getBeer: () => 'Singha'}}, [middleSpy])
  dispatch('bar.getBeer')
  t.true(middleSpy.calledOnce)
})
