## Email module

This module has only 1 service - EmailService. This service you can import to other modules.
You can create your custom Templates
Template - class instance who implements the MailTemplateStrategy.
You can provide to the constructor of your template as much params as you need.

## Using

```ts
const emailService = new EmailService();
const yourCustomParam = 'John';
const template = new YourCustomTemplate(yourCustomParam);
const template2 = new YourCustomTemplateWithoutParams();

emailService.send('hehe@mail.world', template);
emailService.send('hehe@mail.world', template2);
```

You prepare your template for using during creation an instance of your template.
Then you provide the instance as second arg for the **send** method of emailService.
