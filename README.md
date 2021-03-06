<span align="center">

# Homebridge-SmartThings-niconyan
</span>

[한국어공지](https://github.com/niconyanGH/Homebridge-SmartThings-niconyan/tree/main/src-kr)는 src-kr 폴더를 클릭해 확인할 수 있습니다.

This is SmartThings plug-in for [Homebridge](https://github.com/homebridge/homebridge).

When you use SmartThings devices on iPhone, It will be useful.
You can set up automation by linking HomeKit devices and SmartThings devices, or control SmartThings devices as Siri, or add SmartThings icon on iPhone Control Center.

Experimental functionality is being developed in [beta branch](https://github.com/niconyanGH/Homebridge-SmartThings-niconyan/tree/beta).

If you have a trouble, please report it to the [issues](https://github.com/niconyanGH/Homebridge-SmartThings-niconyan/issues).

The ‘serial number’, ‘model’, and ‘firmware version’ information displayed on the Home app through this plug-in is inaccurate.

## Support scope
### Support log language
* Korean
* English

### Support SmartThings devices
* Air purifier
  - support model
    + AX47T9360WSD
    + AX60R5080WD
  - support capability
    + power On/Off
    + operation mode control: sleep/windfree/smart/max (beta)
    + auto mode contorl: auto/manual
    + verify air quality: 1 ~ 4 [(CAQI)](https://www.airqualitynow.eu/download/CITEAIR-Comparing_Urban_Air_Quality_across_Borders.pdf)
    + verify finedust PM10, PM2.5 (unit is wrong. mg/m³ is not, µg/m³ is right.)
    + verify indicator for hepa-filter (scheduled to support)
    + verify life to hepa-filter (scheduled to support)
    + reset life tor hepa-filter (scheduled to support)

## How to use plug-in

1. Install [Homebridge](https://github.com/homebridge/homebridge#installation) on your server.
2. Input ‘localhost:8551’ to server’s web browser address. or device
3. On the plug-in tab, search for ‘SmartThings’ to install this plug-in.
4. At the end of the installation, a setup window appears where you can set the SmartThingsAPI token value and log language that you receive only once.
5. After that, Homebridge will automatically search and register to SmartThings devices in your Samsung account.

## How to get a SmartThingsAPI token

1. Access the [SmartThings token page](https://account.smartthings.com/tokens) and sign in to your Samsung account.
![guide1](guide/1.png?raw=true)

2. Click the GENERATE NEW TOKEN.
![guide2](guide/2.png?raw=true)

3. Check the ‘Devices’ boxes. This plug-in requires no further authentication.
![guide3](guide/3.png?raw=true)

4. A SmartThingsAPI token has been issued that cannot be viewed again when it is out of the page. Even if you forget, you can get a new one.
![guide4](guide/4.png?raw=true)

## [Release note](https://github.com/niconyanGH/Homebridge-SmartThings-niconyan/tree/main/ReleaseNote/README.md)

<span align="center">

### ver0.0.3 (2022-07-14)
</span>

* Add function
  - alarm
    + SmartThings devices's network connect status(log) switch (This can use on plugin config)