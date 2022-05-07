import * as Message from './message.json';

export class Locale {

  private msg: string;
  private Message: typeof Message = Message;
  constructor(private readonly language: string) {
    this.msg = '';
  }

  getMsg(messageClassification: string, messageCode: number) {
    this.msg = this.Message[this.language][messageClassification][messageCode];
    if (this.msg === undefined || this.msg === null) {
      this.msg = this.Message[this.language]['error'][0];
    }
    return this.msg;
  }
}