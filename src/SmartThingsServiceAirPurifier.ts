import { PlatformAccessory, CharacteristicValue } from 'homebridge';
import { CapabilityReference } from '@smartthings/core-sdk';
import { HomebridgeSmartThings } from './HomebridgeSmartThings';
import * as STDevice from './libs/SmartThingsInterface';

// SmartThings 공기청정기 서비스 클래스입니다.
export class SmartThingsAirPurifierService {
  private name: string;
  private uuid: string;

  private airPurifierType: number;
  public airPurifierState: STDevice.AirPurifier;
  public airQualitySensorState: STDevice.AirQualitySensor;
  public filterMaintenaceState: STDevice.FilterMaintenance;

  private isPolling = false;
  private isUpdateValue = false;

  constructor(
        private readonly platform: HomebridgeSmartThings,
        private readonly accessory: PlatformAccessory,
  ) {
    this.name = accessory.context.device.name;
    this.uuid = accessory.context.device.uuid;

    this.airPurifierType = 0;
    this.airPurifierState = {
      Switch: 0,
      AirPurifierState: 0,
      FanMode: 0,
      AutoMode: 0,
      AirQuality: 1,
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
    // 커스텀 기능(custom capability) 체크 & 공기청정기 서비스 지원 구분
    let capabilitiesList = new Array<CapabilityReference>();
    capabilitiesList = await this.getCapabilitiesList();
    this.platform.log.info(this.name + ': ', capabilitiesList);
    const isCustomPeriodicSensing = capabilitiesList.find(capability => capability.id === 'custom.periodicSensing');
    const isCustomHepaFilter = capabilitiesList.find(capability => capability.id === 'custom.hepaFilter');
    if (isCustomPeriodicSensing && isCustomHepaFilter) {
      this.airPurifierType = 1;
    } else if (isCustomPeriodicSensing) {
      this.airPurifierType = 2;
    } else if (isCustomHepaFilter) {
      this.airPurifierType = 3;
    } else {
      this.airPurifierType = 4;
    }
    this.platform.log.info(this.name + ':',
      [this.platform.locale.getMsg('airpurifier', 0),
        'Type: ' + this.airPurifierType]);

    // 공기청정기 제어 서비스
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
    service.getCharacteristic(this.platform.Characteristic.RotationSpeed)
      .on('get', this.handleRotationSpeedGet.bind(this))
      .on('set', this.handleRotationSpeedSet.bind(this));

    if (this.airPurifierType === 1 || this.airPurifierType === 2) {
      service.getCharacteristic(this.platform.Characteristic.TargetAirPurifierState)
        .on('get', this.handleTargetAirPurifierStateGet.bind(this))
        .on('set', this.handleTargetAirPurifierStateSet.bind(this));
    }

    // 공기질 센서 서비스
    service2.getCharacteristic(this.platform.Characteristic.AirQuality)
      .on('get', this.handleAirQualityGet.bind(this));
    service2.getCharacteristic(this.platform.Characteristic.PM10Density)
      .on('get', this.handlePM10DensityGet.bind(this));
    service2.getCharacteristic(this.platform.Characteristic.PM2_5Density)
      .on('get', this.handlePM2_5DensityGet.bind(this));


    // 공기청정기 헤파 필터 교체지시등, 수명, 리셋 서비스
    if (this.airPurifierType === 1 || this.airPurifierType === 3) {
      service3.getCharacteristic(this.platform.Characteristic.FilterChangeIndication)
        .on('get', this.handleFilterChangeIndicationGet.bind(this));
      service3.getCharacteristic(this.platform.Characteristic.FilterLifeLevel)
        .on('get', this.handleFilterLifeLevelGet.bind(this));
      service3.getCharacteristic(this.platform.Characteristic.ResetFilterIndication)
        .on('set', this.handleResetFilterIndicationSet.bind(this));
    }

    // 일정시간마다 공기청정기의 상태를 갱신합니다.
    setInterval(() => {
      try {
        if (this.isUpdateValue) {
          this.isPolling = true;
          if (this.airPurifierState.Switch === 0) {
            service.updateCharacteristic(this.platform.Characteristic.Active, this.airPurifierState.Switch);
          } else if (this.airPurifierState.Switch === 1) {
            service.updateCharacteristic(this.platform.Characteristic.Active, this.airPurifierState.Switch);
            service.updateCharacteristic(this.platform.Characteristic.CurrentAirPurifierState, this.airPurifierState.AirPurifierState);
            service.updateCharacteristic(this.platform.Characteristic.RotationSpeed, this.airPurifierState.FanMode);
            if (this.airPurifierType === 1 || this.airPurifierType === 2) {
              service.updateCharacteristic(this.platform.Characteristic.TargetAirPurifierState, this.airPurifierState.AutoMode);
            }
            if (this.airPurifierType === 1 || this.airPurifierType === 3) {
              service3.updateCharacteristic(this.platform.Characteristic.FilterChangeIndication,
                this.filterMaintenaceState.FilterChangeIndication);
              service3.updateCharacteristic(this.platform.Characteristic.FilterLifeLevel, this.filterMaintenaceState.FilterLifeLevel);
            }
          }
          this.isUpdateValue = false;
          this.isPolling = false;
        }
        if (this.airPurifierState.Switch === 1) {
          service2.updateCharacteristic(this.platform.Characteristic.AirQuality, this.airQualitySensorState.AirQuality);
          service2.updateCharacteristic(this.platform.Characteristic.PM10Density, this.airQualitySensorState.PM10);
          service2.updateCharacteristic(this.platform.Characteristic.PM2_5Density, this.airQualitySensorState.PM2_5);
        }
      } catch (err) {
        this.platform.log.error(this.name + ': ', this.platform.locale.getMsg('error', 4));
        return;
      }
    }, 1000);

    // 일정시간마다 SmartThings서버에서 공기청정기의 정보를 받아옵니다.
    setInterval(async () => {
      try {
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
          case 'windfree': airpurifierStateValue = 1; break;
          case 'smart': case 'max': airpurifierStateValue = 2; break;
        }

        let fanModeString = '';
        let fanModeValue = 0;
        if (this.airPurifierState.FanMode <= 15) {
          fanModeString = 'sleep';
          fanModeValue = 5;
        } else if (this.airPurifierState.FanMode > 15 && this.airPurifierState.FanMode <= 50) {
          fanModeString = 'windfree';
          fanModeValue = 25;
        } else if (this.airPurifierState.FanMode > 50 && this.airPurifierState.FanMode <= 85) {
          fanModeString = 'smart';
          fanModeValue = 75;
        } else {
          fanModeString = 'max';
          fanModeValue = 95;
        }

        let targetValue = 0;
        if (this.airPurifierType === 1 || this.airPurifierType === 2) {
          const targetState = await this.platform.STApi.getPeriodicSensing(this.uuid);
          switch (targetState) {
            case 'off': targetValue = 0; break;
            case 'on': targetValue = 1; break;
          }
        }

        if (switchValue !== this.airPurifierState.Switch
                    || airpurifierStateValue !== this.airPurifierState.AirPurifierState
                    || fanModeString !== fanMode
                    || targetValue !== this.airPurifierState.AutoMode
        ) {
          this.airPurifierState.Switch = switchValue;
          this.airPurifierState.AirPurifierState = airpurifierStateValue;
          this.airPurifierState.FanMode = fanModeValue;
          this.airPurifierState.AutoMode = targetValue;
          this.isUpdateValue = true;
        }

        this.airQualitySensorState.AirQuality = airQuality;
        this.airQualitySensorState.PM10 = airSensor.PM10;
        this.airQualitySensorState.PM2_5 = airSensor.PM2_5;
        this.airQualitySensorState.PM1_0 = airSensor.PM1_0;
        this.airQualitySensorState.odor = airSensor.odor;

        if (this.airPurifierType === 1 || this.airPurifierType === 3) {
          const filterChangeIndication = await this.platform.STApi.getHepaFilterStatus(this.uuid);
          const filterLifeLevel = await this.platform.STApi.getHepaFilterUsage(this.uuid);
          switch (filterChangeIndication) {
            case 'normal': this.filterMaintenaceState.FilterChangeIndication = 0; break;
            case 'replace': this.filterMaintenaceState.FilterChangeIndication = 1; break;
          }
          this.filterMaintenaceState.FilterLifeLevel = filterLifeLevel;
        }
      } catch (err) {
        this.platform.log.error(this.name + ':',
          [this.platform.locale.getMsg('error', 3), err]);
      }
    }, 3000);
  }

