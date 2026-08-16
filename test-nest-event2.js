const { EventEmitter2 } = require('eventemitter2');
class Test {
  constructor(emitter) {
    this.emitter = emitter;
  }
  onModuleInit() {
    const self = this;
    this.emitter.on('**', function (payload) {
      console.log('Event name:', this.event);
      console.log('Payload:', payload);
    });
  }
}
const emitter = new EventEmitter2({ wildcard: true });
const test = new Test(emitter);
test.onModuleInit();
emitter.emit('bank.account.created.first', { initiatorUsername: 'test' });
