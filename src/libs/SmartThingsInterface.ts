export interface STDevice {
    uuid: string;
    name: string | undefined;
    type: string;
    manufacturer: string;
    model: string;
    serialNumber: string;
    firmwareVersion: string;
}

export interface AirPurifier {
    Switch: number;
    AirPurifierState: number;
    FanMode: number;
    AutoMode: number;
    AirQuality: number;
    PM10: number;
    PM2_5: number;
}

export interface AirQualitySensor {
    AirQuality: number;
    PM10: number;
    PM2_5: number;
    PM1_0: number;
    odor: number;
}

export interface AirQuality {
    PM10: number;
    PM2_5: number;
    PM1_0: number;
    odor: number;
}

export interface FilterMaintenance {
    FilterChangeIndication: number;
    FilterLifeLevel: number;
}