import { PlatformAccessory, CharacteristicValue } from 'homebridge';
import { CapabilityReference } from '@smartthings/core-sdk';
import { HomebridgeSmartThings } from './HomebridgeSmartThings';
import * as STDevice from './libs/SmartThingsInterface';

// SmartThings air purifier service class.
export class SmartThingsAirPurifierService {
  private name: string;
  private uuid: string;
  private health: string;

  private airPurifierType: number;
  public airPurifierState: STDevice.AirPurifier;
  public airQualitySensorState: STDevice.AirQualitySensor;
  public filterMaintenaceState: STDevice.FilterMaintenance;

  private isPolling = false;
  private isUpdateValue = true;

  constructor(
        private readonly platform: HomebridgeSmartThings,
        private readonly accessory: PlatformAccessory,
  ) {
    this.name = accessory.context.device.name;
    this.uuid = accessory.context.device.uuid;
    this.health = 'OFFLINE';

    /* airPurifierType
         * 1: Cube(AX47T9360WSD)
         * 2: Smart(AX60R5080WD)
        */
    this.airPurifierType = 0;

    this.airPurifierState = {
      Switch: 0,
      AirPurifierState: 0,
      FanMode: 0,
      AutoMode: 0,
      AirQuality: 0,
      PM10: 0,
      PM2_5: 0,
    };
    this.airQualitySensorState = {
      AirQuality: 0,
      PM10: 0,
      PM2_5: 0,
      PM1_0: 0,
      odor: 0,
    };
    this.filterMaintenaceState = {
      FilterChangeIndication: 0,
      FilterLifeLevel: 0,
    };

    this.airPurifierService();
  }

