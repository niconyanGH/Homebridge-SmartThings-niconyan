import { HomebridgeSmartThings } from './HomebridgeSmartThings';
import { PlatformAccessory } from 'homebridge';
import { SmartThingsAirPurifierService } from './SmartThingsServiceAirPurifier';

// SmartThings 디바이스 타입을 받아 적절한 서비스를 선택해주는 클래스입니다.
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