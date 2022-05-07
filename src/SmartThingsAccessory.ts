import { PlatformAccessory} from 'homebridge';
import { HomebridgeSmartThings } from './HomebridgeSmartThings';
import { SmartThingsServiceSelector } from './SmartThingsServiceSelector';

/*
 * 이 클래스는 HomebridgeSmartThings(플랫폼)가 등록하는 각 액세서리에 대해 인스턴스를 생성합니다.
 * 각 액세서리에 따라 다양한 복수의 서비스를 제공할 수 있습니다.
*/
export class SmartThingsAccessory {
  public name: string;
  public uuid: string;
  public type: string;
  public manufacturer: string;
  public model: string;
  public serialNumber: string;
  public firmwareVersion: string;

  private isPolling = false;
  private isUpdateValue = false;
  constructor(
    private readonly platform: HomebridgeSmartThings,
    private readonly accessory: PlatformAccessory,
  ) {

    // 핸들링 할 값을 초기화합니다.
    this.name = accessory.context.device.name;
    this.uuid = accessory.context.device.uuid;
    this.type = accessory.context.device.type;
    this.manufacturer = accessory.context.device.manufacturer;
    this.model = accessory.context.device.model;
    this.serialNumber = accessory.context.device.serialNumber;
    this.firmwareVersion = accessory.context.device.firmwareVersion;

    // 액세서리 정보를 초기화합니다.
    this.platform.log.info(this.platform.locale.getMsg('accessory', 0), this.name);
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, this.manufacturer)
      .setCharacteristic(this.platform.Characteristic.Model, this.model)
      .setCharacteristic(this.platform.Characteristic.SerialNumber, this.uuid)
      .setCharacteristic(this.platform.Characteristic.FirmwareRevision, this.firmwareVersion);

    // 액세서리 타입을 체크해 제공할 서비스를 설정합니다.
    new SmartThingsServiceSelector(this.platform, this.accessory);
  }
}