  async airPurifierService() {
    // Verify that the device is connected to the network.
    this.health = await this.getHealth();
    if (this.health === 'ONLINE') {
      this.platform.log.info(this.name + ':',
        [this.platform.locale.getMsg('network', 0),
          this.platform.locale.getMsg('isNetwork', 1)]);
    }

    // Check the custom capability and classify the air purifier
    let capabilitiesList = new Array<CapabilityReference>();
    capabilitiesList = await this.getCapabilitiesList();
    const isCustomPeriodicSensing = capabilitiesList.find(capability => capability.id === 'custom.periodicSensing');
    const isCustomHepaFilter = capabilitiesList.find(capability => capability.id === 'custom.hepaFilter');
    const isFanModeSmart = await this.getFanModeList();
    this.platform.log.info(isFanModeSmart as unknown as string);
    if (isCustomPeriodicSensing && isCustomHepaFilter) {
      this.airPurifierType = 1;
    } else if (isFanModeSmart.length === 0 || isFanModeSmart.length === 5) {
      this.airPurifierType = 2;
    } else {
      this.airPurifierType = 3;
    }
    this.platform.log.info(this.name + ':',
      [this.platform.locale.getMsg('airpurifier', 0),
        'Type: ' + this.airPurifierType]);

    // Air purifier control service
    const service = this.accessory.getService(this.platform.Service.AirPurifier) ||
            this.accessory.addService(this.platform.Service.AirPurifier);
    const service2 = this.accessory.getService(this.platform.Service.AirQualitySensor) ||
            this.accessory.addService(this.platform.Service.AirQualitySensor);
    const service3 = this.accessory.getService(this.platform.Service.FilterMaintenance) ||
            this.accessory.addService(this.platform.Service.FilterMaintenance);

    service.getCharacteristic(this.platform.Characteristic.Active)
      .on('get', this.handleActiveGet.bind(this))
      .on('set', this.handleActiveSet.bind(this));
    service.getCharacteristic(this.platform.Characteristic.CurrentAirPurifierState)
      .on('get', this.handleCurrentAirPurifierStateGet.bind(this));

    if (this.airPurifierType === 1) {
      service.getCharacteristic(this.platform.Characteristic.TargetAirPurifierState)
        .on('get', this.handleType1TargetAirPurifierStateGet.bind(this))
        .on('set', this.handleType1TargetAirPurifierStateSet.bind(this));
    } else if (this.airPurifierType === 2) {
      service.getCharacteristic(this.platform.Characteristic.TargetAirPurifierState)
        .on('get', this.handleType2TargetAirPurifierStateGet.bind(this))
        .on('set', this.handleType2TargetAirPurifierStateSet.bind(this));
    }

    // Air quality sensor service
    service2.getCharacteristic(this.platform.Characteristic.AirQuality)
      .on('get', this.handleAirQualityGet.bind(this));
    service2.getCharacteristic(this.platform.Characteristic.PM10Density)
      .on('get', this.handlePM10DensityGet.bind(this));
    service2.getCharacteristic(this.platform.Characteristic.PM2_5Density)
      .on('get', this.handlePM2_5DensityGet.bind(this));


    // Air purifier hepa-filter service
    if (this.airPurifierType === 1) {
      service3.getCharacteristic(this.platform.Characteristic.FilterChangeIndication)
        .on('get', this.handleFilterChangeIndicationGet.bind(this));
      service3.getCharacteristic(this.platform.Characteristic.FilterLifeLevel)
        .on('get', this.handleFilterLifeLevelGet.bind(this));
      service3.getCharacteristic(this.platform.Characteristic.ResetFilterIndication)
        .on('set', this.handleResetFilterIndicationSet.bind(this));
    }

    // Update the status of the air purifier at regular intervals.
    setInterval(() => {
      try {
        if (this.isUpdateValue) {
          this.isPolling = true;
          if (this.health === 'ONLINE') {
            if (this.airPurifierState.Switch === 0) {
              service.updateCharacteristic(this.platform.Characteristic.Active, 0);
              service.updateCharacteristic(this.platform.Characteristic.CurrentAirPurifierState, 0);
              service.updateCharacteristic(this.platform.Characteristic.TargetAirPurifierState, 0);
            } else {
              service.updateCharacteristic(this.platform.Characteristic.Active, this.airPurifierState.Switch);
              service.updateCharacteristic(this.platform.Characteristic.CurrentAirPurifierState, this.airPurifierState.AirPurifierState);
              service.updateCharacteristic(this.platform.Characteristic.TargetAirPurifierState, this.airPurifierState.AutoMode);
              if (this.airPurifierType === 1) {
                service3.updateCharacteristic(this.platform.Characteristic.FilterChangeIndication,
                  this.filterMaintenaceState.FilterChangeIndication);
                service3.updateCharacteristic(this.platform.Characteristic.FilterLifeLevel, this.filterMaintenaceState.FilterLifeLevel);
              }
            }
            if (this.airPurifierState.Switch === 1) {
              service2.updateCharacteristic(this.platform.Characteristic.AirQuality, this.airQualitySensorState.AirQuality);
              service2.updateCharacteristic(this.platform.Characteristic.PM10Density, this.airQualitySensorState.PM10);
              service2.updateCharacteristic(this.platform.Characteristic.PM2_5Density, this.airQualitySensorState.PM2_5);
            }
          } else if (this.health === 'OFFLINE' || this.health === 'UNKNOWN') {
            service.updateCharacteristic(this.platform.Characteristic.Active, 0);
            service.updateCharacteristic(this.platform.Characteristic.CurrentAirPurifierState, 0);
            service.updateCharacteristic(this.platform.Characteristic.TargetAirPurifierState, 0);
          }
          this.isUpdateValue = false;
          this.isPolling = false;
        }
      } catch (err) {
        this.platform.log.error(this.name + ': ', this.platform.locale.getMsg('error', 4));
        return;
      }
    }, 1000);

    // Receive air purifier information from the SmartThings server at regular intervals.
    setInterval(async () => {
      try {
        const nowHealth = await this.getHealth();
        if (this.health !== nowHealth) {
          this.isUpdateValue = true;
          this.health = nowHealth;
          if (this.health === 'ONLINE') {
            this.platform.log.info(this.name + ':',
              [this.platform.locale.getMsg('network', 2)]);
          } else if (this.health === 'OFFLINE') {
            this.platform.log.warn(this.name + ':',
              [this.platform.locale.getMsg('network', 3)]);
          } else if (this.health === 'UNKNOWN') {
            this.platform.log.warn(this.name + ':',
              [this.platform.locale.getMsg('network', 4)]);
          }
        }

        if (this.health === 'ONLINE') {
          const switchState = await this.platform.STApi.getSwitch(this.uuid);
          const fanMode = await this.platform.STApi.getFanMode(this.uuid);
          const airQuality = await this.platform.STApi.getAirQuality(this.uuid);
          const airSensor: STDevice.AirQuality = await this.platform.STApi.getAirSensor(this.uuid);

          let switchValue = 0;
          switch (switchState) {
            case 'off': switchValue = 0; break;
            case 'on': switchValue = 1; break;
          }

          let airpurifierStateValue = 0;
          switch (fanMode) {
            case 'sleep': airpurifierStateValue = 0; break;
            case 'windfree': case 'low': airpurifierStateValue = 1; break;
            case 'smart': case 'max': case 'medium': case 'high': case 'auto': airpurifierStateValue = 2; break;
          }

          let targetValue = 0;
          if (this.airPurifierType === 1) {
            const targetState = await this.platform.STApi.getPeriodicSensing(this.uuid);
            switch (targetState) {
              case 'off': targetValue = 0; break;
              case 'on': targetValue = 1; break;
            }
          } else if (this.airPurifierType === 2) {
            switch (fanMode) {
              case 'auto': targetValue = 1; break;
              default: targetValue = 0; break;
            }
          }

          if (switchValue !== this.airPurifierState.Switch
                        || airpurifierStateValue !== this.airPurifierState.AirPurifierState
                        || targetValue !== this.airPurifierState.AutoMode
          ) {
            this.airPurifierState.Switch = switchValue;
            this.airPurifierState.AirPurifierState = airpurifierStateValue;
            this.airPurifierState.AutoMode = targetValue;
            this.isUpdateValue = true;
          }

          this.airQualitySensorState.AirQuality = airQuality;
          this.airQualitySensorState.PM10 = airSensor.PM10;
          this.airQualitySensorState.PM2_5 = airSensor.PM2_5;
          this.airQualitySensorState.PM1_0 = airSensor.PM1_0;
          this.airQualitySensorState.odor = airSensor.odor;

          if (this.airPurifierType === 1) {
            const filterChangeIndication = await this.platform.STApi.getHepaFilterStatus(this.uuid);
            const filterLifeLevel = await this.platform.STApi.getHepaFilterUsage(this.uuid);
            switch (filterChangeIndication) {
              case 'normal': this.filterMaintenaceState.FilterChangeIndication = 0; break;
              case 'replace': this.filterMaintenaceState.FilterChangeIndication = 1; break;
            }
            this.filterMaintenaceState.FilterLifeLevel = filterLifeLevel;
          }
        } else if(this.platform.network_status_alarm){
          if (this.health === 'OFFLINE') {
            this.isUpdateValue = true;
            this.platform.log.warn(this.name + ':',
              [this.platform.locale.getMsg('network', 0),
                this.platform.locale.getMsg('isNetwork', 0)]);
          } else if (this.health === 'UNKNOWN') {
            this.isUpdateValue = true;
            this.platform.log.warn(this.name + ':',
              [this.platform.locale.getMsg('network', 0),
                this.platform.locale.getMsg('isNetwork', 2)]);
          }
        }
      } catch (err) {
        this.platform.log.error(this.name + ':',
          [this.platform.locale.getMsg('error', 3), err]);
      }
    }, 3000);
  }