  // 디바이스에서 지원 Capability 리스트를 가져오는 메소드입니다.
  async getCapabilitiesList() {
    const cpList = await this.platform.STApi.getCapabilitiesList(this.uuid);
    return cpList;
  }

  // 이하는 핸들러가 작성돼 있습니다.
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
  }

  async handleCurrentAirPurifierStateGet(callback) {
    try {
      const fanMode = await this.platform.STApi.getFanMode(this.uuid);
      let fanValue = 0;
      switch (fanMode) {
        case 'sleep': fanValue = 0; break;
        case 'windfree': fanValue = 1; break;
        case 'smart': case 'max': fanValue = 2; break;
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

  async handleRotationSpeedGet(callback) {
    try {
      const fanMode = await this.platform.STApi.getFanMode(this.uuid);
      let fanValue = 0;
      switch (fanMode) {
        case 'sleep': fanValue = 0; break;
        case 'windfree': fanValue = 25; break;
        case 'smart': fanValue = 75; break;
        case 'max': fanValue = 100; break;
      }
      this.platform.log.info(this.name + ':',
        [this.platform.locale.getMsg('airpurifier', 4),
          fanMode]);
      callback(null, fanValue);
    } catch (err) {
      this.platform.log.warn(this.name + ':',
        [this.platform.locale.getMsg('airpurifier', 4),
          this.platform.locale.getMsg('isCheck', 0), err]);
      callback(null, 0);
    }
  }

  handleRotationSpeedSet(rotateValue: CharacteristicValue, callback) {
    if (this.isPolling === false) {
      try {
        let fanMode = '';
        if (rotateValue <= 15) {
          fanMode = 'sleep';
        } else if (rotateValue > 15 && rotateValue <= 50) {
          fanMode = 'windfree';
        } else if (rotateValue > 50 && rotateValue <= 85) {
          fanMode = 'smart';
        } else {
          fanMode = 'max';
        }
        this.platform.log.info(this.name + ':',
          [this.platform.locale.getMsg('airpurifier', 5),
            fanMode]);
        this.platform.STApi.setFanMode(this.uuid, fanMode);
        callback(null, rotateValue);
      } catch (err) {
        this.platform.log.warn(this.name + ':',
          [this.platform.locale.getMsg('airpurifier', 5),
            this.platform.locale.getMsg('isCheck', 0), err]);
      }
    }
  }

  async handleTargetAirPurifierStateGet(callback) {
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

  handleTargetAirPurifierStateSet(APAutoStateValue: CharacteristicValue, callback) {
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

  /*
     *┌────────┬────────┬────────┬───────┬────────┬───────┬─────────────┬─────────┬───────┐
     *│미세먼지 │  최고  │  좋음  │  양호  │  보통  │  나쁨  │ 상당히 나쁨 │ 매우나쁨 │  최악  │
     *├────────┼────────┼────────┼───────┼────────┼───────┼─────────────┼─────────┼───────┤
     *│  PM10  │ 0~15   │ 16~30  │ 31~40 │ 41~50  │ 51~75 │ 76~100      │ 101~150 │ 151~  │
     *├────────┼────────┼────────┼───────┼────────┼───────┼─────────────┼─────────┼───────┤
     *│  PM2.5 │ 0~8    │ 9~15   │ 16~20 │ 21~25  │ 26~37 │ 38~50       │ 51~75   │ 76~   │
     *└────────┴────────┴────────┴───────┴────────┴───────┴─────────────┴─────────┴───────┘
     * 2021 WHO Air Quality Guidelines(AQG)
     * ┌───────────┬────────────────┬─────────┬────────┬─────────┬─────────┐
     * │   이름    │ 지수 또는 부지수 │   NO₂   │  PM₁₀  │   O₃    │  PM2.5  │
     * ├───────────┼────────────────┼─────────┼────────┼─────────┼─────────┤
     * │ 매우 낮음 │ 0~25            │ 0~50    │ 0~25   │ 0~60    │  0~15   │
     * ├───────────┼────────────────┼─────────┼────────┼─────────┼─────────┤
     * │   낮음    │ 25~50          │ 50~100  │ 25~50   │ 60~120 │ 15~30   │
     * ├───────────┼────────────────┼─────────┼────────┼─────────┼─────────┤
     * │   보통    │ 50~75          │ 100~200 │ 50~90  │ 120~180 │ 30~55   │
     * ├───────────┼────────────────┼─────────┼────────┼─────────┼─────────┤
     * │   높음    │ 75~100         │ 200~400 │ 90~180 │ 180~240  │ 55~110 │
     * ├───────────┼────────────────┼─────────┼────────┼─────────┼─────────┤
     * │ 매우 높음  │ >100           │ >400    │ >180   │ >240    │ >110    │
     * └───────────┴────────────────┴─────────┴────────┴─────────┴─────────┘
     * Common Air Quality Index(CAQI)
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
