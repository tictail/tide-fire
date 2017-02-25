import {test} from 'ava'
import {init, addActions} from '../src'
import {Tide} from 'tide'
import {spy} from 'sinon'
import {Record, Map} from 'immutable'

const getTide = () => {
  const tide = new Tide()
  tide.setState(record(Map()))
  return tide
}
const record = new Record({
  bar: Map({beer: 'singha'}),
  food: null,
  weather: null,
})

const actions = {
  multi: {
    setWeather: (data, {set}) => {
      set(['weather'], data)
    },
  },
  foo: () => new Promise((resolve) => resolve({
    bar: () => 'Beer',
  })),
  bar: {
    getBeer: () => 'Singha',
    getDrink: () => new Promise((resolve) => {
      setTimeout(() => { resolve('Margerita') }, 1)
    }),
  },
}

const tide = getTide()
init(tide, actions)

test('should fire action and return result', (t) => {
  return tide.fire('bar.getBeer').then((res) => {
    t.is(res, 'Singha')
  })
})

test('should handle multiple tide instances', (t) => {
  const newTide = getTide()
  init(newTide, actions)
  t.is(tide.state.get('weather'), null)
  t.is(newTide.state.get('weather'), null)
  return newTide.fire('multi.setWeather', 'clear').then((res) => {
    t.is(tide.state.get('weather'), null)
    t.is(newTide.state.get('weather'), 'clear')
  })
})

test('should fire action that returns promise', (t) =>
  tide.fire('bar.getDrink').then((res) => t.is(res, 'Margerita'))
)

test('should fire action on async action object', (t) =>
  tide.fire('foo.bar').then((res) => t.is(res, 'Beer'))
)

test('should add actions', (t) => {
  t.plan(1)
  addActions({cool: {action: (data) => t.deepEqual(data, {foo: 'bar'})}})
  tide.fire('cool.action', {foo: 'bar'})
})

test('should send data, get and set to action', (t) => {
  t.plan(3)
  addActions({test: {action: (data, {get, set}) => {
    t.is(typeof data, 'object', 'data should be an object')
    t.is(typeof get, 'function', 'get should be a function')
    t.is(typeof set, 'function', 'set should be a function')
  }}})
  tide.fire('test.action', {foo: 'bar'})
})

test('should get data from state', (t) => {
  addActions({test: {action: (data, {get, set}) => {
    t.is(get(['bar', 'beer']), 'singha')
  }}})
  tide.fire('test.action')
})

test('should set data on state', (t) => {
  addActions({test: {action: (data, {get, set}) => {
    set(['bar', 'testBeer'], 'ipa')
  }}})
  tide.fire('test.action')
  t.is(tide.get(['bar', 'testBeer']), 'ipa')
})

test('setter should be curried', (t) => {
  t.plan(2)
  addActions({chicken: {curry: (data, {get, set}) => {
    const path = ['bar', 'food']
    const setFood = set(path)
    setFood('papadam')
    t.is('papadam', get(path))
    setFood('naan')
    t.is('naan', get(path))
  }}})
  return tide.fire('chicken.curry')
})

test('should set data on state multiple times', (t) => {
  const path = ['bar', 'testDrink']
  addActions({test: {action: (data, {get, set}) => {
    set(path, data)
    return new Promise((resolve) => {
      setTimeout(() => { resolve(set(path, 'no more ' + data)) }, 1)
    })
  }}})
  t.is(tide.get(path), undefined, 'is undefined before')
  const retVal = tide.fire('test.action', 'hotshot')
  t.is(tide.get(path), 'hotshot', 'is hotshot in the middle')
  return retVal.then(() => t.is(tide.get(path), 'no more hotshot', 'is no more after'))
})

test('should use middleware', (t) => {
  const middleSpy = spy((fn) => fn)
  const tide = new Tide()
  tide.setState(record(Map()))
  init(tide, {bar: {getBeer: () => 'Singha'}}, [middleSpy])
  tide.fire('bar.getBeer')
  t.true(middleSpy.calledOnce)
})