  // This is method for network status from device.
  async getHealth() {
    const health = await this.platform.STApi.getHealth(this.uuid);
    return health;
  }

  // This is method for obtaining support capability list from device.
  async getCapabilitiesList() {
    const cpList = await this.platform.STApi.getCapabilitiesList(this.uuid);
    return cpList;
  }

  // This is method for obtaining fan mode list from device.
  async getFanModeList() {
    const fmList = await this.platform.STApi.getFanModeList(this.uuid);
    return fmList;
  }

  // Handlers are created below.
  async handleActiveGet(callback) {
    try {
      const switchState = await this.platform.STApi.getSwitch(this.uuid);
      let switchValue = 0;
      if (switchState === 'on') {
        switchValue = 1;
      }
      this.platform.log.info(this.name + ':',
        [this.platform.locale.getMsg('airpurifier', 1),
          this.platform.locale.getMsg('isOnOff', switchValue)]);
      callback(null, switchValue);
    } catch (err) {
      this.platform.log.warn(this.name + ':',
        [this.platform.locale.getMsg('airpurifier', 1),
          this.platform.locale.getMsg('isCheck', 0), err]);
      callback(null, 0);
    }
  }

  handleActiveSet(switchValue: CharacteristicValue, callback) {
    if (this.health === 'ONLINE') {
      if (this.isPolling === false) {
        try {
          this.platform.log.info(this.name + ':',
            [this.platform.locale.getMsg('airpurifier', 2),
              this.platform.locale.getMsg('isOnOff', switchValue as number)]);
          if (switchValue === 0) {
            this.platform.STApi.setSwitch(this.uuid, 'off');
          } else if (switchValue === 1) {
            this.platform.STApi.setSwitch(this.uuid, 'on');
          }
        } catch (err) {
          this.platform.log.warn(this.name + ':',
            [this.platform.locale.getMsg('airpurifier', 2),
              this.platform.locale.getMsg('isCheck', 0), err]);
        }
        callback(null, switchValue);
      }
    } else if (this.health === 'OFFLINE' || this.health === 'UNKNOWN') {
      this.platform.log.warn(this.name + ':',
        [this.platform.locale.getMsg('network', 1)]);
      callback(null, 0);
    }
  }

