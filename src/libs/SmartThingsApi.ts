import { SmartThingsClient, BearerTokenAuthenticator, CapabilityReference } from '@smartthings/core-sdk';
import * as STDevice from './SmartThingsInterface';
import AvailableDevices from './AvailableDevices.json';
import { HomebridgeSmartThings } from '../HomebridgeSmartThings';

// This class recevies API token, and requests and responds to SmartThings API Server.
export class SmartThingsAPI {
  public client: SmartThingsClient;
  private private_Token: string;
  public devices: STDevice.STDevice[];

  constructor(privateToken: string,
    readonly platform: HomebridgeSmartThings) {
    this.private_Token = privateToken;
    this.devices = [];
    this.client = new SmartThingsClient(new BearerTokenAuthenticator(this.private_Token));
  }

  // DeviceList: [{uuid, name, type, manufacturer, model, serialNumber, firmwareVersion}, ···]
  async getDeviceList(): Promise<STDevice.STDevice[]> {
    await this.client.devices.list()
      .then(Devices => {
        try {
          if (Devices !== null || Devices !== undefined) {
            Devices.forEach(Device => {
              AvailableDevices.list.forEach(AvailableDevice => {
                let ocfType = Device['ocfDeviceType'];
                if (AvailableDevice === ocfType) {
                  let device: STDevice.STDevice = {
                    uuid: '',
                    name: '',
                    type: '',
                    manufacturer: '',
                    model: '',
                    serialNumber: '',
                  };
                  const ocf = Device['ocf'] ? Device['ocf'] : 'not ocf';
                  const modelNumber = ocf ? ocf['modelNumber'] : 'not ocf';
                  device.uuid = Device['deviceId'];
                  device.name = Device['label'];
                  device.type = ocfType;
                  device.manufacturer = Device['manufacturerName'];
                  device.model = modelNumber;
                  this.platform.log.info('name: ' + device.name + ' | uuid: ' + device.uuid);
                  this.devices.push(device);
                }
              })
            })
          } else {
            return;
          }
        } catch (err) {
          return err;
        }
      });
    return this.devices;
  }

  // ONLINE, OFFLINE, UNKNOWN
  async getHealth(device_UUID: string): Promise<string> {
    let health = '';
    await this.client.devices.getHealth(device_UUID)
      .then(res => {
        health = res.state;
      })
    return health;
  }

  // Capabilities list: {id: capability_name, version: number}
  async getCapabilitiesList(device_UUID: string): Promise<Array<CapabilityReference>> {
    let capabilitiesList = new Array<CapabilityReference>();
    await this.client.devices.get(device_UUID)
      .then(res => {
        const component = res['components'] ? res['components'] : 'no Capabilites';
        capabilitiesList = component[0]['capabilities'] as Array<CapabilityReference>;
      });
    return capabilitiesList;
  }

  // Cube FanMode: sleep, windfree, smart, max
  // Smart FanMode: sleep, low, medium, high, auto
  async getFanModeList(device_UUID: string): Promise<Array<string>> {
    let fanModeList = new Array<string>();
    await this.client.devices.getCapabilityStatus(device_UUID, 'main', 'airConditionerFanMode')
      .then(res => {
        const supportFanModeList = res.supportedAcFanModes.value as Array<string>;
        if(supportFanModeList != undefined){
          supportFanModeList.forEach(supprotFanMode => {
            fanModeList.push(supprotFanMode);
          })
        }
      });
    return fanModeList;
  }

  // SwitchState: On/Off
  async getSwitch(device_UUID: string): Promise<string> {
    let switchValue = '';
    await this.client.devices.getCapabilityStatus(device_UUID, 'main', 'switch')
      .then(res => {
        switchValue = res['switch']['value'] as string;
      });
    return switchValue;
  }

  setSwitch(device_UUID: string, device_Power: string) {
    const command = {
      capability: 'switch',
      command: device_Power,
    };
    this.client.devices.executeCommand(device_UUID, command);
  }

  async getFanMode(device_UUID: string): Promise<string> {
    let fanMode = '';
    await this.client.devices.getCapabilityStatus(device_UUID, 'main', 'airConditionerFanMode')
      .then(res => {
        fanMode = res['fanMode']['value'] as string;
      });
    return fanMode;
  }

  setFanMode(device_UUID: string, device_FanMode: string) {
    const command = {
      capability: 'airConditionerFanMode',
      command: 'setFanMode',
      arguments: [device_FanMode],
    };
    this.client.devices.executeCommand(device_UUID, command);
  }

  // PeriodicSensing: on/off | DefaultInterval: 600
  async getPeriodicSensing(device_UUID: string): Promise<string> {
    let periodicSensing = '';
    await this.client.devices.getCapabilityStatus(device_UUID, 'main', 'custom.periodicSensing')
      .then(res => {
        periodicSensing = res['periodicSensing']['value'] as string;
      });
    return periodicSensing;
  }

  setPeriodicSensing(device_UUID: string, device_PS: string, device_PS_Interval: number) {
    const command = {
      capability: 'custom.periodicSensing',
      command: 'setPeriodicSensing',
      arguments: [device_PS, device_PS_Interval],
    };
    this.client.devices.executeCommand(device_UUID, command);
  }

  // Air quality: number(1(Excellent) ~ 4(Inferior))
  async getAirQuality(device_UUID: string): Promise<number> {
    let airQuality = 0;
    await this.client.devices.getCapabilityStatus(device_UUID, 'main', 'airQualitySensor')
      .then(res => {
        airQuality = res['airQuality']['value'] as number;
      });
    return airQuality;
  }

  // PM10: number, PM2.5: number, PM1.0: number, odor: number
  async getAirSensor(device_UUID: string): Promise<STDevice.AirQuality> {
    const airQuality: STDevice.AirQuality = {
      'PM10': 0,
      'PM2_5': 0,
      'PM1_0': 0,
      'odor': 0,
    };
    // PM10, PM2.5,
    await this.client.devices.getCapabilityStatus(device_UUID, 'main', 'dustSensor')
      .then(res => {
        airQuality.PM10 = res.dustLevel.value as number;
        airQuality.PM2_5 = res.fineDustLevel.value as number;
      });
    // PM1.0
    await this.client.devices.getCapabilityStatus(device_UUID, 'main', 'veryFineDustSensor')
      .then(res => {
        airQuality.PM1_0 = res.veryFineDustLevel.value as number;
      });
    // odor
    await this.client.devices.getCapabilityStatus(device_UUID, 'main', 'odorSensor')
      .then(res => {
        airQuality.odor = res.odorLevel.value as number;
      });
    return airQuality;
  }

  // Hepa-filter status: normal/replace
  async getHepaFilterStatus(device_UUID: string): Promise<string> {
    let filterStatus = '';
    await this.client.devices.getCapabilityStatus(device_UUID, 'main', 'custom.hepaFilter')
      .then(res => {
        filterStatus = res['hepaFilterStatus']['value'] as string;
      });
    return filterStatus;
  }

  // Hepa-filter usage: 0~100
  async getHepaFilterUsage(device_UUID: string): Promise<number> {
    let filterUsage = 0;
    await this.client.devices.getCapabilityStatus(device_UUID, 'main', 'custom.hepaFilter')
      .then(res => {
        filterUsage = res['hepaFilterUsage']['value'] as number;
      });

    return filterUsage;
  }

  // Hepa-filter reset
  setHepaFilterReset(device_UUID: string) {
    const command = {
      capability: 'custom.hepaFilter',
      command: 'resetHepaFilter',
      arguments: [],
    };
    this.client.devices.executeCommand(device_UUID, command);
  }
}