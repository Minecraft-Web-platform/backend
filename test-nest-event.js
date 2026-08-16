const { EventEmitter2 } = require('eventemitter2');
class Test {
  handleAllEvents(...args) {
    console.log('Args:', args);
    // Can we get the event name from somewhere?
  }
}
const test = new Test();
const emitter = new EventEmitter2({ wildcard: true });
emitter.on('**', test.handleAllEvents.bind(test));
emitter.emit('bank.account.created.first', { initiatorUsername: 'test' });