  async handleCurrentAirPurifierStateGet(callback) {
    try {
      const fanMode = await this.platform.STApi.getFanMode(this.uuid);
      let fanValue = 0;
      switch (fanMode) {
        case 'sleep': fanValue = 0; break;
        case 'windfree': case 'low': fanValue = 1; break;
        case 'smart': case 'max': case 'medium': case 'high': case 'auto': fanValue = 2; break;
      }

      this.platform.log.info(this.name + ':',
        [this.platform.locale.getMsg('airpurifier', 3),
          this.platform.locale.getMsg('airpurifier-mode', fanValue)]);
      callback(null, fanValue);
    } catch (err) {
      this.platform.log.warn(this.name + ':',
        [this.platform.locale.getMsg('airpurifier', 3),
          this.platform.locale.getMsg('isCheck', 0), err]);
      callback(null, 0);
    }
  }

  async handleType1TargetAirPurifierStateGet(callback) {
    try {
      const targetState = await this.platform.STApi.getPeriodicSensing(this.uuid);
      let targetValue = 0;
      switch (targetState) {
        case 'off': targetValue = 0; break;
        case 'on': targetValue = 1; break;
      }
      this.platform.log.info(this.name + ':',
        [this.platform.locale.getMsg('airpurifier', 6),
          this.platform.locale.getMsg('isOnOff', targetValue)]);
      callback(null, targetValue);
    } catch (err) {
      this.platform.log.warn(this.name + ':',
        [this.platform.locale.getMsg('airpurifier', 6),
          this.platform.locale.getMsg('isCheck', 0), err]);
      callback(null, 0);
    }
  }

