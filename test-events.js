const { EventEmitter2 } = require('eventemitter2');
const emitter = new EventEmitter2({ wildcard: true });
emitter.on('**', function (...args) {
  console.log('Event name:', this.event);
  console.log('Args:', args);
});
emitter.emit('bank.account.created.first', { initiatorUsername: 'test' });
