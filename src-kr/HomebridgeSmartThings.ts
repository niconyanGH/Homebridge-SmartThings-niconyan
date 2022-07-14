import { API, DynamicPlatformPlugin, Logger, PlatformAccessory, PlatformConfig, Service, Characteristic } from 'homebridge';
import { PLATFORM_NAME, PLUGIN_NAME } from './settings';
import { SmartThingsAccessory } from './SmartThingsAccessory';
import { SmartThingsAPI } from './libs/SmartThingsApi';
import { Locale } from './locales/Locale';
import { STDevice } from './libs/SmartThingsInterface';

/*
 * 이 클래스는 이 플러그인의 주 생성자입니다.
 * 여기서 사용자config를 분석해서 홈브릿지 액세서리를 찾거나 등록합니다.
*/
export class HomebridgeSmartThings implements DynamicPlatformPlugin {

  public readonly Service: typeof Service = this.api.hap.Service;
  public readonly Characteristic: typeof Characteristic = this.api.hap.Characteristic;
  public STApi: SmartThingsAPI;
  public locale: Locale;

  // 복원 후 캐시된 액세서리를 추적하는 데 사용합니다.
  public readonly accessories: PlatformAccessory[] = [];

  // 지원목록에 있는 SmartThings 디바이스를 저장하는 데 사용됩니다.
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

    // 네트워크 알람 스위치를 체크합니다.
    if(this.network_status_alarm) {
      log.info(this.locale.getMsg('platform', 9), this.locale.getMsg('isOnOff', 1));
    } else {
      log.info(this.locale.getMsg('platform', 9), this.locale.getMsg('isOnOff', 0));
    }

    // config에 사용자가 토큰값을 입력하지 않았다면 플랫폼이 시작하지 않습니다.
    if (config === undefined || config === null || this.token === undefined || this.token === null) {
      log.warn(this.locale.getMsg('error', 1));
      return;
    }

    this.log.info(this.locale.getMsg('platform', 0));
    /*
     * 이 이벤트가 발생하면 Homebridge가 캐시된 모든 액세서리를 디스크에서 복원했음을 의미합니다.
     * DynamicPlatformPlugin은 새로운 액세서리가 Homebridge에 추가되지 않았는지 확인하기 위해
     * 이 이벤트가 발생한 후에만 등록해야 합니다.
     * 이 이벤트는 새 액세서리를 찾기 위해서 사용할 수도 있습니다.
    */
    this.api.on('didFinishLaunching', () => {
      log.info(this.locale.getMsg('platform', 1));
      log.info(this.locale.getMsg('platform', 2));
      // 사용자가 보유한 디바이스를 찾고 Homebridge의 액세서리로 등록하는 메소드를 실행합니다.
      this.discoverDevices();
    });
  }

  /*
   * 이 메소드는 부팅 시 Homebridge가 캐시된 액세서리를 디스크에서 복원할 때 실행됩니다.
   * 특성에 대한 이벤트 핸들러를 설정하고, 각 값을 업데이트하기 위해 사용합니다.
  */
  configureAccessory(accessory: PlatformAccessory) {
    this.log.info(this.locale.getMsg('platform', 3), accessory.displayName);

    // 등록여부를 추적할 수 있도록 복원된 액세서리를 캐시에 추가합니다.
    this.accessories.push(accessory);
  }

  /*
   * 지원하는 SmartThings 디바이스를 액세서리로 등록하는 메소드입니다.
   * 생성된 액세서리는 단 한번만 등록(regist)되어야 합니다.
   * UUID가 중복되는 오류를 방지하기 위해서 재등록을 하면 안 됩니다.
  */
  async discoverDevices() {
    /*
     * SmartThingsApi를 이용합니다. 프로세스는 다음과 같이 이뤄집니다.
     * 1. PlatformConfig에 저장된 개인토큰을 불러옵니다.
     * 2. 개인토큰을 이용해 SmartThings server에서 사용자의 기기목록을 불러옵니다.
     * 3. AvaliableDevices에 저장된 지원목록에 있는 기기만 저장합니다.
     * 4. Homebridge의 구동에 필요한 정보를 배열에 저장합니다.
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

    for (const device of this.devices) {
      /*
       * 액세서리의 고유 ID를 생성합니다.
       * 이는 세계적으로 유일하지만, 일정한 것으로부터 생성돼야 합니다.
       * 이 플러그인에서는 SmartThings 디바이스의 UUID(Universally Unique Identifier)입니다.
      */
      const uuid = this.api.hap.uuid.generate(device['uuid']);
      const existingAccessory = this.accessories.find(accessory => accessory.UUID === uuid);

      // 동일한 UUID를 가진 액세서리가 이미 등록 및 복원 됐는지 확인합니다.
      if (existingAccessory) {
        // 액세서리가 이미 존재합니다.
        this.log.info(this.locale.getMsg('platform', 6), existingAccessory.displayName);

        // accessory.context를 업데이트합니다.
        existingAccessory.context.device = device;
        this.api.updatePlatformAccessories([existingAccessory]);

        // 복원된 액세서리에 대한 핸들러를 생성합니다.
        new SmartThingsAccessory(this, existingAccessory);

        /* 
         * 플랫폼에 등록된 액세서리를 삭제할 때 사용하는 코드입니다.
         * this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [existingAccessory]);
         * this.log.info(this.locale.getMsg('platform', 7), existingAccessory.displayName);
        */
      } else {
        // 찾은 SmartThings기기 중 아직 등록되어 있지 않은 디바이스를 등록합니다.
        this.log.info(this.locale.getMsg('platform', 8), device['name']);
        const accessory = new this.api.platformAccessory(device['name'] ? device['name'] : 'no name', uuid);

        /*
         * accessory.context에 device를 저장합니다.
         * 액세서리에 필요한 어떤 데이터든 context에 저장할 수 있습니다.
        */ 
        accessory.context.device = device;

        // 새로 만든 액세서리의 핸들러를 만듭니다.
        new SmartThingsAccessory(this, accessory);

        // 액세서리를 플랫폼에 연결합니다.
        this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
      }
    }
  }
}