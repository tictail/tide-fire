# Tide Fire

## What?
A plugin for [tide](https://github.com/tictail/tide) that fire actions.

## Why?
There are a few things that are somewhat problematic with actions in tide.

First, invoking actions in tide is always synchronous. It looks something like this:
```
this.tide.bar.getBeer({type: 'Singha'})
```
This means the action object has to exist and be registered with the tide instance when you invoke it. As an application grows you might want to load action classes only when they are needed, rather then loading them all upfront, which becomes pretty tricky, since you have to be sure the action exists before you call it (or you would end up with `Cannot call function 'getBeer' of undefined`).

Second, action classes are not straightforward to test, since they rely heavily on `this`. They also have to be executed in the correct context (`this` must be the tide instance), which can lead to weird bugs if you are not careful (`Cannot call function 'mutate' of undefined`).

Tide-fire aims to solve these problems.

## How?
Tide-fire exposes two functions:
- `init`, has to be called before any actions are fired. You'd usually call this right after you have created your tide instance.
- `fire`, used to fire actions.


### init
A call to init can look something like this:
```
init(tide, {
  bar: {
    getBeer: (data) => fetch(`/beers/${data.type}`).then((res) => res.body),
    getDrink: () => new Promise((resolve) => {
      setTimeout(() => { resolve('Margerita') }, 100)
    }),
  },
  travel: () => import('./travel.js'),
})
```
Actions are organized into objects. Above, the object `bar` has two action handlers: `getBeer` and `getDrink`. In a larger application, you'd probably create a file called `bar.js` which exported functions `getBeer` and `getDrink`.

We can also pass promises or functions that return promises into the init function. This is nice if you want code-split and lazy-load some actions. In the example above, `travel.js` would contain some action handlers that we don't want in our main bundle. They would only be loaded when one of those actions are invoked.


### fire
Invoking an action with tide-fire looks like this:
```
fire('bar.getBeer', {type: 'Singha'})

```
The first argument is the action name and the second is the data that will be passed to the action handler. `fire()` returns a promise that resolves to the return value of the action handler.


### Action handlers
Tide-fire action handlers are pure functions. They can look something like this:
```
function getBeer(data, {get, set}) {
  return fetch(`/beers/${data.type}`).then((res) => set(['beers', data.type], res.body))
}
```
Action handlers will be called with two arguments:
- The first argument is `data` – whatever was sent as second argument in the `fire` call.
- The second argument is an object with the following contents:
  - `get`, gets things off the tide state. (Usage: `get(['beers', 'singha'])`)
  - `set`, sets things on the tide state. (Usage: `set(['beers', 'singha'], {taste: 'bland'})`)
  - `tide`, the tide instance

*Pro tip:* `set` is curried, so you can do `const setSinghaCount = set(['beers', 'singha', 'count'])` and later on `setSinghaCount(5)`.

### Middleware
The third argument to `init` is an optional array of middleware. These are functions that can wrap action handlers and perform tasks like logging. Middleware has to return action handlers.

Here's an example middleware that measure how long action handlers take to complete:
```
const timingMiddleware = (fn, name) => (...args) => {
    const start = new Date()
    const rv = fn(...args)
    const end = function(ret) {
      console.log(new Date() - start)
    }
    if (rv && typeof rv.then === 'function') {
      rv.then(end, end)
    } else {
      end()
    }
    return rv
  }
}
```

## Reporting issues

Issues should be filed [here on github](https://github.com/tictail/tide-fire/issues).