  handleType1TargetAirPurifierStateSet(APAutoStateValue: CharacteristicValue, callback) {
    if (this.isPolling === false) {
      try {
        if (APAutoStateValue === 0) {
          this.airPurifierState.AutoMode = APAutoStateValue;
          this.platform.log.info(this.name + ':',
            [this.platform.locale.getMsg('airpurifier', 7), this.platform.locale.getMsg('isOnOff', APAutoStateValue)]);
          this.platform.STApi.setPeriodicSensing(this.uuid, 'off', 600);
        } else if (APAutoStateValue === 1) {
          this.airPurifierState.AutoMode = APAutoStateValue;
          this.platform.log.info(this.name + ':',
            [this.platform.locale.getMsg('airpurifier', 7), this.platform.locale.getMsg('isOnOff', APAutoStateValue)]);
          this.platform.STApi.setPeriodicSensing(this.uuid, 'on', 600);
        }
      } catch (err) {
        this.platform.log.warn(this.name + ':',
          [this.platform.locale.getMsg('airpurifier', 7),
            this.platform.locale.getMsg('isCheck', 0), err]);
      }
      callback(null, APAutoStateValue);
    }
  }

  async handleType2TargetAirPurifierStateGet(callback) {
    try {
      const targetState = await this.platform.STApi.getFanMode(this.uuid);
      let targetValue = 0;

      switch (targetState) {
        case 'auto': targetValue = 1; break;
        default: targetValue = 0; break;
      }
      this.platform.log.info(this.name + ':',
        [this.platform.locale.getMsg('airpurifier', 6),
          this.platform.locale.getMsg('isOnOff', targetValue)]);
      callback(null, targetValue);
    } catch (err) {
      this.platform.log.warn(this.name + ':',
        [this.platform.locale.getMsg('airpurifier', 6),
          this.platform.locale.getMsg('isCheck', 0), err]);
      callback(null, 0);
    }
  }

  handleType2TargetAirPurifierStateSet(APAutoStateValue: CharacteristicValue, callback) {
    if (this.isPolling === false) {
      try {
        if (APAutoStateValue === 0) {
          this.airPurifierState.AutoMode = APAutoStateValue;
          this.platform.log.info(this.name + ':',
            [this.platform.locale.getMsg('airpurifier', 7), this.platform.locale.getMsg('isOnOff', APAutoStateValue)]);
          this.platform.STApi.setFanMode(this.uuid, 'low');
        } else if (APAutoStateValue === 1) {
          this.airPurifierState.AutoMode = APAutoStateValue;
          this.platform.log.info(this.name + ':',
            [this.platform.locale.getMsg('airpurifier', 7), this.platform.locale.getMsg('isOnOff', APAutoStateValue)]);
          this.platform.STApi.setFanMode(this.uuid, 'auto');
        }
      } catch (err) {
        this.platform.log.warn(this.name + ':',
          [this.platform.locale.getMsg('airpurifier', 7),
            this.platform.locale.getMsg('isCheck', 0), err]);
      }
      callback(null, APAutoStateValue);
    }
  }

  /*
     * 2021 WHO Air Quality Guidelines(AQG)
     * ┌────────────┬───────────┬───────────┬───────────┬───────────┬───────────┐
     * │  finedust  │ Very low  │    Low    │  Medium   │   High    │ Very High │
     * ├────────────┼───────────┼───────────┼───────────┼───────────┼───────────┤
     * │  PM2.5(24h)│  25       │  37.5     │  50       │  75       │  >75      │
     * ├────────────┼───────────┼───────────┼───────────┼───────────┼───────────┤
     * │  PM10(24h) │  50       │  75       │  100      │  150      │  >150     │
     * └────────────┴───────────┴───────────┴───────────┴───────────┴───────────┘
     * https://www.who.int/publications/i/item/9789240034228
     * (page19, Table 0.1. Recommended AQG levels and interim targets)
     *
     * Common Air Quality Index(CAQI)
     * ┌────────────┬───────────┬───────────┬───────────┬───────────┬───────────┐
     * │  finedust  │ Very low  │    Low    │  Medium   │   High    │ Very High │
     * ├────────────┼───────────┼───────────┼───────────┼───────────┼───────────┤
     * │  PM2.5(24h)│  0~10     │  10~20    │  20~30    │  30~60    │  >60      │
     * ├────────────┼───────────┼───────────┼───────────┼───────────┼───────────┤
     * │  PM10(24h) │  0~15     │  15~30    │  30~50    │  50~100   │  >100     │
     * └────────────┴───────────┴───────────┴───────────┴───────────┴───────────┘
     * https://www.airqualitynow.eu/download/CITEAIR-Comparing_Urban_Air_Quality_across_Borders.pdf
     * (page3, Pollutants and calculation grid for the revised CAQI hourly and daily grid (all changes in italics))
     *
     * Samsung's air purifiers comply with CAQI standards.
    */
  async handleAirQualityGet(callback) {
    try {
      const airQuality = await this.platform.STApi.getAirQuality(this.uuid);
      this.platform.log.info(this.name + ':',
        [this.platform.locale.getMsg('airSensor', 0),
          this.platform.locale.getMsg('airSensor-mode', airQuality)]);
      if (airQuality >= 1 && airQuality <= 5) {
        callback(null, airQuality);
      } else {
        callback(null, 0);
      }
    } catch (err) {
      this.platform.log.warn(this.name + ': ',
        [this.platform.locale.getMsg('airSensor', 0),
          this.platform.locale.getMsg('isCheck', 0), err]);
      callback(null, 0);
    }
  }

