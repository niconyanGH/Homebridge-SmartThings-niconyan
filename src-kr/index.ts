import { API } from 'homebridge';

import { PLATFORM_NAME } from './settings';
import { HomebridgeSmartThings } from './HomebridgeSmartThings';

// 이 메소드는 Homebridge에 플랫폼을 등록합니다.
export = (api: API) => {
  api.registerPlatform(PLATFORM_NAME, HomebridgeSmartThings);
};
