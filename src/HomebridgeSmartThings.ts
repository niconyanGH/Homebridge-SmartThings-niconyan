import { API, DynamicPlatformPlugin, Logger, PlatformAccessory, PlatformConfig, Service, Characteristic } from 'homebridge';
import { PLATFORM_NAME, PLUGIN_NAME } from './settings';
import { SmartThingsAccessory } from './SmartThingsAccessory';
import { SmartThingsAPI } from './libs/SmartThingsApi';
import { Locale } from './locales/Locale';
import { STDevice } from './libs/SmartThingsInterface';

/*
 * This class is main constructor for this plug-in.
 * This class parse user config to discover/register accessories with Homebridge.
*/
export class HomebridgeSmartThings implements DynamicPlatformPlugin {

  public readonly Service: typeof Service = this.api.hap.Service;
  public readonly Characteristic: typeof Characteristic = this.api.hap.Characteristic;
  public STApi: SmartThingsAPI;
  public locale: Locale;

  // This is used to track restored cached accessories.
  public readonly accessories: PlatformAccessory[] = [];

  // This is used to store SmartThings devices in the AvailableDevice list.
  public devices: STDevice[];
  public token: string;
  public network_status_alarm: boolean;

  constructor(
    public readonly log: Logger,
    public readonly config: PlatformConfig,
    public readonly api: API,
  ) {

    const lang = config.language;
    this.network_status_alarm = config.network_status_alarm;
    this.token = config.private_token;
    this.locale = new Locale(lang);
    this.STApi = new SmartThingsAPI(this.token, this);
    this.devices = [];

    // Check to network alarm switch
    if(this.network_status_alarm) {
      log.info(this.locale.getMsg('platform', 9), this.locale.getMsg('isOnOff', 1));
    } else {
      log.info(this.locale.getMsg('platform', 9), this.locale.getMsg('isOnOff', 0));
    }
    
    // The platform does not start if the user has not entered a token value in config.
    if (config === undefined || config === null || this.token === undefined || this.token === null) {
      log.warn(this.locale.getMsg('error', 1));
      return;
    }

    this.log.info(this.locale.getMsg('platform', 0));
    /*
     * When this event is fired it means Homebridge has restored all cached accessories from disk.
     * Dynamic Platform plugins should only register new accessories after this event was fired,
     * in order to ensure they weren't added to homebridge already.
     * This event can also be used to start discovery of new accessories.
    */
    this.api.on('didFinishLaunching', () => {
      log.info(this.locale.getMsg('platform', 1));
      log.info(this.locale.getMsg('platform', 2));
      // run the method to discover / register user's devices as accessories
      this.discoverDevices();
    });
  }

  /*
   * This function is invoked when homebridge restores cached accessories from disk at startup.
   * It should be used to setup event handlers for characteristics and update respective values.
  */
  configureAccessory(accessory: PlatformAccessory) {
    this.log.info(this.locale.getMsg('platform', 3), accessory.displayName);

    // Add the restored accessory to the accessories cache,
    // so we can track if it has already been registered.
    this.accessories.push(accessory);
  }

  /*
   * This is method to discover / register accessories.
   * Accessories must only be registered once, previously created accessories
   * must not be registered again to prevent "duplicate UUID" errors.
  */
  async discoverDevices() {
    /*
     * Use the SmartThings API to get user's SmartThings devices.
     * The process takes place as follows:
     * 1. Recall private token stored in platformconfig.
     * 2. Use a private token to load the user's device list stored on the SmartThings server.
     * 3. Save only the devices in the AvailableDevices list.
     * 4. Save the information required for the accessory's service in the context.
    */
    this.devices = await this.STApi.getDeviceList();

    if (this.devices !== undefined) {
      this.devices.forEach(device => {
        this.log.info(this.locale.getMsg('platform', 4), device.name);
      });
    } else {
      this.log.info(this.locale.getMsg('platform', 5));
      return;
    }

    // Loop over the discovered devices and register each one if it has not already been registered.
    for (const device of this.devices) {

      /*
       * Generate a unique id for the accessory.
       * this should be generated from something globally unique, but constant,
       * In this plug-in, the device's SmartThings UUID (Universally Unique IDentifier)
      */
      const uuid = this.api.hap.uuid.generate(device['uuid']);
      const existingAccessory = this.accessories.find(accessory => accessory.UUID === uuid);

      // Verify that accessories with the same UUID have already been registered and restored.
      if (existingAccessory) {
        // the accessory already exists
        this.log.info(this.locale.getMsg('platform', 6), existingAccessory.displayName);

        // Update the accessories.context.
        existingAccessory.context.device = device;
        this.api.updatePlatformAccessories([existingAccessory]);

        // Creates a handler for restored accessories.
        new SmartThingsAccessory(this, existingAccessory);

        /*
         * Code used to delete accessories registered on the platform.
         * this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [existingAccessory]);
         * this.log.info(this.locale.getMsg('platform', 7), existingAccessory.displayName);
        */
      } else {
        // Register devices that are not yet registered among the SmartThings devices that discovered.
        this.log.info(this.locale.getMsg('platform', 8), device['name']);
        const accessory = new this.api.platformAccessory(device['name'] ? device['name'] : 'no name', uuid);

        // Save the device to accessory.context.
        // the `context` property can be used to store any data about the accessory you may need
        accessory.context.device = device;

        // create the accessory handler for the newly create accessory
        new SmartThingsAccessory(this, accessory);

        // link the accessory to your platform
        this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
      }
    }
  }
}