  handlePM10DensityGet(callback) {
    try {
      this.platform.log.info(this.name + ':',
        [this.platform.locale.getMsg('airSensor', 1),
          this.airQualitySensorState.PM10,
          'µg']);
      callback(null, this.airQualitySensorState.PM10);
    } catch (err) {
      this.platform.log.warn(this.name + ': ',
        [this.platform.locale.getMsg('airSensor', 1),
          this.platform.locale.getMsg('isCheck', 0), err]);
      callback(null, 0);
    }
  }

  handlePM2_5DensityGet(callback) {
    try {
      this.platform.log.info(this.name + ':',
        [this.platform.locale.getMsg('airSensor', 2),
          this.airQualitySensorState.PM2_5,
          'µg']);
      callback(null, this.airQualitySensorState.PM2_5);
    } catch (err) {
      this.platform.log.warn(this.name + ': ',
        [this.platform.locale.getMsg('airSensor', 2),
          this.platform.locale.getMsg('isCheck', 0), err]);
      callback(null, 0);
    }
  }

  async handleFilterChangeIndicationGet(callback) {
    try {
      const filterStatus = await this.platform.STApi.getHepaFilterStatus(this.uuid);
      let filterValue = 0;
      switch (filterStatus) {
        case 'normal': filterValue = 0; break;
        case 'replace': filterValue = 1; break;
      }
      this.platform.log.info(this.name + ':',
        [this.platform.locale.getMsg('filterMaintenance', 0),
          this.platform.locale.getMsg('isOnOff', filterValue)]);
      callback(null, filterValue);
    } catch (err) {
      this.platform.log.warn(this.name + ': ',
        [this.platform.locale.getMsg('filterMaintenance', 0),
          this.platform.locale.getMsg('isCheck', 0), err]);
      callback(null, 0);
    }
  }

  async handleFilterLifeLevelGet(callback) {
    try {
      const filterUsage = await this.platform.STApi.getHepaFilterUsage(this.uuid);
      this.platform.log.info(this.name + ':',
        [this.platform.locale.getMsg('filterMaintenance', 1), filterUsage]);
      callback(null, filterUsage);
    } catch (err) {
      this.platform.log.warn(this.name + ': ',
        [this.platform.locale.getMsg('filterMaintenance', 1),
          this.platform.locale.getMsg('isCheck', 0), err]);
      callback(null, 0);
    }
  }

  handleResetFilterIndicationSet(FIReset: CharacteristicValue, callback) {
    try {
      this.platform.STApi.setHepaFilterReset(this.uuid);
      if (this.isPolling === false) {
        this.platform.log.info(this.name + ':',
          [this.platform.locale.getMsg('filterMaintenance', 2),
            this.platform.locale.getMsg('isCheck', FIReset as number)]);
      }
    } catch (err) {
      this.platform.log.warn(this.name + ': ',
        [this.platform.locale.getMsg('filterMaintenance', 2),
          this.platform.locale.getMsg('isCheck', 0), err]);
    }
    callback(null, FIReset);
  }
}
