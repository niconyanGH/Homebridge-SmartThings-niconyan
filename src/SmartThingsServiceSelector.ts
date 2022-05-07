import { HomebridgeSmartThings } from './HomebridgeSmartThings';
import { PlatformAccessory } from 'homebridge';
import { SmartThingsAirPurifierService } from './SmartThingsServiceAirPurifier';

// It is a class that receives the SmartThings device type and selects the appropriate service.
export class SmartThingsServiceSelector {
  private accessoryType: string;

  constructor (
        private readonly platform: HomebridgeSmartThings,
        private readonly accessory: PlatformAccessory,
  ) {
    this.accessoryType = this.accessory.context.device.type;
    switch(this.accessoryType) {
      case 'oic.d.airpurifier': new SmartThingsAirPurifierService(this.platform, this.accessory); break;

    }
  }
}