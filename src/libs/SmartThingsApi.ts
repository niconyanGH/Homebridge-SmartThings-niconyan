import { SmartThingsClient, BearerTokenAuthenticator, CapabilityReference} from '@smartthings/core-sdk';
import * as STDevice from './SmartThingsInterface';
import AvailableDevices from './AvailableDevices.json';
import { HomebridgeSmartThings } from '../HomebridgeSmartThings';

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

  async getDeviceList(): Promise<STDevice.STDevice[]> {
    const device: STDevice.STDevice = {
      uuid: '',
      name: '',
      type: '',
      manufacturer: '',
      model: '',
      serialNumber: '',
      firmwareVersion: '',
    };

    await this.client.devices.list().then(Devices => {
      try {
        if (Devices !== null || Devices !== undefined) {
          for (let i = 0; i < Devices.length; i++) {
            for (let j = 0; j < AvailableDevices.list.length; j++) {
              const ocfType = Devices[i]['ocfDeviceType'];
              if (AvailableDevices.list[j] === ocfType) {
                const ocf = Devices[i]['ocf'] ? Devices[i]['ocf'] : 'not ocf';
                const modelNumber = ocf ? ocf['modelNumber'] : 'not ocf';
                const firmwareVersion = ocf ? ocf['specVersion'] : 'not ocf';
                device.uuid = Devices[i]['deviceId'];
                device.name = Devices[i]['label'];
                device.type = ocfType;
                device.manufacturer = Devices[i]['manufacturerName'];
                device.model = modelNumber;
                device.firmwareVersion = firmwareVersion;
                this.devices.push(device);
              }
            }
          }
        } else {
          return;
        }
      } catch (err) {
        return err;
      }
    });
    return this.devices;
  }

  async getCapabilitiesList(device_UUID: string): Promise<Array<CapabilityReference>> {
    let capabilitiesList = new Array<CapabilityReference>();
    await this.client.devices.get(device_UUID).then(res => {
        const component = res['components'] ? res['components'] : 'no Capabilites';
        capabilitiesList = component[0]['capabilities'] as Array<CapabilityReference>;
      });
    return capabilitiesList;
  }

  // SwitchState: On/Off
  async getSwitch(device_UUID: string): Promise<string> {
    let switchValue= '';
    await this.client.devices.getCapabilityStatus(device_UUID, 'main', 'switch').then(res => {
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

  // FanMode: smart, max, windfree, sleep
  async getFanMode(device_UUID: string): Promise<string> {
    let fanMode = '';
    await this.client.devices.getCapabilityStatus(device_UUID, 'main', 'airConditionerFanMode').then(res => {
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
    await this.client.devices.getCapabilityStatus(device_UUID, 'main', 'custom.periodicSensing').then(res => {
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

  // 공기질: 1(매우 좋음) ~ 4(매우 나쁨)
  async getAirQuality(device_UUID: string): Promise<number> {
    let airQuality= 0;
    await this.client.devices.getCapabilityStatus(device_UUID, 'main', 'airQualitySensor').then(res => {
      airQuality = res['airQuality']['value'] as number;
    });
    return airQuality;
  }

  // PM10: number, PM2.5: number, PM1.0: number, odor: number
  async getAirSensor(device_UUID: string): Promise<STDevice.AirQuality> {
    const airQuality: STDevice.AirQuality = {
      'PM10':0,
      'PM2_5':0,
      'PM1_0':0,
      'odor':0,
    };
    // PM10, PM2.5,
    await this.client.devices.getCapabilityStatus(device_UUID, 'main', 'dustSensor').then(res => {
      airQuality.PM10 = res.dustLevel.value as number;
      airQuality.PM2_5 = res.fineDustLevel.value as number;
    });
    // PM1.0
    await this.client.devices.getCapabilityStatus(device_UUID, 'main', 'veryFineDustSensor').then(res => {
      airQuality.PM1_0 = res.veryFineDustLevel.value as number;
    });
    // odor
    await this.client.devices.getCapabilityStatus(device_UUID, 'main', 'odorSensor').then(res => {
      airQuality.odor = res.odorLevel.value as number;
    });
    return airQuality;
  }

  

  // 헤파필터상태: normal/replace
  async getHepaFilterStatus(device_UUID: string): Promise<string> {
    let filterStatus = '';
    await this.client.devices.getCapabilityStatus(device_UUID, 'main', 'custom.hepaFilter').then(res => {
      filterStatus = res['hepaFilterStatus']['value'] as string;
    });
    return filterStatus;
  }

  // 헤파필터 남은 사용량: 0~100
  async getHepaFilterUsage(device_UUID: string): Promise<number> {
    let filterUsage = 0;
    await this.client.devices.getCapabilityStatus(device_UUID, 'main', 'custom.hepaFilter').then(res => {
      filterUsage = res['hepaFilterUsage']['value'] as number;
    });

    return filterUsage;
  }

  // 헤파필터 초기화
  setHepaFilterReset(device_UUID: string) {
    const command = {
      capability: 'custom.hepaFilter',
      command: 'resetHepaFilter',
      arguments: [],
    };
    this.client.devices.executeCommand(device_UUID, command);
  }
}