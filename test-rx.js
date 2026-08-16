const { EventEmitter2 } = require('eventemitter2');
const { fromEvent } = require('rxjs');

const em = new EventEmitter2();
const obs = fromEvent(em, 'test');
obs.subscribe(val => console.log('Received:', val));

em.emit('test', { hello: 'world' });
