import { PlatformAccessory} from 'homebridge';
import { HomebridgeSmartThings } from './HomebridgeSmartThings';
import { SmartThingsServiceSelector } from './SmartThingsServiceSelector';

/*
 * This class creates an instance for respective accessory registered by the platform.
 * Depending on the accessories, offer a variety of services.
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

    // Initializes the accessory's basic data
    this.name = accessory.context.device.name;
    this.uuid = accessory.context.device.uuid;
    this.type = accessory.context.device.type;
    this.manufacturer = accessory.context.device.manufacturer;
    this.model = accessory.context.device.model;
    this.serialNumber = accessory.context.device.serialNumber;
    this.firmwareVersion = accessory.context.device.firmwareVersion;

    this.platform.log.info(this.platform.locale.getMsg('accessory', 0), this.name);
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, this.manufacturer)
      .setCharacteristic(this.platform.Characteristic.Model, this.model)
      .setCharacteristic(this.platform.Characteristic.SerialNumber, this.uuid)
      .setCharacteristic(this.platform.Characteristic.FirmwareRevision, this.firmwareVersion);

    // Check the accessory type and set the service to be provided.
    new SmartThingsServiceSelector(this.platform, this.accessory);
  }
}